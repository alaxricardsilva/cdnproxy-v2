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
import { ArrowUpDown, MoreHorizontal, Plus } from "lucide-react"

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
import { UserDialog } from "@/components/superadmin/user-dialog"
import { toast } from "sonner"

export type User = {
    id: number
    email: string
    name?: string
    role: number
    active: boolean
    created_at: string
}

export default function UsersPage() {
    const [data, setData] = React.useState<User[]>([])
    const [loading, setLoading] = React.useState(true)
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [editingUser, setEditingUser] = React.useState<User | null>(null)

    const fetchUsers = React.useCallback(async () => {
        setLoading(true)
        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("access_token="))
            ?.split("=")[1]

        if (!token) return

        try {
            const res = await fetch(`${API_BASE_URL}/api/superadmin/users`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const json = await res.json()
                setData(json || [])
            } else {
                console.error("Failed to fetch users:", res.status, res.statusText)
                toast.error("Falha ao carregar usuários.")
            }
        } catch (e) {
            console.error("Failed to fetch users", e)
            toast.error("Erro ao carregar usuários")
        } finally {
            setLoading(false)
        }
    }, [])

    // Inicial Fetch
    React.useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    const handleCreate = () => {
        setEditingUser(null)
        setIsDialogOpen(true)
    }

    const handleEdit = (user: User) => {
        setEditingUser(user)
        setIsDialogOpen(true)
    }

    const handleToggleStatus = async (user: User) => {
        const action = user.active ? "deactivate" : "activate"
        const confirmMsg = user.active ? "Desativar usuário?" : "Ativar usuário?"
        if (!confirm(confirmMsg)) return

        const token = document.cookie.split("; ").find(row => row.startsWith("access_token="))?.split("=")[1]
        if (!token) return

        try {
            const res = await fetch(`${API_BASE_URL}/api/superadmin/users/${user.id}/${action}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            })

            if (res.ok) {
                toast.success(`Usuário ${user.active ? "desativado" : "ativado"} com sucesso`)
                fetchUsers()
            } else {
                toast.error("Falha ao alterar status")
            }
        } catch (err) {
            toast.error("Erro de conexão")
        }
    }

    const columns: ColumnDef<User>[] = React.useMemo(() => [
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
            cell: ({ row }) => <div className="font-medium">{row.getValue("name") || "-"}</div>,
        },
        {
            accessorKey: "email",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Email
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
        },
        {
            accessorKey: "role",
            header: "Role",
            cell: ({ row }) => {
                const role = row.getValue("role") as number
                return (
                    <Badge variant={role === 1 ? "default" : "secondary"}>
                        {role === 1 ? "Superadmin" : "Admin"}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "active",
            header: "Status",
            cell: ({ row }) => {
                const active = row.original.active
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
                const user = row.original

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
                            <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(user.email)}
                            >
                                Copiar Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(user)}>Editar Usuário</DropdownMenuItem>
                            <DropdownMenuItem className={user.active ? "text-red-600" : "text-green-600"} onClick={() => handleToggleStatus(user)}>
                                {user.active ? "Desativar" : "Ativar"}
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
            <UserDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                userToEdit={editingUser}
                onSuccess={fetchUsers}
            />
            <div className="flex items-center py-4 justify-between">
                <Input
                    placeholder="Filtrar por email..."
                    value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("email")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Usuário
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
                                    {loading ? "Carregando..." : "Nenhum usuário encontrado."}
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
