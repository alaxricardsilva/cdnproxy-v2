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
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api"

const formSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    price: z.coerce.number().min(0, "Preço deve ser positivo"),
    description: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export interface Plan {
    id?: number
    name: string
    price: number
    description?: string
}

interface PlanDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    planToEdit?: Plan | null
}

export function PlanDialog({ open, onOpenChange, onSuccess, planToEdit }: PlanDialogProps) {
    const [loading, setLoading] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            price: 0,
            description: "",
        },
    })

    useEffect(() => {
        if (planToEdit) {
            form.reset({
                name: planToEdit.name,
                price: planToEdit.price,
                description: planToEdit.description || "",
            })
        } else {
            form.reset({
                name: "",
                price: 0,
                description: "",
            })
        }
    }, [planToEdit, form])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("access_token="))
            ?.split("=")[1]

        try {
            const isEdit = !!planToEdit
            const url = isEdit
                ? `${API_BASE_URL}/api/superadmin/plans/${planToEdit.id}`
                : `${API_BASE_URL}/api/superadmin/plans`

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
                throw new Error("Falha ao salvar plano")
            }

            toast.success(isEdit ? "Plano atualizado!" : "Plano criado!")
            onSuccess()
            onOpenChange(false)
            if (!isEdit) form.reset()
        } catch (error) {
            toast.error("Erro ao salvar plano")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{planToEdit ? "Editar Plano" : "Novo Plano"}</DialogTitle>
                    <DialogDescription>
                        Defina os detalhes do plano de assinatura.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome do Plano</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Premium, VIP" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Preço (Mensal)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Detalhes do plano..." {...field} />
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
