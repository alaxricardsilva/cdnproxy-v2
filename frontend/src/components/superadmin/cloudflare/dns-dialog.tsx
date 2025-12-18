"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api"

const formSchema = z.object({
    type: z.enum(["A", "AAAA", "CNAME", "TXT", "MX", "NS"]),
    name: z.string().min(1, "Nome é obrigatório"),
    content: z.string().min(1, "Conteúdo é obrigatório"),
    ttl: z.coerce.number().min(1), // 1 = Auto
    proxied: z.boolean().default(false),
})

type FormValues = z.infer<typeof formSchema>

export interface DNSRecord {
    id?: string
    type: string
    name: string
    content: string
    ttl: number
    proxied: boolean
}

interface DnsDialogProps {
    zoneId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    recordToEdit?: DNSRecord | null
}

export function DnsDialog({ zoneId, open, onOpenChange, onSuccess, recordToEdit }: DnsDialogProps) {
    const [loading, setLoading] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: "A",
            name: "",
            content: "",
            ttl: 1, // Auto
            proxied: false,
        },
    })

    // Reset form when recordToEdit changes
    useEffect(() => {
        if (recordToEdit) {
            form.reset({
                type: recordToEdit.type as any,
                name: recordToEdit.name,
                content: recordToEdit.content,
                ttl: recordToEdit.ttl,
                proxied: recordToEdit.proxied
            })
        } else {
            form.reset({
                type: "A",
                name: "",
                content: "",
                ttl: 1,
                proxied: false,
            })
        }
    }, [recordToEdit, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("access_token="))
            ?.split("=")[1]

        try {
            const isEdit = !!recordToEdit
            const url = isEdit
                ? `${API_BASE_URL}/api/superadmin/cloudflare/zones/${zoneId}/dns_records/${recordToEdit.id}`
                : `${API_BASE_URL}/api/superadmin/cloudflare/zones/${zoneId}/dns_records`

            const method = isEdit ? "PUT" : "POST"

            const res = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(values),
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.error || "Falha ao salvar registro")
            }

            toast.success(isEdit ? "Registro atualizado!" : "Registro criado!")
            onSuccess()
            onOpenChange(false)
            if (!isEdit) form.reset()
        } catch (error: any) {
            toast.error(error.message || "Erro ao salvar")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{recordToEdit ? "Editar Registro DNS" : "Adicionar Registro DNS"}</DialogTitle>
                    <DialogDescription>
                        Gerencie os apontamentos do seu domínio.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem className="col-span-1">
                                        <FormLabel>Tipo</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tipo" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="A">A</SelectItem>
                                                <SelectItem value="AAAA">AAAA</SelectItem>
                                                <SelectItem value="CNAME">CNAME</SelectItem>
                                                <SelectItem value="TXT">TXT</SelectItem>
                                                <SelectItem value="MX">MX</SelectItem>
                                                <SelectItem value="NS">NS</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="col-span-3">
                                        <FormLabel>Nome</FormLabel>
                                        <FormControl>
                                            <Input placeholder="ex: @, www, api" {...field} />
                                        </FormControl>
                                        <FormDescription>Use @ para raiz.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Conteúdo (IPv4, Host, Text)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="192.168.1.1 ou dominio.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex items-center justify-between space-x-4">
                            <FormField
                                control={form.control}
                                name="ttl"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>TTL</FormLabel>
                                        <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value.toString()}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="TTL" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="1">Automático</SelectItem>
                                                <SelectItem value="60">1 Minuto</SelectItem>
                                                <SelectItem value="300">5 Minutos</SelectItem>
                                                <SelectItem value="3600">1 Hora</SelectItem>
                                                <SelectItem value="86400">1 Dia</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="proxied"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1">
                                        <div className="space-y-0.5">
                                            <FormLabel>Proxy (CDN)</FormLabel>
                                            <FormDescription>
                                                Nuvem Laranja
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value as boolean}
                                                onCheckedChange={field.onChange}
                                                disabled={form.watch("type") === "MX" || form.watch("type") === "TXT" || form.watch("type") === "NS"}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Salvando..." : "Salvar Registro"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
