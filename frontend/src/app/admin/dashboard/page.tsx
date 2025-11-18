"use client";
import { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { useRouter } from "next/navigation";
import { createClient } from "../../../../utils/supabase/client";
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Select, MenuItem, TextField, Box, Button } from "@mui/material";

const defaultData = {
  totalDomains: 0,
  activeDomains: 0,
  expiringDomains: 0,
};

const defaultMetrics = {
  totalRequests: 0,
  uniqueVisitors: 0,
  bandwidth: 0,
  healthStatus: 'OK',
  healthLatency: 0,
};

const defaultTableData: Array<Record<string, unknown>> = [];
const defaultTableColumns: Array<Record<string, unknown>> = [];

const tableColumns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 90 },
  { field: 'name', headerName: 'Nome', width: 200 },
  // Adicione outros campos conforme necessário
];

export default function AdminDashboardDetail() {
  const router = useRouter();
  const supabase = createClient();
  const [safeData, setSafeData] = useState(defaultData);
  const [metrics, setMetrics] = useState(defaultMetrics);
  const [tableData, setTableData] = useState(defaultTableData);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const [domainStatus, setDomainStatus] = useState("Todos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Verifica sessão via Supabase Auth
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/auth/login");
      }
    });
  }, [router, supabase]);

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout;
    let subscription: any;
    async function fetchDashboardData() {
      setLoading(true);
      // Exemplo de chamada para domínios
      const { data: domains, error: domainsError } = await supabase.from('domains').select('*');
      // Exemplo de chamada para métricas
      const { data: metricsData, error: metricsError } = await supabase.from('metrics').select('*').single();
      // Exemplo de chamada para tabela
      const { data: tableRows, error: tableError } = await supabase.from('dashboard_table').select('*');

      // Filtros dinâmicos
      const filteredDomains = domains ? domains.filter((d: any) => {
        const statusMatch = domainStatus === "Todos" || d.status === domainStatus;
        const searchMatch = search === "" || d.name?.toLowerCase().includes(search.toLowerCase()) || d.domain?.toLowerCase().includes(search.toLowerCase());
        const expiringMatch = domainStatus !== "expiring" || ((() => {
          const expDate = new Date(d.expiryDate);
          const now = new Date();
          const diff = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return diff <= 7 && diff >= 0;
        })());
        return statusMatch && searchMatch && expiringMatch;
      }) : [];

      setSafeData({
        totalDomains: filteredDomains.length,
        activeDomains: filteredDomains.filter((d: any) => d.status === 'ativo').length,
        expiringDomains: filteredDomains.filter((d: any) => {
          const expDate = new Date(d.expiryDate);
          const now = new Date();
          const diff = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return diff <= 7 && diff >= 0;
        }).length,
      });
      setMetrics(metricsData || defaultMetrics);
      setTableData(tableRows || defaultTableData);
      // Removido: setTableColumns(tableRows && tableRows.length > 0 ? Object.keys(tableRows[0]).map((key) => ({ field: key, headerName: key, width: 150 })) : defaultTableColumns);
      setLoading(false);
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

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <Box sx={{ background: "#181818", color: "#fff", minHeight: "100vh", p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>Dashboard Admin</Typography>
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <Select value={period} onChange={e => setPeriod(e.target.value)} sx={{ bgcolor: "#222", color: "#fff" }}>
          <MenuItem value="24h">Últimas 24 horas</MenuItem>
          <MenuItem value="7d">Últimos 7 dias</MenuItem>
          <MenuItem value="30d">Últimos 30 dias</MenuItem>
        </Select>
        <Select value={domainStatus} onChange={e => setDomainStatus(e.target.value)} sx={{ bgcolor: "#222", color: "#fff" }}>
          <MenuItem value="Todos">Todos</MenuItem>
          <MenuItem value="ativo">Ativos</MenuItem>
          <MenuItem value="expiring">Expirando</MenuItem>
        </Select>
        <TextField value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar domínio..." size="small" sx={{ bgcolor: "#333", color: "#fff" }} />
        <Button variant="contained" onClick={() => setLoading(true)}>Atualizar</Button>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, backgroundColor: '#18181b', color: '#fff', borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
            <Typography variant="subtitle2" sx={{ color: '#bdbdbd' }}>Total de Domínios</Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#00bcd4' }}>{safeData.totalDomains}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, backgroundColor: '#18181b', color: '#fff', borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
            <Typography variant="subtitle2" sx={{ color: '#bdbdbd' }}>Domínios Ativos</Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#4caf50' }}>{safeData.activeDomains}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, backgroundColor: '#18181b', color: '#fff', borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
            <Typography variant="subtitle2" sx={{ color: '#bdbdbd' }}>Expirando em 7 dias</Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#ff9800' }}>{safeData.expiringDomains}</Typography>
          </Card>
        </Grid>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 3, backgroundColor: '#18181b', color: '#fff', borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
              <Typography variant="subtitle2" sx={{ color: '#bdbdbd' }}>Total de Requisições</Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#00bcd4' }}>{metrics.totalRequests}</Typography>
              <Typography variant="caption" sx={{ color: '#bdbdbd' }}>nas últimas 24 horas</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 3, backgroundColor: '#18181b', color: '#fff', borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
              <Typography variant="subtitle2" sx={{ color: '#bdbdbd' }}>Visitantes Únicos</Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#4caf50' }}>{metrics.uniqueVisitors}</Typography>
              <Typography variant="caption" sx={{ color: '#bdbdbd' }}>nas últimas 24 horas</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 3, backgroundColor: '#18181b', color: '#fff', borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
              <Typography variant="subtitle2" sx={{ color: '#bdbdbd' }}>Banda Transferida</Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#ff9800' }}>{formatBytes(metrics.bandwidth)}</Typography>
              <Typography variant="caption" sx={{ color: '#bdbdbd' }}>nas últimas 24 horas</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 3, backgroundColor: '#18181b', color: '#fff', borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
              <Typography variant="subtitle2" sx={{ color: '#bdbdbd' }}>Status de Saúde</Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#00bcd4' }}>{metrics.healthStatus}</Typography>
              <Typography variant="caption" sx={{ color: '#bdbdbd' }}>{metrics.healthLatency}ms resp. médio</Typography>
            </Card>
          </Grid>
          <DataGrid
            rows={tableData}
            columns={tableColumns}
            autoHeight
            sx={{
              bgcolor: '#18181b',
              color: '#fff',
              borderRadius: 3,
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
              '& .MuiDataGrid-row:hover': {
                backgroundColor: '#23232b',
              },
            }}
            initialState={{ pagination: { pageSize: 20 } }}
            pagination
            loading={loading}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
