"use client"

import * as React from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis, Cell } from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import { useAuth } from "@/hooks/use-auth"
import { API_BASE_URL } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardCharts() {
    const { user } = useAuth()
    const [data, setData] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        async function fetchTraffic() {
            if (!user) return

            // Determina endpoint (Superadmin vê geral, admin vê o seu)
            let endpoint = ""
            if (user?.role === 1) { // SuperAdmin
                endpoint = "/api/superadmin/traffic"
            } else { // Admin (Cliente)
                endpoint = "/api/admin/dashboard/traffic"
            }

            const token = document.cookie
                .split("; ")
                .find((row) => row.startsWith("access_token="))
                ?.split("=")[1]

            if (!token) return

            try {
                const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (res.ok) {
                    const json = await res.json()
                    // Processa: Converte bytes para MB e formata data
                    const processed = json.map((item: any) => ({
                        date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                        trafficMB: Number((item.trafego / 1024 / 1024).toFixed(2)) // Bytes -> MB
                    }))
                    // Ordena por data (opcional, se banco não garantir)
                    setData(processed)
                }
            } catch (err) {
                console.error("Erro loading charts", err)
            } finally {
                setLoading(false)
            }
        }
        fetchTraffic()
    }, [user])

    const chartConfig = {
        traffic: {
            label: "Tráfego (MB)",
            color: "hsl(var(--chart-1))",
        },
    } satisfies ChartConfig

    if (loading) {
        return <Skeleton className="h-[300px] w-full rounded-xl" />
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Tráfego Diário (Últimos 30 dias)</CardTitle>
                    <CardDescription>
                        Consumo de banda da plataforma
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <AreaChart
                            accessibilityLayer
                            data={data}
                            margin={{
                                left: 12,
                                right: 12,
                            }}
                        >
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value} MB`}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="dot" />}
                            />
                            <Area
                                dataKey="trafficMB"
                                type="natural"
                                fill="var(--color-traffic)"
                                fillOpacity={0.4}
                                stroke="var(--color-traffic)"
                                stackId="a"
                            />
                        </AreaChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Dispositivos (Top 5)</CardTitle>
                    <CardDescription>Origem dos acessos</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[300px]">
                    <DevicePieChart />
                </CardContent>
            </Card>
        </div>
    )
}



function DevicePieChart() {
    const [stats, setStats] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        async function fetchDevices() {
            const token = document.cookie.split("; ").find((row) => row.startsWith("access_token="))?.split("=")[1]
            if (!token) return

            try {
                const res = await fetch(`${API_BASE_URL}/api/superadmin/analytics/devices`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (res.ok) {
                    const json = await res.json()
                    setStats(json || [])
                }
            } catch (err) {
                console.error("Error fetching device stats", err)
            } finally {
                setLoading(false)
            }
        }
        fetchDevices()
    }, [])

    if (loading) return <div className="text-sm">Carregando dispositivos...</div>
    if (stats.length === 0) return <div className="text-sm text-muted-foreground">Sem dados de dispositivos</div>

    return (
        <ChartContainer config={{}} className="h-[250px] w-full">
            <BarChart
                accessibilityLayer
                data={stats}
                layout="vertical"
                margin={{
                    left: 20,
                    right: 20,
                }}
            >
                <CartesianGrid horizontal={false} />
                <YAxis
                    dataKey="device"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={80}
                    className="text-xs"
                />
                <XAxis type="number" hide />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" />}
                />
                <Bar dataKey="count" layout="vertical" radius={4}>
                    {stats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28BF3'][index % 5]} />
                    ))}
                    <LabelList
                        dataKey="count"
                        position="right"
                        offset={8}
                        className="fill-foreground"
                        fontSize={12}
                    />
                </Bar>
            </BarChart>
        </ChartContainer>
    )
}
