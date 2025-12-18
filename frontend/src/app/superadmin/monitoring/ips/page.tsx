"use client"

import { useEffect, useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { API_BASE_URL } from "@/lib/api"
import { toast } from "sonner"
import { IconRefresh } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

interface AccessLog {
    client_ip: string
    hits: number
    country_name: string
    city: string
    device_type: string
    last_seen: string
}

export default function MonitoringPage() {
    const [logs, setLogs] = useState<AccessLog[]>([])
    const [loading, setLoading] = useState(true)

    const fetchLogs = async () => {
        setLoading(true)
        const token = document.cookie.split("; ").find((row) => row.startsWith("access_token="))?.split("=")[1]

        try {
            const res = await fetch(`${API_BASE_URL}/api/superadmin/access-logs`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            setLogs(data || [])
            toast.success("Logs atualizados com sucesso")
        } catch (error) {
            toast.error("Erro ao carregar logs")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
        // Auto refresh every 10s
        const interval = setInterval(fetchLogs, 10000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Monitoramento ao Vivo</h2>
                <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
                    <IconRefresh className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>IPs Ativos (Cache / Live)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>IP</TableHead>
                                <TableHead>Hits</TableHead>
                                <TableHead>Localização</TableHead>
                                <TableHead>Dispositivo</TableHead>
                                <TableHead>Último Acesso</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">Carregando...</TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">Nenhum acesso registrado.</TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-mono">{log.client_ip}</TableCell>
                                        <TableCell>{log.hits}</TableCell>
                                        <TableCell>{log.city}, {log.country_name}</TableCell>
                                        <TableCell>{log.device_type}</TableCell>
                                        <TableCell>
                                            {new Date(log.last_seen).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
