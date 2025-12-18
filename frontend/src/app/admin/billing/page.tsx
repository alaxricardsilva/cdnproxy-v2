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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

interface Transaction {
    id: number
    amount: number
    status: string
    created_at: string
}

export default function AdminBillingPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)

    const fetchTransactions = async () => {
        setLoading(true)
        const token = document.cookie.split("; ").find((row) => row.startsWith("access_token="))?.split("=")[1]
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/transactions`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setTransactions(data || [])
            } else {
                toast.error("Erro ao carregar faturas")
            }
        } catch (error) {
            toast.error("Erro de conexão")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTransactions()
    }, [])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
            case "paid":
                return <Badge className="bg-green-500 hover:bg-green-600">Pago</Badge>
            case "pending":
                return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>
            case "cancelled":
            case "rejected":
                return <Badge className="bg-red-500 hover:bg-red-600">Cancelado</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">Faturas e Pagamentos</h2>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Transações</CardTitle>
                    <CardDescription>Visualize todas as suas faturas e pagamentos realizados.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">Carregando...</TableCell>
                                </TableRow>
                            ) : transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">Nenhuma fatura encontrada.</TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell>#{t.id}</TableCell>
                                        <TableCell>{formatDate(t.created_at)}</TableCell>
                                        <TableCell>{formatCurrency(t.amount)}</TableCell>
                                        <TableCell>{getStatusBadge(t.status)}</TableCell>
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
