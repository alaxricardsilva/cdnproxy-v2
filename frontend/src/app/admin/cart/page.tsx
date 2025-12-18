"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api"
import { IconTrash } from "@tabler/icons-react"

interface CartItem {
    id: number
    product_type: string
    product_identifier: string
    price: number
}

export default function CartPage() {
    const [items, setItems] = useState<CartItem[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)

    const fetchCart = async () => {
        setLoading(true)
        const token = document.cookie.split("; ").find((row) => row.startsWith("access_token="))?.split("=")[1]

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/cart`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                const data = await res.json()
                setItems(data || [])
            }
        } catch (error) {
            toast.error("Erro ao carregar carrinho")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCart()
    }, [])

    const handleRemove = async (id: number) => {
        const token = document.cookie.split("; ").find((row) => row.startsWith("access_token="))?.split("=")[1]
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/cart`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ id })
            })
            if (res.ok) {
                fetchCart()
                toast.success("Item removido")
            }
        } catch (error) {
            toast.error("Erro ao remover item")
        }
    }

    const handleCheckout = async () => {
        setProcessing(true)
        const token = document.cookie.split("; ").find((row) => row.startsWith("access_token="))?.split("=")[1]

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/checkout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({})
            })

            if (res.ok) {
                const data = await res.json()
                if (data.url) {
                    window.location.href = data.url
                } else {
                    toast.error("Erro ao gerar pagamento")
                }
            } else {
                const err = await res.json()
                toast.error(err.error || "Erro no checkout")
            }
        } catch (error) {
            toast.error("Erro de conexão")
        } finally {
            setProcessing(false)
        }
    }

    const total = items.reduce((acc, item) => acc + item.price, 0)

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">Meu Carrinho</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Itens</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produto</TableHead>
                                        <TableHead>Detalhe</TableHead>
                                        <TableHead className="text-right">Preço</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center">Carregando...</TableCell>
                                        </TableRow>
                                    ) : items.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center">Carrinho vazio.</TableCell>
                                        </TableRow>
                                    ) : (
                                        items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    {item.product_type === 'domain_renewal' ? 'Renovação de Domínio' : item.product_type}
                                                </TableCell>
                                                <TableCell>ID: {item.product_identifier}</TableCell>
                                                <TableCell className="text-right">R$ {item.price.toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemove(item.id)}>
                                                        <IconTrash className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Resumo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total</span>
                                <span>R$ {total.toFixed(2)}</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" size="lg" onClick={handleCheckout} disabled={items.length === 0 || processing}>
                                {processing ? "Processando..." : "Finalizar Compra"}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    )
}
