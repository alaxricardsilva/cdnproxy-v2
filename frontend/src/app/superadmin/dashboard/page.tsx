"use client";
import { useEffect, useState } from 'react';
import { Card, Typography, CircularProgress } from "@mui/material";
import Grid from '@mui/material/Grid';
import { useRouter } from "next/navigation";
import { formatDateToSaoPaulo } from '../../../utils/formatDate';
import { createClient } from "../../../../utils/supabase/client";
import { Select, MenuItem, TextField, Box, Button } from "@mui/material";

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
  const router = useRouter();
  const supabase = createClient();
  useEffect(() => {
    // Verifica sessão via Supabase Auth
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/auth/login");
      }
    });
  }, [router, supabase]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const [domainStatus, setDomainStatus] = useState("Todos");
  const [search, setSearch] = useState("");
  const [metrics, setMetrics] = useState<Array<{ label: string; value: number }>>([]);
  const [logs, setLogs] = useState<Array<{ id: string; action: string; date: string; user: string }>>([]);

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout;
    let subscription: any;
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const jwt = localStorage.getItem("jwt");
        const params = new URLSearchParams({
          period,
          status: domainStatus,
          search,
        });
        const [domainsRes, usersRes, trafficRes] = await Promise.all([
          fetch(`/api/admin/domains?${params.toString()}`, { headers: jwt ? { Authorization: `Bearer ${jwt}` } : {} }),
          fetch(`/api/users?${params.toString()}`, { headers: jwt ? { Authorization: `Bearer ${jwt}` } : {} }),
          fetch(`/api/dashboard-data?${params.toString()}`, { headers: jwt ? { Authorization: `Bearer ${jwt}` } : {} }),
        ]);
        const domains = await domainsRes.json();
        const users = await usersRes.json();
        const traffic = await trafficRes.json();

        const totalDomains = domains.length;
        const activeDomains = domains.filter((d: { status: string }) => d.status === "active").length;
        const expiringDomains = domains.filter((d: { expiresAt: string }) => {
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
    // Polling a cada 10 segundos
    pollingInterval = setInterval(fetchDashboardData, 10000);
    // Supabase Realtime (exemplo para tabela 'domains')
    subscription = supabase
      .channel('public:domains')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'domains' }, () => {
        fetchDashboardData();
      })
      .subscribe();
    return () => {
      clearInterval(pollingInterval);
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [supabase, period, domainStatus, search]);

  if (loading) {
    return <CircularProgress sx={{ mt: 8 }} />;
  }

  if (!data) {
    return <Typography color="error">Erro ao carregar dados do dashboard.</Typography>;
  }

  return (
    <Box sx={{ background: "#181818", color: "#fff", minHeight: "100vh", p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>Dashboard SuperAdmin</Typography>
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <Select value={period} onChange={e => setPeriod(e.target.value)} sx={{ bgcolor: "#222", color: "#fff" }}>
          <MenuItem value="24h">Últimas 24 horas</MenuItem>
          <MenuItem value="7d">Últimos 7 dias</MenuItem>
          <MenuItem value="30d">Últimos 30 dias</MenuItem>
        </Select>
        <Select value={domainStatus} onChange={e => setDomainStatus(e.target.value)} sx={{ bgcolor: "#222", color: "#fff" }}>
          <MenuItem value="Todos">Todos</MenuItem>
          <MenuItem value="active">Ativos</MenuItem>
          <MenuItem value="expiring">Expirando</MenuItem>
        </Select>
        <TextField value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar domínio ou usuário..." size="small" sx={{ bgcolor: "#333", color: "#fff" }} />
        <Button variant="contained" onClick={() => setLoading(true)}>Atualizar</Button>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, backgroundColor: '#18181b', color: '#fff', borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
            <Typography variant="subtitle2" sx={{ color: '#bdbdbd' }}>Total de Domínios</Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#00bcd4' }}>{data?.totalDomains ?? 0}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, backgroundColor: '#18181b', color: '#fff', borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
            <Typography variant="subtitle2" sx={{ color: '#bdbdbd' }}>Domínios Ativos</Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#4caf50' }}>{data?.activeDomains ?? 0}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, backgroundColor: '#18181b', color: '#fff', borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
            <Typography variant="subtitle2" sx={{ color: '#bdbdbd' }}>Expirando em 7 dias</Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#ff9800' }}>{data?.expiringDomains ?? 0}</Typography>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, background: "#23272f", color: "#fff", borderRadius: 3 }}>
            <Typography variant="h6">Tráfego Mensal</Typography>
            <Typography variant="body1">Download: {data.monthlyTraffic.download} GB</Typography>
            <Typography variant="body1">Upload: {data.monthlyTraffic.upload} GB</Typography>
            <Typography variant="body1">Requisições: {data.monthlyTraffic.requests}</Typography>
            <Typography variant="caption">Atualizado em: {data.monthlyTraffic.updatedAt ? formatDateToSaoPaulo(data.monthlyTraffic.updatedAt) : '-'}</Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}