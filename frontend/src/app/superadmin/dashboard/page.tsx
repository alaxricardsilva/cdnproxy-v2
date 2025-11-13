"use client";
import { useEffect, useState } from "react";
import { Card, Typography, CircularProgress } from "@mui/material";
import Grid from '@mui/material/Grid';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface DashboardData {
  totalDomains: number;
  activeDomains: number;
  expiringDomains: number;
  totalUsers: number;
  monthlyTraffic: {
    download: string;
    upload: string;
    requests: number;
    updatedAt: string;
  };
}

export default function SuperAdminDashboardDetail() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
    }
  }, [session, status, router]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Exemplo de chamada para endpoints reais do backend
        const [domainsRes, usersRes, trafficRes] = await Promise.all([
          fetch("/api/admin/domains"),
          fetch("/api/users"),
          fetch("/api/dashboard-data"),
        ]);
        const domains = await domainsRes.json();
        const users = await usersRes.json();
        const traffic = await trafficRes.json();

        const totalDomains = domains.length;
        const activeDomains = domains.filter((d: any) => d.status === "active").length;
        const expiringDomains = domains.filter((d: any) => {
          const expiresAt = new Date(d.expiresAt);
          const now = new Date();
          const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return diffDays <= 7 && diffDays > 0;
        }).length;
        const totalUsers = users.length;
        const monthlyTraffic = {
          download: traffic?.download || 0,
          upload: traffic?.upload || 0,
          requests: traffic?.requests || 0,
          updatedAt: traffic?.updatedAt || "",
        };

        setData({
          totalDomains,
          activeDomains,
          expiringDomains,
          totalUsers,
          monthlyTraffic,
        });
      } catch (err) {
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  if (loading) {
    return <CircularProgress sx={{ mt: 8 }} />;
  }

  if (!data) {
    return <Typography color="error">Erro ao carregar dados do dashboard.</Typography>;
  }

  return (
    <Grid container spacing={3}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3, background: "#18181b", color: "#fff", borderRadius: 3 }}>
            <Typography variant="h6">Total de Domínios</Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>{data.totalDomains}</Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3, background: "#18181b", color: "#fff", borderRadius: 3 }}>
            <Typography variant="h6">Domínios Ativos</Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>{data.activeDomains}</Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3, background: "#18181b", color: "#fff", borderRadius: 3 }}>
            <Typography variant="h6">Expirando em 7 dias</Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>{data.expiringDomains}</Typography>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3, background: "#23272f", color: "#fff", borderRadius: 3 }}>
            <Typography variant="h6">Tráfego Mensal</Typography>
            <Typography variant="body1">Download: {data.monthlyTraffic.download} GB</Typography>
            <Typography variant="body1">Upload: {data.monthlyTraffic.upload} GB</Typography>
            <Typography variant="body1">Requisições: {data.monthlyTraffic.requests}</Typography>
            <Typography variant="caption">Atualizado em: {data.monthlyTraffic.updatedAt}</Typography>
          </Card>
        </Grid>
      </Grid>
    </Grid>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}