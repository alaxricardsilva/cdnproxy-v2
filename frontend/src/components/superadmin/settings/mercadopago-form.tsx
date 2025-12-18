"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useEffect, useState } from "react"
import { API_BASE_URL } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const mpSchema = z.object({
    MERCADOPAGO_ACCESS_TOKEN: z.string().min(1, "Access Token é obrigatório"),
    MERCADOPAGO_PUBLIC_KEY: z.string().optional(),
    MERCADOPAGO_CLIENT_ID: z.string().optional(),
    MERCADOPAGO_CLIENT_SECRET: z.string().optional(),
    MERCADOPAGO_WEBHOOK_URL: z.string().url("URL inválida").optional().or(z.literal("")),
})

const FIXED_WEBHOOK_URL = "https://api.cdnproxy.top/webhook/mercadopago"

export function MercadoPagoForm() {
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof mpSchema>>({
        resolver: zodResolver(mpSchema),
        defaultValues: {
            MERCADOPAGO_ACCESS_TOKEN: "",
            MERCADOPAGO_PUBLIC_KEY: "",
            MERCADOPAGO_CLIENT_ID: "",
            MERCADOPAGO_CLIENT_SECRET: "",
            MERCADOPAGO_WEBHOOK_URL: FIXED_WEBHOOK_URL,
        },
    })

    useEffect(() => {
        async function loadConfig() {
            const token = document.cookie
                .split("; ")
                .find((row) => row.startsWith("access_token="))
                ?.split("=")[1]

            if (!token) return

            try {
                const res = await fetch(`${API_BASE_URL}/api/superadmin/mercadopago`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    form.reset({
                        ...data,
                        MERCADOPAGO_WEBHOOK_URL: FIXED_WEBHOOK_URL
                    })
                }
            } catch (error) {
                console.error("Failed to load Mercadopago config", error)
            }
        }
        loadConfig()
    }, [form])

    async function onSubmit(values: z.infer<typeof mpSchema>) {
        setLoading(true)
        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("access_token="))
            ?.split("=")[1]

        try {
            const res = await fetch(`${API_BASE_URL}/api/superadmin/mercadopago`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(values),
            })

            if (!res.ok) throw new Error("Falha ao salvar")

            toast.success("Configurações do Mercado Pago salvas!")
        } catch (error) {
            toast.error("Erro ao salvar configurações")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Mercado Pago</CardTitle>
                <CardDescription>
                    Configure as credenciais para processamento de pagamentos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="MERCADOPAGO_ACCESS_TOKEN"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Access Token (Produção)</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="APP_USR-..." {...field} />
                                    </FormControl>
                                    <FormDescription>Token principal para processar pagamentos.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="MERCADOPAGO_PUBLIC_KEY"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Public Key</FormLabel>
                                        <FormControl>
                                            <Input placeholder="APP_USR-..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="MERCADOPAGO_CLIENT_ID"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Client ID</FormLabel>
                                        <FormControl>
                                            <Input placeholder="..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="MERCADOPAGO_CLIENT_SECRET"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Client Secret</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="MERCADOPAGO_WEBHOOK_URL"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>URL de Webhook (Automático)</FormLabel>
                                    <FormControl>
                                        <div className="flex gap-2">
                                            <Input {...field} value={FIXED_WEBHOOK_URL} readOnly className="bg-muted text-muted-foreground" />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(FIXED_WEBHOOK_URL)
                                                    toast.success("URL copiada!")
                                                }}
                                            >
                                                Copiar
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormDescription>
                                        Copie esta URL e configure no painel do Mercado Pago para receber notificações.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" disabled={loading}>
                            {loading ? "Salvando..." : "Salvar Configurações"}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
