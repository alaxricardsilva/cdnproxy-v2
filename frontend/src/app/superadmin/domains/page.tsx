"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, Link2, MoreHorizontal, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { API_BASE_URL } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import Link from "next/link"
import { RenewDomainDialog } from "@/components/superadmin/renew-domain-dialog"
import { DomainDialog } from "@/components/superadmin/domain-dialog"
import { Calendar, CheckCircle, XCircle, Pencil } from "lucide-react"

export type Domain = {
    id: number
    name: string
    dominio: string
    user_id: number
    expired_at: string
    target_url: string
    plan_id: number
    active: boolean
    user_email?: string
    user_name?: string
}

export default function DomainsPage() {
    const [data, setData] = React.useState<Domain[]>([])
    const [loading, setLoading] = React.useState(true)
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    // Dialog States
    const [isRenewDialogOpen, setIsRenewDialogOpen] = React.useState(false)
    const [domainToRenew, setDomainToRenew] = React.useState<Domain | null>(null)

    const [isDomainDialogOpen, setIsDomainDialogOpen] = React.useState(false)
    const [domainToEdit, setDomainToEdit] = React.useState<Domain | null>(null)

    const fetchDomains = React.useCallback(async () => {
        setLoading(true)
        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("access_token="))
            ?.split("=")[1]

        if (!token) return

        try {
            const res = await fetch(`${API_BASE_URL}/api/superadmin/domains`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const json = await res.json()
                setData(json || [])
            } else {
                toast.error("Falha ao carregar domínios.")
            }
        } catch (e) {
            console.error(e)
            toast.error("Erro ao carregar domínios")
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchDomains()
    }, [fetchDomains])

    const handleDelete = async (domain: Domain) => {
        if (!confirm(`Tem certeza que deseja deletar o domínio ${domain.dominio}?`)) return
        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("access_token="))
            ?.split("=")[1]

        try {
            const res = await fetch(`${API_BASE_URL}/api/superadmin/domains/${domain.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                toast.success("Domínio removido")
                fetchDomains()
            } else {
                toast.error("Erro ao remover domínio")
            }
        } catch (e) {
            toast.error("Erro de conexão")
        }
    }

    const handleToggleStatus = async (domain: Domain) => {
        const action = domain.active ? "deactivate" : "activate"
        const confirmMsg = domain.active ? "Desativar domínio?" : "Ativar domínio?"
        if (!confirm(confirmMsg)) return

        const token = document.cookie.split("; ").find(row => row.startsWith("access_token="))?.split("=")[1]
        if (!token) return

        try {
            const res = await fetch(`${API_BASE_URL}/api/superadmin/domains/${domain.id}/${action}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            })

            if (res.ok) {
                toast.success(`Domínio ${domain.active ? "desativado" : "ativado"} com sucesso`)
                fetchDomains()
            } else {
                toast.error("Falha ao alterar status")
            }
        } catch (err) {
            toast.error("Erro de conexão")
        }
    }

    const handleRenew = (domain: Domain) => {
        setDomainToRenew(domain)
        setIsRenewDialogOpen(true)
    }

    const handleCreate = () => {
        setDomainToEdit(null)
        setIsDomainDialogOpen(true)
    }

    const handleEdit = (domain: Domain) => {
        // Verificar se expirado? Backend bloqueia update se expirado.
        // Mas como editar só muda configurações e não renova, talvez devêssemos avisar o usuario.
        const expiredAt = new Date(domain.expired_at)
        if (expiredAt < new Date()) {
            toast.warning("Este domínio está expirado. Renove-o antes de editar.")
            // Opcional: impedir abertura ou deixar backend rejeitar. 
            // Vamos deixar abrir e o backend rejeita se tentar salvar? 
            // Melhor UX: avisar e permitir visualizar, mas o save vai falhar.
        }

        setDomainToEdit(domain)
        setIsDomainDialogOpen(true)
    }

    const columns: ColumnDef<Domain>[] = React.useMemo(() => [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "name",
            header: "Nome",
            cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
        },
        {
            accessorKey: "dominio",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Domínio
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <a href={`http://${row.getValue("dominio")}`} target="_blank" rel="noreferrer" className="hover:underline">
                        {row.getValue("dominio")}
                    </a>
                </div>
            ),
        },
        {
            accessorKey: "user_email",
            header: "Proprietário",
            cell: ({ row }) => {
                const email = row.original.user_email || "N/A"
                const name = row.original.user_name
                return (
                    <div className="flex flex-col">
                        <span className="font-medium">{name || email}</span>
                        {name && <span className="text-xs text-muted-foreground">{email}</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: "active",
            header: "Status",
            cell: ({ row }) => {
                const active = row.original.active
                const expiredAt = new Date(row.original.expired_at)
                const isExpired = expiredAt < new Date()

                if (isExpired) {
                    return <Badge variant="destructive">Expirado</Badge>
                }

                return (
                    <Badge variant={active ? "outline" : "destructive"} className={active ? "text-green-600 border-green-600" : ""}>
                        {active ? "Ativo" : "Inativo"}
                    </Badge>
                )
            }
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const domain = row.original

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(domain)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(domain.dominio)}
                            >
                                Copiar Domínio
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleRenew(domain)}>
                                <Calendar className="mr-2 h-4 w-4" /> Renovar (Manual)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(domain)}>
                                {domain.active ? (
                                    <>
                                        <XCircle className="mr-2 h-4 w-4 text-red-500" /> Desativar
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Ativar
                                    </>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(domain)}>
                                Deletar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ], [])

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    return (
        <div className="w-full">
            <RenewDomainDialog
                open={isRenewDialogOpen}
                onOpenChange={setIsRenewDialogOpen}
                domain={domainToRenew}
                onSuccess={fetchDomains}
            />
            <DomainDialog
                open={isDomainDialogOpen}
                onOpenChange={setIsDomainDialogOpen}
                domainToEdit={domainToEdit}
                onSuccess={fetchDomains}
            />
            <div className="flex items-center py-4 justify-between" suppressHydrationWarning>
                <Input
                    placeholder="Filtrar por domínio..."
                    value={(table.getColumn("dominio")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("dominio")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Domínio
                </Button>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    {loading ? "Carregando..." : "Nenhum domínio encontrado."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} de{" "}
                    {table.getFilteredRowModel().rows.length} linha(s) selecionada(s).
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Anterior
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Próximo
                    </Button>
                </div>
            </div>
        </div>
    )
}
