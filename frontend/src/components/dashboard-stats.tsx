"use client"

import * as React from "react"
import {
    IconUsers,
    IconWorld,
    IconActivity,
    IconServer,
    IconCreditCard,
} from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { API_BASE_URL } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardStats() {
    const { user, loading: authLoading } = useAuth()
    const [stats, setStats] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        if (authLoading || !user) return

        async function fetchData() {
            const token = document.cookie
                .split("; ")
                .find((row) => row.startsWith("access_token="))
                ?.split("=")[1]

            if (!token) return

            // 1 = SuperAdmin
            let endpoint = user?.role === 1 ? "/api/superadmin/dashboard/data" : "/api/admin/dashboard/data"

            try {
                const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })
                if (res.ok) {
                    const json = await res.json()
                    setStats(json)
                }
            } catch (error) {
                console.error("Erro ao buscar dashboard data", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [user, authLoading])

    if (loading || authLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-[120px] rounded-xl" />
                ))}
            </div>
        )
    }

    const isSuperAdmin = user?.role === 1

    // Format currency helper
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value || 0)
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Users (Super) or Domains (Admin) */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {isSuperAdmin ? "Usuários Totais" : "Meus Domínios"}
                    </CardTitle>
                    {isSuperAdmin ? <IconUsers className="h-4 w-4 text-muted-foreground" /> : <IconWorld className="h-4 w-4 text-muted-foreground" />}
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {isSuperAdmin ? stats?.total_users || 0 : stats?.total_domains || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {isSuperAdmin ? "Cadastrados na plataforma" : "Domínios gerenciados"}
                    </p>
                </CardContent>
            </Card>

            {/* Card 2: Active Users (Super) or Active Domains/Expiring? (Admin) */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {isSuperAdmin ? "Usuários Ativos" : "Domínios Expirando"}
                    </CardTitle>
                    <IconActivity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {isSuperAdmin ? stats?.total_users || 0 : stats?.expiring_domains || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {isSuperAdmin ? "Base ativa" : "Nos próximos 30 dias"}
                    </p>
                </CardContent>
            </Card>

            {/* Card 3: Revenue (Super) or Spent (Admin) */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {isSuperAdmin ? "Receita (Est.)" : "Total Gasto"}
                    </CardTitle>
                    <IconCreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {formatCurrency(isSuperAdmin ? stats?.total_revenue : stats?.total_spent)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {isSuperAdmin ? "Estimativa mensal" : "Investimento total na plataforma"}
                    </p>
                </CardContent>
            </Card>

            {/* Card 4: Traffic (Super) or Transactions (Admin) */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {isSuperAdmin ? "Requisições" : "Transações"}
                    </CardTitle>
                    <IconServer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {isSuperAdmin ? (stats?.monthly_requests || 0).toLocaleString('pt-BR') : (stats?.total_transactions || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {isSuperAdmin ? "Hits no Proxy" : "Pagamentos realizados"}
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
