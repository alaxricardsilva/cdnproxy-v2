"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { IconShieldLock, IconUser, IconDeviceMobile } from "@tabler/icons-react"
import { createClient } from "@/lib/supabase"
import { API_BASE_URL } from "@/lib/api"

export default function ProfilePage() {
    const [user, setUser] = useState<{ name: string; email: string; role: string; role_id: number } | null>(null)
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState("")
    const [updating, setUpdating] = useState(false)
    const [mfaEnabled, setMfaEnabled] = useState(false)

    // Password Change State
    const [showPasswordDialog, setShowPasswordDialog] = useState(false)
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const supabase = createClient()

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        setLoading(true)
        try {
            // Get token exactly like other working pages
            let token = document.cookie
                .split("; ")
                .find((row) => row.startsWith("access_token="))
                ?.split("=")[1]

            if (!token) {
                // Fallback to supabase session if cookie missing (optional, but let's stick to working pattern first)
                const { data: { session } } = await supabase.auth.getSession()
                if (!session) return
                token = session.access_token
            }

            // Fetch from Backend API
            const res = await fetch(`${API_BASE_URL}/api/admin/profile`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            if (res.ok) {
                const data = await res.json()
                const roleName = data.role === 1 ? "Super Admin" : "Admin"
                setUser({
                    name: data.name || "",
                    email: data.email,
                    role: roleName,
                    role_id: data.role
                })
                setName(data.name || "")
            }

            // Check MFA
            const { data: factors } = await supabase.auth.mfa.listFactors()
            const hasVerifiedFactor = factors?.all?.some(f => f.status === 'verified') || false
            setMfaEnabled(hasVerifiedFactor)

        } catch (error: any) {
            console.error("Error fetching profile:", error)
            setErrorMsg(error.message || "Erro desconhecido")
            toast.error("Erro ao carregar perfil")
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateProfile = async () => {
        setUpdating(true)
        try {
            const token = document.cookie
                .split("; ")
                .find((row) => row.startsWith("access_token="))
                ?.split("=")[1]

            if (!token) return

            const res = await fetch(`${API_BASE_URL}/api/admin/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name })
            })

            if (!res.ok) throw new Error("Falha ao atualizar")

            toast.success("Perfil atualizado com sucesso!")
            fetchProfile() // Refresh data
        } catch (error) {
            toast.error("Erro ao atualizar perfil")
        } finally {
            setUpdating(false)
        }
    }

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            toast.error("As senhas não coincidem")
            return
        }
        if (newPassword.length < 6) {
            toast.error("A senha deve ter pelo menos 6 caracteres")
            return
        }

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword })
            if (error) throw error

            toast.success("Senha alterada com sucesso!")
            setShowPasswordDialog(false)
            setNewPassword("")
            setConfirmPassword("")
        } catch (error: any) {
            toast.error("Erro ao alterar senha: " + error.message)
        }
    }

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">Perfil & Segurança</h2>
                <p className="text-muted-foreground">
                    Gerencie suas informações pessoais e configurações de segurança.
                </p>
            </div>
            <Separator />

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                <div className="flex-1 lg:max-w-2xl space-y-6">

                    {/* User Info Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <IconUser className="h-5 w-5 text-primary" />
                                <CardTitle>Informações Pessoais</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {user === null && !loading && (
                                <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
                                    <span className="font-medium">Erro ao carregar dados!</span> Verifique sua conexão ou tente recarregar.
                                    <br />
                                    <span className="text-xs opacity-75">
                                        Debug: {errorMsg || "Sem detalhes"}
                                    </span>
                                </div>
                            )}
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Seu nome"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" value={user?.email || "..."} disabled />
                            </div>
                            <div className="grid gap-2">
                                <Label>Função</Label>
                                <div className="flex">
                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${user?.role === 'Super Admin' ? 'bg-purple-50 text-purple-700 ring-purple-700/10' : 'bg-blue-50 text-blue-700 ring-blue-700/10'}`}>
                                        {user?.role || "..."}
                                    </span>
                                </div>
                            </div>
                            <Button onClick={handleUpdateProfile} disabled={updating}>
                                {updating ? "Salvando..." : "Salvar Alterações"}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Security Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <IconShieldLock className="h-5 w-5 text-primary" />
                                <CardTitle>Segurança</CardTitle>
                            </div>
                            <CardDescription>
                                Configurações de autenticação de dois fatores e senha.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* MFA Section */}
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <IconDeviceMobile className="h-4 w-4" />
                                        <Label className="text-base">MFA (Autenticação de 2 Fatores)</Label>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Adicione uma camada extra de segurança à sua conta.
                                    </p>
                                </div>
                                <Switch
                                    checked={mfaEnabled}
                                // onCheckedChange={handleMfaToggle} // Re-implement logic if needed or uncomment
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>Alterar Senha</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Password Change Dialog */}
            {showPasswordDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-background dark:bg-zinc-900 p-6 rounded-lg w-full max-w-md border shadow-lg space-y-4">
                        <h3 className="text-lg font-bold">Alterar Senha</h3>
                        <div className="space-y-2">
                            <Label>Nova Senha</Label>
                            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirmar Nova Senha</Label>
                            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="ghost" onClick={() => setShowPasswordDialog(false)}>Cancelar</Button>
                            <Button onClick={handleChangePassword}>Alterar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

