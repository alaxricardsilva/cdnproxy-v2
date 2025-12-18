"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IconDotsVertical, IconEdit, IconPlus, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"
import { Plan, PlanDialog } from "@/components/superadmin/plans/plan-dialog"
import { API_BASE_URL } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PlansPage() {
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null)

    const fetchPlans = async () => {
        setLoading(true)
        const token = document.cookie.split("; ").find((row) => row.startsWith("access_token="))?.split("=")[1]

        try {
            const res = await fetch(`${API_BASE_URL}/api/superadmin/plans`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                const data = await res.json()
                setPlans(data || [])
            }
        } catch (error) {
            toast.error("Erro ao carregar planos")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPlans()
    }, [])

    const handleDelete = async (id: number) => {
        if (!confirm("Tem certeza que deseja excluir este plano?")) return

        const token = document.cookie.split("; ").find((row) => row.startsWith("access_token="))?.split("=")[1]
        try {
            const res = await fetch(`${API_BASE_URL}/api/superadmin/plans/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                toast.success("Plano excluído")
                fetchPlans()
            } else {
                toast.error("Erro ao excluir plano")
            }
        } catch (error) {
            toast.error("Erro ao excluir plano")
        }
    }

    const openAdd = () => {
        setEditingPlan(null)
        setDialogOpen(true)
    }

    const openEdit = (plan: Plan) => {
        setEditingPlan(plan)
        setDialogOpen(true)
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Planos & Assinaturas</h2>
                <div className="flex items-center space-x-2">
                    <Button onClick={openAdd}>
                        <IconPlus className="mr-2 h-4 w-4" /> Novo Plano
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Gerenciar Produtos</CardTitle>
                    <CardDescription>Crie planos para vender aos seus usuários.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Preço</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">Carregando...</TableCell>
                                </TableRow>
                            ) : plans.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">Nenhum plano cadastrado.</TableCell>
                                </TableRow>
                            ) : (
                                plans.map((plan) => (
                                    <TableRow key={plan.id}>
                                        <TableCell className="font-medium">{plan.name}</TableCell>
                                        <TableCell>R$ {plan.price.toFixed(2)}</TableCell>
                                        <TableCell className="text-muted-foreground">{plan.description}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <IconDotsVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEdit(plan)}>
                                                        <IconEdit className="mr-2 h-4 w-4" /> Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(plan.id!)}>
                                                        <IconTrash className="mr-2 h-4 w-4" /> Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <PlanDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSuccess={fetchPlans}
                planToEdit={editingPlan}
            />
        </div>
    )
}
