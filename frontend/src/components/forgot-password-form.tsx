"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { API_BASE_URL } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Field,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export function ForgotPasswordForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const [email, setEmail] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const [success, setSuccess] = React.useState(false)
    const [error, setError] = React.useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        setSuccess(false)

        try {
            const res = await fetch(`${API_BASE_URL} /auth/recover`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            })

            if (!res.ok) {
                let msg = "Falha ao enviar e-mail"
                try {
                    const json = await res.json()
                    msg = json.message || msg
                } catch { }
                if (res.status === 404) msg = "E-mail não encontrado."
                throw new Error(msg)
            }

            setSuccess(true)
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro ao tentar enviar o e-mail.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Recuperar Senha</CardTitle>
                    <CardDescription>
                        Digite seu e-mail para receber as instruções de redefinição.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <div className="text-center space-y-4">
                            <div className="text-green-500 font-medium">
                                E-mail enviado com sucesso!
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Verifique sua caixa de entrada e spam.
                            </p>
                            <Button asChild className="w-full" variant="outline">
                                <Link href="/login">Voltar para Login</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="email">E-mail</FieldLabel>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="admin@cdnproxy.top"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </Field>

                                {error && (
                                    <Field className="text-red-500 text-sm text-center font-medium">
                                        {error}
                                    </Field>
                                )}

                                <Field>
                                    <Button type="submit" disabled={loading} className="w-full">
                                        {loading ? "Enviando..." : "Enviar Link de Recuperação"}
                                    </Button>
                                </Field>

                                <div className="text-center text-sm">
                                    <Link href="/login" className="underline underline-offset-4 hover:text-primary">
                                        Voltar para Login
                                    </Link>
                                </div>
                            </FieldGroup>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
