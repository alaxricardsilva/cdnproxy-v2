"use client"

import * as React from "react"
import {
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconSettings,
  IconUsers,
  IconCreditCard,
  IconServer,
  IconWorld,
  IconLogout,
  IconActivity,
  IconCloud,
  IconShoppingCart,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/use-auth"
import { Skeleton } from "@/components/ui/skeleton"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, loading, logout } = useAuth()

  // Definição dos menus baseados na Role
  const superAdminNav = [
    {
      title: "Visão Geral",
      url: "/dashboard",
      icon: IconDashboard,
      isActive: true,
    },
    {
      title: "Analytics",
      url: "/superadmin/analytics",
      icon: IconChartBar,
    },
    {
      title: "Cache (Live)",
      url: "/superadmin/monitoring/ips",
      icon: IconActivity,
    },
    {
      title: "Domínios",
      url: "/superadmin/domains",
      icon: IconWorld,
    },
    {
      title: "Usuários",
      url: "/superadmin/users",
      icon: IconUsers,
    },
    {
      title: "Cloudflare",
      url: "/superadmin/cloudflare",
      icon: IconCloud,
    },
    {
      title: "Financeiro",
      url: "#",
      icon: IconCreditCard,
      items: [
        {
          title: "Pagamentos",
          url: "/superadmin/finance/payments",
        },
        {
          title: "Planos",
          url: "/superadmin/plans",
        },
      ],
    },
    {
      title: "Sistema",
      url: "#",
      icon: IconServer,
      items: [
        {
          title: "Status & Saúde",
          url: "/superadmin/system/health",
        },
        {
          title: "Configurações",
          url: "/superadmin/settings",
        },
      ],
    },
    {
      title: "Meu Perfil",
      url: "/admin/profile",
      icon: IconSettings, // Ou IconUser se preferir
    },
    {
      title: "Sair",
      url: "#",
      icon: IconLogout,
      onClick: logout,
    }
  ]

  const adminNav = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
      isActive: true,
    },
    {
      title: "Meus Domínios",
      url: "/admin/domains",
      icon: IconWorld,
    },
    {
      title: "Faturas",
      url: "/admin/billing",
      icon: IconCreditCard,
    },
    {
      title: "Carrinho",
      url: "/admin/cart",
      icon: IconShoppingCart,
    },

    {
      title: "Meu Perfil",
      url: "/admin/profile",
      icon: IconSettings,
    },
    {
      title: "Sair",
      url: "#",
      icon: IconLogout,
      onClick: logout,
    }
  ]

  // Decide qual menu mostrar
  const navItems = user?.role === 1 ? superAdminNav : adminNav

  if (loading) {
    return (
      <Sidebar collapsible="icon" {...props}>
        <SidebarContent>
          <div className="p-4 space-y-4">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        </SidebarContent>
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <IconDatabase className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">CDN Proxy</span>
                  <span className="truncate text-xs">v2.0 Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        {/* Dropdown removido como solicitado */}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
