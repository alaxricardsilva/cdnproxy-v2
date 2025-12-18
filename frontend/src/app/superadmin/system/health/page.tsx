"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { API_BASE_URL } from "@/lib/api"
import { IconDatabase, IconServer, IconTrash, IconRefresh } from "@tabler/icons-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface TableStatus {
    name: string
    rows: number
    size: string
}

interface DBStatus {
    database_size: string
    active_connections: number
    tables: TableStatus[]
}

const PROTECTED_TABLES = ["users", "payments", "plans", "domains", "schema_migrations", "role_permissions", "roles"]

export default function SystemHealthPage() {
    const [dbStatus, setDbStatus] = useState<DBStatus | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchHealth = async () => {
        setLoading(true)
        try {
            const token = document.cookie.split("; ").find((row) => row.startsWith("access_token="))?.split("=")[1]

            const res = await fetch(`${API_BASE_URL}/api/superadmin/database/status`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (res.ok) {
                setDbStatus(await res.json())
            }
        } catch (error) {
            console.error("Health check failed", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchHealth()
        const interval = setInterval(fetchHealth, 30000) // Atualiza a cada 30 segundos
        return () => clearInterval(interval)
    }, [])

    const handleCleanTable = async (tableName: string) => {
        try {
            const token = document.cookie.split("; ").find((row) => row.startsWith("access_token="))?.split("=")[1]
            const res = await fetch(`${API_BASE_URL}/api/superadmin/database/clean`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ tables: [tableName] })
            })

            if (res.ok) {
                toast.success(`Tabela ${tableName} otimizada com sucesso`)
                fetchHealth()
            } else {
                toast.error("Erro ao limpar tabela")
            }
        } catch (error) {
            toast.error("Erro ao processar solicitação")
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">Status do Sistema</h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Banco de Dados</CardTitle>
                        <IconDatabase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "..." : "Online"}</div>
                        <p className="text-xs text-muted-foreground">PostgreSQL Active</p>
                    </CardContent>
                </Card>

                {dbStatus && (
                    <>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Tamanho Total</CardTitle>
                                <IconDatabase className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{dbStatus.database_size}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Conexões Ativas</CardTitle>
                                <IconServer className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{dbStatus.active_connections}</div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Tabelas do Sistema</CardTitle>
                    <CardDescription>Gerenciamento de armazenamento e limpeza de logs</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tabela</TableHead>
                                <TableHead>Linhas</TableHead>
                                <TableHead>Tamanho</TableHead>
                                <TableHead className="text-right">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dbStatus?.tables.map((table) => {
                                const isProtected = PROTECTED_TABLES.includes(table.name);
                                return (
                                    <TableRow key={table.name}>
                                        <TableCell className="font-medium">{table.name}</TableCell>
                                        <TableCell>{table.rows.toLocaleString()}</TableCell>
                                        <TableCell>{table.size}</TableCell>
                                        <TableCell className="text-right">
                                            {isProtected ? (
                                                <Badge variant="secondary">Protegido</Badge>
                                            ) : (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-100">
                                                            <IconTrash className="h-4 w-4 mr-2" />
                                                            Limpar
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Isso irá apagar todos os dados da tabela <b>{table.name}</b>. Essa ação não pode ser desfeita.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleCleanTable(table.name)} className="bg-red-600 hover:bg-red-700">
                                                                Confirmar Limpeza
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
