"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { API_BASE_URL } from "@/lib/api"
import { toast } from "sonner"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from "recharts"

interface TrafficData {
    time: string
    hits: number
}

interface AnalyticsSummary {
    total_users: number
    total_payments: number
    total_revenue: number
}

// Mock data if backend is empty for visualization
const mockData = [
    { time: "00:00", hits: 0 },
]

export default function AnalyticsPage() {
    const [data, setData] = useState<TrafficData[]>([])
    const [summary, setSummary] = useState<AnalyticsSummary>({ total_users: 0, total_revenue: 0, total_payments: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = document.cookie.split("; ").find((row) => row.startsWith("access_token="))?.split("=")[1]
                const headers = { Authorization: `Bearer ${token}` }

                // Fetch Business Analytics
                const analyticsRes = await fetch(`${API_BASE_URL}/api/superadmin/analytics`, { headers })
                if (analyticsRes.ok) {
                    setSummary(await analyticsRes.json())
                }

                // Fetch Traffic Chart (Streaming Hits)
                const chartRes = await fetch(`${API_BASE_URL}/api/superadmin/analytics/streaming-hits`, { headers })
                if (chartRes.ok) {
                    const chartData = await chartRes.json()
                    // If empty, maybe show mock? Or just empty.
                    if (chartData && chartData.length > 0) {
                        setData(chartData)
                    } else {
                        // setData(mockData) // Optional: Use mock if real data is empty for demo
                    }
                }
            } catch (error) {
                toast.error("Erro ao carregar dados de analytics")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">Streaming Overview</h2>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usuários Totais</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.total_users || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pagamentos Confirmados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.total_payments || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Tráfego de Streaming (Hits / Hora)</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.length > 0 ? data : mockData}>
                                <defs>
                                    <linearGradient id="colorHits" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                                <Area type="monotone" dataKey="hits" stroke="#8884d8" fillOpacity={1} fill="url(#colorHits)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
