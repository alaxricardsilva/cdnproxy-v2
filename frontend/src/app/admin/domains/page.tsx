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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { IconShoppingCart, IconEdit, IconTrash, IconRefresh } from "@tabler/icons-react"

interface Domain {
    id: number
    name: string
    dominio: string
    expired_at: string
    target_url: string
    active: boolean
}

export default function AdminDomainsPage() {
    const [domains, setDomains] = useState<Domain[]>([])
    const [loading, setLoading] = useState(true)

    // Edit Modal State
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [editingDomain, setEditingDomain] = useState<Domain | null>(null)
    const [newTargetUrl, setNewTargetUrl] = useState("")

    // Delete Modal State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [deletingDomain, setDeletingDomain] = useState<Domain | null>(null)

    const getAuthToken = () => document.cookie.split("; ").find((row) => row.startsWith("access_token="))?.split("=")[1]

    const fetchDomains = async () => {
        setLoading(true)
        const token = getAuthToken()

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/domains`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                const data = await res.json()
                setDomains(data || [])
            } else {
                toast.error("Erro ao carregar domínios")
            }
        } catch (error) {
            toast.error("Erro de conexão")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDomains()
    }, [])

    const handleRenew = async (domain: Domain) => {
        const token = getAuthToken()
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/cart`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    product_type: "domain_renewal",
                    product_identifier: domain.id.toString(),
                    price: 29.90
                })
            })

            if (res.ok) {
                toast.success("Adicionado ao carrinho!")
                // Opcional: Redirecionar para o carrinho ou abrir um modal
            } else {
                toast.error("Erro ao adicionar ao carrinho")
            }
        } catch (error) {
            toast.error("Erro de conexão")
        }
    }

    const openEditModal = (domain: Domain) => {
        setEditingDomain(domain)
        setNewTargetUrl(domain.target_url)
        setIsEditOpen(true)
    }

    const handleSaveEdit = async () => {
        if (!editingDomain) return

        const token = getAuthToken()
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/domains/${editingDomain.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ target_url: newTargetUrl })
            })

            if (res.ok) {
                toast.success("Domínio atualizado!")
                fetchDomains() // Refresh list
                setIsEditOpen(false)
            } else {
                const err = await res.text()
                toast.error(`Erro ao atualizar: ${err}`)
            }
        } catch (error) {
            toast.error("Erro de conexão")
        }
    }

    const openDeleteModal = (domain: Domain) => {
        setDeletingDomain(domain)
        setIsDeleteOpen(true)
    }

    const confirmDelete = async () => {
        if (!deletingDomain) return
        const token = getAuthToken()

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/domains/${deletingDomain.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            })

            if (res.ok) {
                toast.success("Domínio excluído!")
                fetchDomains()
            } else {
                toast.error("Erro ao excluir domínio")
            }
        } catch (error) {
            toast.error("Erro de conexão")
        } finally {
            setIsDeleteOpen(false)
            setDeletingDomain(null)
        }
    }

    const isExpired = (dateString: string) => {
        return new Date(dateString) < new Date()
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value)
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Meus Domínios</h2>
                <Button onClick={() => window.location.href = "/admin/cart"}>
                    <IconShoppingCart className="mr-2 h-4 w-4" /> Ver Carrinho
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Gerenciar Assinaturas</CardTitle>
                    <CardDescription>Renove seus domínios para manter o serviço ativo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Domínio</TableHead>
                                <TableHead>URL de Destino</TableHead>
                                <TableHead>Expira em</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">Carregando...</TableCell>
                                </TableRow>
                            ) : domains.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">Nenhum domínio encontrado.</TableCell>
                                </TableRow>
                            ) : (
                                domains.map((domain) => {
                                    const expired = isExpired(domain.expired_at)
                                    return (
                                        <TableRow key={domain.id}>
                                            <TableCell className="font-medium">{domain.name}</TableCell>
                                            <TableCell className="text-muted-foreground truncate max-w-[200px]">{domain.target_url}</TableCell>
                                            <TableCell>
                                                {new Date(domain.expired_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                {domain.active && !expired ? (
                                                    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Ativo</span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">Inativo/Expirado</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" onClick={() => openEditModal(domain)} disabled={expired}>
                                                    <IconEdit className="mr-2 h-4 w-4" />
                                                    Editar
                                                </Button>
                                                <Button size="sm" variant="default" onClick={() => handleRenew(domain)}>
                                                    <IconRefresh className="mr-2 h-4 w-4" />
                                                    Renovar
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => openDeleteModal(domain)}>
                                                    <IconTrash className="mr-2 h-4 w-4" />
                                                    Excluir
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Domínio</DialogTitle>
                        <DialogDescription>
                            Altere a URL de destino para {editingDomain?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="target_url" className="text-right">
                                URL de Destino
                            </Label>
                            <Input
                                id="target_url"
                                value={newTargetUrl}
                                onChange={(e) => setNewTargetUrl(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveEdit}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o domínio
                            <span className="font-bold"> {deletingDomain?.name} </span> e removerá seus dados de nossos servidores.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            Excluir Domínio
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
