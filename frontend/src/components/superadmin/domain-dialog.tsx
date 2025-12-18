"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { API_BASE_URL } from "@/lib/api"
import { Domain } from "@/app/superadmin/domains/page"

const formSchema = z.object({
    name: z.string().min(1, "O nome do site é obrigatório"),
    dominio: z.string().min(1, "O domínio é obrigatório"),
    target_url: z.string().url("URL de destino inválida"),
    user_id: z.string().min(1, "Selecione um usuário"),
    plan_id: z.string().min(1, "Selecione um plano"),
    expired_at: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, "Data inválida (DD/MM/YYYY)"),
})

interface DomainDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    domainToEdit: Domain | null
    onSuccess: () => void
}

export function DomainDialog({
    open,
    onOpenChange,
    domainToEdit,
    onSuccess,
}: DomainDialogProps) {
    const [loading, setLoading] = useState(false)
    const [users, setUsers] = useState<{ id: number; email: string; name?: string }[]>([])
    const [plans, setPlans] = useState<{ id: number; name: string }[]>([])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            dominio: "",
            target_url: "",
            user_id: "",
            plan_id: "",
            expired_at: "",
        },
    })

    // Função auxiliar para formatar Date -> DD/MM/YYYY
    const formatDateToBR = (dateString: string) => {
        if (!dateString) return ""
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return ""
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
    }

    // Função auxiliar para parse DD/MM/YYYY -> Date ISO
    const parseDateFromBR = (dateString: string): Date | null => {
        const parts = dateString.split('/')
        if (parts.length !== 3) return null
        const day = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        const year = parseInt(parts[2], 10)

        // Validação básica
        if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900) return null

        const date = new Date(year, month, day)
        // Verificar validade (ex: 31/02)
        if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) return null

        return date
    }

    // Máscara DD/MM/YYYY
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
        let value = e.target.value.replace(/\D/g, "") // Remove não dígitos
        if (value.length > 8) value = value.slice(0, 8) // Limita

        if (value.length >= 5) {
            value = value.replace(/(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3")
        } else if (value.length >= 3) {
            value = value.replace(/(\d{2})(\d{1,2})/, "$1/$2")
        }

        field.onChange(value)
    }

    // Carregar usuários e planos quando o dialog abrir
    useEffect(() => {
        if (open) {
            const fetchData = async () => {
                const token = document.cookie
                    .split("; ")
                    .find((row) => row.startsWith("access_token="))
                    ?.split("=")[1]

                if (!token) return

                try {
                    const usersRes = await fetch(`${API_BASE_URL}/api/superadmin/users`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                    if (usersRes.ok) setUsers(await usersRes.json())

                    const plansRes = await fetch(`${API_BASE_URL}/api/superadmin/plans`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                    if (plansRes.ok) setPlans(await plansRes.json())

                } catch (error) {
                    console.error("Error fetching data", error)
                    toast.error("Erro ao carregar dados")
                }
            }
            fetchData()
        }
    }, [open])

    // Preencher formulário ao editar ou resetar ao criar
    useEffect(() => {
        if (domainToEdit) {
            form.reset({
                name: domainToEdit.name,
                dominio: domainToEdit.dominio,
                target_url: domainToEdit.target_url,
                user_id: domainToEdit.user_id.toString(),
                plan_id: domainToEdit.plan_id.toString(),
                expired_at: formatDateToBR(domainToEdit.expired_at),
            })
        } else {
            // Default: Data atual + 1 ano
            const nextYear = new Date()
            nextYear.setFullYear(nextYear.getFullYear() + 1)
            form.reset({
                name: "",
                dominio: "",
                target_url: "",
                user_id: "",
                plan_id: "",
                expired_at: formatDateToBR(nextYear.toISOString()),
            })
        }
    }, [domainToEdit, form])

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true)
        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("access_token="))
            ?.split("=")[1]

        if (!token) {
            toast.error("Não autenticado")
            setLoading(false)
            return
        }

        try {
            const url = domainToEdit
                ? `${API_BASE_URL}/api/superadmin/domains/${domainToEdit.id}`
                : `${API_BASE_URL}/api/superadmin/domains`

            const method = domainToEdit ? "PUT" : "POST"

            // Converter Data BR -> ISO
            const expiryDate = parseDateFromBR(values.expired_at)
            if (!expiryDate) {
                throw new Error("Data de vencimento inválida (Use DD/MM/YYYY)")
            }

            // Set to end of day to be generous? standard is just the date.
            // ISO string will be YYYY-MM-DDT00:00:00.000Z local time converted to UTC which is fine.

            const payload = {
                ...values,
                user_id: parseInt(values.user_id),
                plan_id: parseInt(values.plan_id),
                expired_at: expiryDate.toISOString(),
            }

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const err = await res.text()
                throw new Error(err || "Falha ao salvar domínio")
            }

            toast.success(domainToEdit ? "Domínio atualizado!" : "Domínio criado!")
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            console.error(error)
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{domainToEdit ? "Editar Domínio" : "Novo Domínio"}</DialogTitle>
                    <DialogDescription>
                        {domainToEdit ? "Faça alterações no domínio existente." : "Preencha os dados do novo domínio."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome do Site</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Meu Site" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="dominio"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Domínio/Hostname</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: exemplo.com.br" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="target_url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>URL de Destino</FormLabel>
                                    <FormControl>
                                        <Input placeholder="http://origem.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="user_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Usuário</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {users.map((user) => (
                                                    <SelectItem key={user.id} value={user.id.toString()}>
                                                        {user.name || user.email}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="plan_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Plano</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {plans.map((plan) => (
                                                    <SelectItem key={plan.id} value={plan.id.toString()}>
                                                        {plan.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="expired_at"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data de Vencimento</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="DD/MM/YYYY"
                                            maxLength={10}
                                            {...field}
                                            onChange={(e) => handleDateChange(e, field)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Salvando..." : "Salvar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
