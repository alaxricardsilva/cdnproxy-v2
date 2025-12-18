"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CloudflareForm } from "@/components/superadmin/settings/cloudflare-form"
import { MercadoPagoForm } from "@/components/superadmin/settings/mercadopago-form"
import { GeneralForm } from "@/components/superadmin/settings/general-form"

export default function SettingsPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
            </div>
            <Tabs defaultValue="general" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="general">Geral</TabsTrigger>
                    <TabsTrigger value="cloudflare">Cloudflare</TabsTrigger>
                    <TabsTrigger value="mercadopago">Mercado Pago</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="space-y-4">
                    <GeneralForm />
                </TabsContent>
                <TabsContent value="cloudflare" className="space-y-4">
                    <CloudflareForm />
                </TabsContent>
                <TabsContent value="mercadopago" className="space-y-4">
                    <MercadoPagoForm />
                </TabsContent>
            </Tabs>
        </div>
    )
}
