"use client"

import { DashboardStats } from "@/components/dashboard-stats"
import { DashboardCharts } from "@/components/dashboard-charts"
import { useAuth } from "@/hooks/use-auth" // Opcional se quisermos mostrar o nome

export default function Page() {
  const { user } = useAuth()

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {user?.name || "Bem-vindo"}
        </h1>
      </div>

      {/* Cards Section */}
      <DashboardStats />

      {/* Charts Section */}
      <DashboardCharts />
    </div>
  )
}
