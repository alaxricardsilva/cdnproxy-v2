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

const generalSchema = z.object({
    app_name: z.string().min(1, "Nome do sistema é obrigatório"),
    app_logo: z.string().url("URL do logo inválida").or(z.literal("")),
    app_favicon: z.string().url("URL do ícone inválida").or(z.literal("")),
    support_email: z.string().email("Email de suporte inválido").or(z.literal("")),
})

export function GeneralForm() {
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof generalSchema>>({
        resolver: zodResolver(generalSchema),
        defaultValues: {
            app_name: "CDN Proxy",
            app_logo: "",
            app_favicon: "",
            support_email: "",
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
                const res = await fetch(`${API_BASE_URL}/api/superadmin/general_config`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    // Filtrar apenas o que nos interessa, pois o endpoint retorna TUDO
                    form.reset({
                        app_name: data.app_name || "CDN Proxy",
                        app_logo: data.app_logo || "",
                        app_favicon: data.app_favicon || "",
                        support_email: data.support_email || "",
                    })
                }
            } catch (error) {
                console.error("Failed to load General config", error)
            }
        }
        loadConfig()
    }, [form])

    async function onSubmit(values: z.infer<typeof generalSchema>) {
        setLoading(true)
        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("access_token="))
            ?.split("=")[1]

        try {
            const res = await fetch(`${API_BASE_URL}/api/superadmin/general_config`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(values),
            })

            if (!res.ok) throw new Error("Falha ao salvar")

            toast.success("Configurações gerais salvas!")
            // Opcional: Recarregar a página para aplicar novo título/logo se estivesse usando contexto
            // window.location.reload() 
        } catch (error) {
            toast.error("Erro ao salvar configurações")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Geral</CardTitle>
                <CardDescription>
                    Configurações de identidade visual e suporte.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="app_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome do Sistema</FormLabel>
                                    <FormControl>
                                        <Input placeholder="CDN Proxy" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Nome exibido na barra de título e emails.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="app_logo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL do Logo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://..." {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Imagem principal (PNG/SVG).
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="app_favicon"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL do Ícone (Favicon)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://..." {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Ícone da aba do navegador (.ico/PNG).
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="support_email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email de Suporte</FormLabel>
                                    <FormControl>
                                        <Input placeholder="suporte@exemplo.com" {...field} />
                                    </FormControl>
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
