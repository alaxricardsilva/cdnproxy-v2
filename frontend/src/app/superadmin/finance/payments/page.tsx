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
import { Badge } from "@/components/ui/badge"

interface Payment {
    id: number
    user_id: number
    amount: number
    status: string
    payment_method: string
    created_at: string
}

export default function PaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)

    const fetchPayments = async () => {
        setLoading(true)
        const token = document.cookie.split("; ").find((row) => row.startsWith("access_token="))?.split("=")[1]

        try {
            const res = await fetch(`${API_BASE_URL}/api/superadmin/payments`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                const data = await res.json()
                setPayments(data || [])
            } else {
                toast.error("Erro ao carregar pagamentos")
            }
        } catch (error) {
            toast.error("Erro ao carregar pagamentos")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPayments()
    }, [])

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">Pagamentos</h2>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Transações</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>User ID</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Método</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Data</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">Carregando...</TableCell>
                                </TableRow>
                            ) : payments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">Nenhum pagamento encontrado.</TableCell>
                                </TableRow>
                            ) : (
                                payments.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell>{p.id}</TableCell>
                                        <TableCell>{p.user_id}</TableCell>
                                        <TableCell>R$ {p.amount.toFixed(2)}</TableCell>
                                        <TableCell className="capitalize">{p.payment_method}</TableCell>
                                        <TableCell>
                                            <Badge variant={p.status === 'approved' ? 'default' : 'secondary'}>
                                                {p.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(p.created_at).toLocaleDateString()}
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
