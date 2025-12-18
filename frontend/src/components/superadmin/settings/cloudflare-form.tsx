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

const cloudflareSchema = z.object({
    api_key: z.string().min(1, "API Key é obrigatória"),
    email: z.string().email("Email inválido"),
})

export function CloudflareForm() {
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof cloudflareSchema>>({
        resolver: zodResolver(cloudflareSchema),
        defaultValues: {
            api_key: "",
            email: "",
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
                const res = await fetch(`${API_BASE_URL}/api/superadmin/cloudflare/config`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    form.reset(data)
                }
            } catch (error) {
                console.error("Failed to load Cloudflare config", error)
            }
        }
        loadConfig()
    }, [form])

    async function onSubmit(values: z.infer<typeof cloudflareSchema>) {
        setLoading(true)
        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("access_token="))
            ?.split("=")[1]

        try {
            const res = await fetch(`${API_BASE_URL}/api/superadmin/cloudflare/config`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(values),
            })

            if (!res.ok) throw new Error("Falha ao salvar")

            toast.success("Configurações da Cloudflare salvas!")
        } catch (error) {
            toast.error("Erro ao salvar configurações")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cloudflare API</CardTitle>
                <CardDescription>
                    Configure as credenciais da Cloudflare para gerenciamento de DNS e Proxy.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email da Conta Cloudflare</FormLabel>
                                    <FormControl>
                                        <Input placeholder="seu@email.com" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        O email associado à conta da Cloudflare.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="api_key"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Global API Key</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="...xyz" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        A chave de API Global encontrada no painel da Cloudflare.
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
