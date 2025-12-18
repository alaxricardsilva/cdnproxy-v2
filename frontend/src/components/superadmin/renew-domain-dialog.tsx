"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { API_BASE_URL } from "@/lib/api"
import { toast } from "sonner"
import { Domain } from "@/app/superadmin/domains/page"

const formSchema = z.object({
    new_expiry_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Data inválida",
    }),
})

interface RenewDomainDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    domain: Domain | null
    onSuccess: () => void
}

export function RenewDomainDialog({ open, onOpenChange, domain, onSuccess }: RenewDomainDialogProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            new_expiry_date: ""
        }
    })

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!domain) return

        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("access_token="))
            ?.split("=")[1]

        if (!token) return

        try {
            // Input type date returns YYYY-MM-DD string. Append time?
            // Backend setExpiryTime converts to end of day. So just date string is fine if parsed correctly ??
            // Actually backend expects JSON with `new_expiry_date` (time.Time).
            // We need to send ISO string.
            const date = new Date(values.new_expiry_date)

            const res = await fetch(`${API_BASE_URL}/api/superadmin/domains/${domain.id}/renew`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    new_expiry_date: date.toISOString()
                })
            })

            if (!res.ok) {
                throw new Error("Falha ao renovar domínio")
            }

            toast.success("Domínio renovado com sucesso!")
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error("Erro ao renovar domínio")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Renovar Domínio</DialogTitle>
                    <DialogDescription>
                        Defina uma nova data de expiração para o domínio <strong>{domain?.dominio}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="new_expiry_date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nova Data de Expiração</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">Renovar</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
