"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { API_BASE_URL } from "@/lib/api"
import { cn } from "@/lib/utils"
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

export function UpdatePasswordForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const router = useRouter()
    const [password, setPassword] = React.useState("")
    const [confirmPassword, setConfirmPassword] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const [success, setSuccess] = React.useState(false)
    const [error, setError] = React.useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        if (password !== confirmPassword) {
            setError("As senhas não coincidem.")
            return
        }

        if (password.length < 6) {
            setError("A senha deve ter no mínimo 6 caracteres.")
            return
        }

        try {
            // Pega o token do cookie para autenticar a requisição
            const token = document.cookie
                .split("; ")
                .find((row) => row.startsWith("access_token="))
                ?.split("=")[1]

            // Se o usuário veio pelo link mágico, o Supabase já setou o cookie/sessão no navegador (ou URL fragment)
            // O desafio aqui é: O Supabase Client (se estivesse instalado) pegaria a sessão da URL hash.
            // Como estamos "manuais", precisamos garantir que o token esteja acessível.
            // PROVISÓRIO: Assumimos que o link mágico já autenticou e temos um token válido salvo ou que a rota backend vai pegar do Header Authorization.
            // Se não tivermos o token aqui, o usuário precisará fazer login primeiro (o que quebraria o fluxo de "esqueci senha").
            // Melhor abordagem sem SDK: O link mágico redireciona para cá. O parametro ?access_token=... ou #access_token=... vem na URL.

            // Tentativa de extrair token da URL se não estiver no cookie
            let accessToken = token
            const hashParams = new URLSearchParams(window.location.hash.substring(1))
            if (!accessToken && hashParams.get("access_token")) {
                accessToken = hashParams.get("access_token") || ""
                // Salva o token para uso futuro
                document.cookie = `access_token=${accessToken}; path=/; max-age=3600; samesite=lax`
            }

            if (!accessToken) {
                throw new Error("Sessão expirada. Solicite a recuperação novamente.")
            }

            const res = await fetch(`${API_BASE_URL}/api/auth/update_password`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                },
                body: JSON.stringify({ password }),
            })

            if (!res.ok) {
                const text = await res.text()
                try {
                    const json = await res.json()
                    throw new Error(json.message || "Falha ao atualizar senha")
                } catch {
                    throw new Error("Erro ao atualizar senha: " + text)
                }
            }

            setSuccess(true)
            setTimeout(() => {
                router.push("/login")
            }, 3000)

        } catch (err: any) {
            setError(err.message || "Ocorreu um erro ao atualizar a senha.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Redefinir Senha</CardTitle>
                    <CardDescription>
                        Crie uma nova senha segura para sua conta.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <div className="text-center text-green-500 font-medium">
                            Senha atualizada com sucesso! Redirecionando...
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="password">Nova Senha</FieldLabel>
                                    <Input
                                        id="password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="confirmPassword">Confirmar Senha</FieldLabel>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </Field>

                                {error && (
                                    <Field className="text-red-500 text-sm text-center font-medium">
                                        {error}
                                    </Field>
                                )}

                                <Field>
                                    <Button type="submit" disabled={loading} className="w-full">
                                        {loading ? "Atualizando..." : "Definir Nova Senha"}
                                    </Button>
                                </Field>
                            </FieldGroup>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
