"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { API_BASE_URL } from "@/lib/api"

export interface User {
    id: number
    email: string
    name: string
    role: number // 1 = Superadmin, 2 = Admin
    avatar?: string
}

export function useAuth() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadUser() {
            // Pega token do cookie
            const token = document.cookie
                .split("; ")
                .find((row) => row.startsWith("access_token="))
                ?.split("=")[1]

            const hashParams = new URLSearchParams(window.location.hash.substring(1))
            const hashToken = hashParams.get("access_token")

            const accessToken = token || hashToken

            if (!accessToken) {
                setLoading(false)
                return
            }

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                })

                if (res.ok) {
                    const userData = await res.json()
                    // Mapeia resposta do backend para interface User
                    // O backend retorna algo como { id: 1, email: "...", role_id: 1, ... }
                    // Ajuste conforme a resposta real do seu backend
                    setUser({
                        id: userData.id,
                        email: userData.email,
                        name: userData.name || userData.email.split("@")[0], // Fallback name
                        role: userData.role,
                        avatar: userData.avatar,
                    })
                } else {
                    // Token inválido? Limpa cookie
                    document.cookie = "access_token=; path=/; max-age=0"
                }
            } catch (error) {
                console.error("Failed to load user", error)
            } finally {
                setLoading(false)
            }
        }

        loadUser()
    }, [])

    const logout = () => {
        document.cookie = "access_token=; path=/; max-age=0"
        setUser(null)
        router.push("/login")
    }

    return { user, loading, logout }
}
