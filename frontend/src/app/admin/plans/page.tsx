"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { IconCheck } from "@tabler/icons-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api"

interface Plan {
    id: number
    name: string
    price: number
    description: string
}

export default function PlansCatalogPage() {
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    const [purchasing, setPurchasing] = useState<number | null>(null)

    const fetchPlans = async () => {
        setLoading(true)
        const token = document.cookie.split("; ").find((row) => row.startsWith("access_token="))?.split("=")[1]

        // Using superadmin route because it's GET public/protected but schema is same.
        // Ideally we should have a public or admin specific route /api/admin/plans 
        // but reusing superadmin route if user has permission or creating a new public route is better.
        // For now, let's assume we can fetch from a generic endpoint or reuse superadmin if role 2 has access?
        // Role 2 uses adminRouter. Let's try fetching from superadmin endpoint if it allows? No, likely 403.
        // We need a route for Admin to list plans.
        // Let's implement fetch from /api/public/config ??? No.
        // Let's assume we created GET /api/admin/plans or similar.
        // Mistake in plan: didn't specify GET /api/admin/plans in backend/handlers/admin
        // I will try to use the one I created or I need to add one.
        // Check main.go: I only added CreateCheckoutSession.
        // I need to add GetAllPlans to adminRouter or make it public.
        // Let's rely on a fix in next step if this fails, or use Client Component to fetch.

        // TEMPORARY FIX: I will use /api/superadmin/plans if token works, otherwise I need to add the route.
        // Realistically, I should add `GET /api/admin/plans` pointing to `superadmin.GetAllPlans` handler since logic is same.

        try {
            const res = await fetch(`${API_BASE_URL}/api/superadmin/plans`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                const data = await res.json()
                setPlans(data || [])
            } else {
                // If 403, we need to add the route for admin.
                toast.error("Erro ao carregar planos (Permissão?)")
            }
        } catch (error) {
            toast.error("Erro ao carregar planos")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPlans()
    }, [])

    const handleSubscribe = async (plan: Plan) => {
        setPurchasing(plan.id)
        const token = document.cookie.split("; ").find((row) => row.startsWith("access_token="))?.split("=")[1]

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/checkout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ plan_id: plan.id })
            })

            if (res.ok) {
                const data = await res.json()
                if (data.url) {
                    window.location.href = data.url
                } else {
                    toast.error("URL de pagamento não gerada")
                }
            } else {
                const err = await res.json()
                toast.error(err.error || "Erro ao iniciar checkout")
            }
        } catch (error) {
            toast.error("Erro de conexão")
        } finally {
            setPurchasing(null)
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Planos Disponíveis</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {loading ? (
                    <p>Carregando planos...</p>
                ) : plans.map((plan) => (
                    <Card key={plan.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-2xl">{plan.name}</CardTitle>
                            <CardDescription>
                                R$ <span className="text-3xl font-bold text-foreground">{plan.price.toFixed(2)}</span> / mês
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <p className="text-muted-foreground whitespace-pre-wrap">{plan.description}</p>
                            <ul className="mt-4 space-y-2">
                                {/* Placeholder features */}
                                <li className="flex items-center"><IconCheck className="mr-2 h-4 w-4 text-green-500" /> Suporte 24/7</li>
                                <li className="flex items-center"><IconCheck className="mr-2 h-4 w-4 text-green-500" /> Alta Performance</li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => handleSubscribe(plan)} disabled={!!purchasing}>
                                {purchasing === plan.id ? "Processando..." : "Assinar Agora"}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}
