"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import { IconDotsVertical, IconPlus, IconRefresh, IconSearch } from "@tabler/icons-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api"
import { AddZoneDialog } from "@/components/superadmin/cloudflare/add-zone-dialog"
import { Badge } from "@/components/ui/badge"

interface Zone {
    id: string
    name: string
    status: string
    plan: {
        name: string
    }
    name_servers: string[]
}

export default function CloudflarePage() {
    const [zones, setZones] = useState<Zone[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

    const fetchZones = async () => {
        setLoading(true)
        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("access_token="))
            ?.split("=")[1]

        if (!token) return

        try {
            const res = await fetch(`${API_BASE_URL}/api/superadmin/cloudflare/zones`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) {
                const err = await res.text()
                throw new Error(err || "Falha ao buscar zonas")
            }
            const data = await res.json()
            setZones(data || [])
        } catch (error) {
            console.error(error)
            toast.error("Erro ao carregar zonas da Cloudflare")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchZones()
    }, [])

    const filteredZones = zones.filter(zone =>
        zone.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="flex-1 space-y-4 p-8 pt-6" suppressHydrationWarning>
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Cloudflare Zonas</h2>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" onClick={fetchZones} disabled={loading}>
                        <IconRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                        <IconPlus className="mr-2 h-4 w-4" /> Adicionar Site
                    </Button>
                </div>
            </div>

            <div className="flex items-center py-4">
                <div className="relative w-full max-w-sm">
                    <IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar domínio..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Domínio</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Nameservers</TableHead>
                            <TableHead className="w-[70px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Carregando...
                                </TableCell>
                            </TableRow>
                        ) : filteredZones.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Nenhuma zona encontrada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredZones.map((zone) => (
                                <TableRow key={zone.id}>
                                    <TableCell className="font-medium">{zone.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={zone.status === 'active' ? 'default' : 'secondary'}>
                                            {zone.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{zone.plan.name}</TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {zone.name_servers.join(", ")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => window.location.href = `/superadmin/cloudflare/${zone.id}`}>
                                                Gerenciar
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <IconDotsVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(zone.id)}>
                                                        Copiar ID
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => window.location.href = `/superadmin/cloudflare/${zone.id}`}>
                                                        DNS & Config
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AddZoneDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onSuccess={fetchZones}
            />
        </div>
    )
}
