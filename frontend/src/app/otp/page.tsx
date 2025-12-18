"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase"

export default function OTPPage() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Check if we have an AAL1 session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
      }
      // If already AAL2, redirect to dashboard
      // But getting AAL level from session object is tricky in some versions, 
      // usually we just try to challenge.
    }
    checkSession()
  }, [])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Get available factors
      const { data: { factors }, error: factorsError } = await supabase.auth.mfa.listFactors()
      if (factorsError) throw factorsError

      const totpFactor = factors.find(f => f.factor_type === 'totp' && f.status === 'verified')
      if (!totpFactor) {
        throw new Error("Nenhum fator MFA encontrado para este usuário.")
      }

      // 2. Challenge and Verify
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: totpFactor.id,
        code: code
      })

      if (error) throw error

      toast.success("Autenticado com sucesso!")
      // Refresh session to Ensure AAL2 cookie is set
      await supabase.auth.refreshSession()

      // Update document cookie for backend/middleware compatibility if needed
      // (Supabase methods usually update the storage/cookie if configured correctly in createBrowserClient)
      // But our middleware reads 'access_token'.
      // We might need to manually set it if the SSR helper doesn't do it for standard 'access_token' name.
      if (data.session) {
        document.cookie = `access_token=${data.session.access_token}; path=/; max-age=604800; samesite=lax`
      }

      router.push("/dashboard")

    } catch (err: any) {
      toast.error(err.message || "Código inválido.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Autenticação de Dois Fatores</CardTitle>
            <CardDescription>
              Digite o código de 6 dígitos do seu aplicativo autenticador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verificando..." : "Verificar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
