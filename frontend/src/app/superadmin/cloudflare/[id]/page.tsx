"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { IconArrowLeft, IconCloud, IconDotsVertical, IconEdit, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { DnsDialog, DNSRecord } from "@/components/superadmin/cloudflare/dns-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Zone {
    id: string
    name: string
    status: string
    name_servers: string[]
}

export default function ZoneDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const zoneId = params.id as string

    const [zone, setZone] = useState<Zone | null>(null)
    const [records, setRecords] = useState<DNSRecord[]>([])
    const [loadingZone, setLoadingZone] = useState(true)
    const [loadingRecords, setLoadingRecords] = useState(true)

    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingRecord, setEditingRecord] = useState<DNSRecord | null>(null)

    const getToken = () => document.cookie.split("; ").find((row) => row.startsWith("access_token="))?.split("=")[1]

    const fetchZone = async () => {
        setLoadingZone(true)
        const token = getToken()
        if (!token) return

        try {
            const res = await fetch(`${API_BASE_URL}/api/superadmin/cloudflare/zones/${zoneId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setZone(data)
            }
        } catch (error) {
            console.error(error)
            toast.error("Erro ao carregar detalhes da zona")
        } finally {
            setLoadingZone(false)
        }
    }

    const fetchRecords = async () => {
        setLoadingRecords(true)
        const token = getToken()
        if (!token) return

        try {
            const res = await fetch(`${API_BASE_URL}/api/superadmin/cloudflare/zones/${zoneId}/dns_records`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setRecords(data || [])
            }
        } catch (error) {
            console.error(error)
            toast.error("Erro ao carregar registros DNS")
        } finally {
            setLoadingRecords(false)
        }
    }

    useEffect(() => {
        fetchZone()
        fetchRecords()
    }, [])

    const handleDelete = async (recordId: string) => {
        if (!confirm("Tem certeza que deseja excluir este registro DNS?")) return

        const token = getToken()
        try {
            const res = await fetch(`${API_BASE_URL}/api/superadmin/cloudflare/zones/${zoneId}/dns_records/${recordId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                toast.success("Registro excluído")
                fetchRecords()
            } else {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.error || "Erro ao excluir")
            }
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const openAddDialog = () => {
        setEditingRecord(null)
        setDialogOpen(true)
    }

    const openEditDialog = (record: DNSRecord) => {
        setEditingRecord(record)
        setDialogOpen(true)
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6" suppressHydrationWarning>
            <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <IconArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-3xl font-bold tracking-tight">{zone?.name || "Carregando..."}</h2>
                {zone && <Badge variant={zone.status === 'active' ? 'default' : 'secondary'}>{zone.status}</Badge>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="md:col-span-3">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Gerenciamento DNS</CardTitle>
                            <CardDescription>Configure os apontamentos do domínio.</CardDescription>
                        </div>
                        <div className="flex space-x-2">
                            <Button variant="outline" size="icon" onClick={fetchRecords} disabled={loadingRecords}>
                                <IconRefresh className={`h-4 w-4 ${loadingRecords ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button onClick={openAddDialog}>
                                <IconPlus className="mr-2 h-4 w-4" /> Adicionar Registro
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Tipo</TableHead>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Conteúdo</TableHead>
                                    <TableHead className="w-[100px]">Proxy</TableHead>
                                    <TableHead className="w-[100px]">TTL</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingRecords ? (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24">Carregando DNS...</TableCell></TableRow>
                                ) : records.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24">Nenhum registro encontrado.</TableCell></TableRow>
                                ) : (
                                    records.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell className="font-bold">{record.type}</TableCell>
                                            <TableCell>{record.name}</TableCell>
                                            <TableCell className="max-w-[300px] truncate" title={record.content}>{record.content}</TableCell>
                                            <TableCell>
                                                {record.proxied ? (
                                                    <IconCloud className="h-5 w-5 text-orange-500" title="Proxied (CDN)" />
                                                ) : (
                                                    <IconCloud className="h-5 w-5 text-gray-400" title="DNS Only" />
                                                )}
                                            </TableCell>
                                            <TableCell>{record.ttl === 1 ? 'Auto' : record.ttl}</TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <IconDotsVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openEditDialog(record)}>
                                                            <IconEdit className="mr-2 h-4 w-4" /> Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(record.id!)}>
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
            </div>

            <DnsDialog
                zoneId={zoneId}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSuccess={fetchRecords}
                recordToEdit={editingRecord}
            />
        </div>
    )
}
