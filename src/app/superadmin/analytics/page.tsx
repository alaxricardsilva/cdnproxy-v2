"use client";
import { useEffect, useState } from 'react';
import {
  Card, Typography, Button, List, ListItem, ListItemText, Select, MenuItem, TextField, Box
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { formatDateToSaoPaulo } from '../../../utils/formatDate';

const defaultMetrics = {
  totalRequests: 0,
  uniqueVisitors: 0,
  bandwidth: 0,
  healthStatus: 'Saudável',
  healthLatency: 0,
  cacheRate: 0,
  avgTime: 0,
  errorRate: 0,
  uptime: 100,
};

interface AccessLog {
  accessed_at?: string;
  client_ip?: string;
  method?: string;
  status_code?: number;
  cache_status?: string;
  episode_info?: any;
  path?: string;
  user_agent?: string;
  country?: string;
  city?: string;
  isp?: string;
}

export default function SuperadminAnalyticsPage() {
  const [metrics, setMetrics] = useState(defaultMetrics);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('24h');
  const [httpStatus, setHttpStatus] = useState('Todos');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/superadmin/analytics?period=${period}&status=${httpStatus}&search=${search}`)
      .then(res => res.json())
      .then(data => {
        setMetrics(data.metrics || defaultMetrics);
        setLogs(data.logs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [period, httpStatus, search]);

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  return (
    <Box sx={{ background: '#181818', color: '#fff', minHeight: '100vh', p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>Analytics do Domínio</Typography>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>DNS 1 Teste Richard</Typography>
      <Typography variant="caption" sx={{ mb: 2 }}>Última atualização: {logs.length > 0 && logs[0].accessed_at ? formatDateToSaoPaulo(logs[0].accessed_at) : '-'}</Typography>
      <Button variant="contained" sx={{ float: 'right', mb: 2 }}>Atualizar</Button>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Cards de métricas principais */}
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <Card sx={{ p: 2, bgcolor: '#222' }}>
            <Typography variant="subtitle2">Total de Requisições</Typography>
            <Typography variant="h6">{metrics.totalRequests}</Typography>
            <Typography variant="caption">nas últimas 24 horas</Typography>
          </Card>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <Card sx={{ p: 2, bgcolor: '#222' }}>
            <Typography variant="subtitle2">Visitantes Únicos</Typography>
            <Typography variant="h6">{metrics.uniqueVisitors}</Typography>
            <Typography variant="caption">IPs únicos</Typography>
          </Card>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <Card sx={{ p: 2, bgcolor: '#222' }}>
            <Typography variant="subtitle2">Banda Transferida</Typography>
            <Typography variant="h6">{formatBytes(metrics.bandwidth)}</Typography>
            <Typography variant="caption">nas últimas 24 horas</Typography>
          </Card>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <Card sx={{ p: 2, bgcolor: '#222' }}>
            <Typography variant="subtitle2">Status de Saúde</Typography>
            <Typography variant="h6">{metrics.healthStatus}</Typography>
            <Typography variant="caption">{metrics.healthLatency}ms resp. médio</Typography>
          </Card>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <Card sx={{ p: 2, bgcolor: '#222' }}>
            <Typography variant="subtitle2">Erros</Typography>
            <Typography variant="h6">{metrics.errorRate}%</Typography>
            <Typography variant="caption">Erros nas últimas 24h</Typography>
          </Card>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <Card sx={{ p: 2, bgcolor: '#222' }}>
            <Typography variant="subtitle2">Uptime</Typography>
            <Typography variant="h6">{metrics.uptime}%</Typography>
            <Typography variant="caption">Disponibilidade</Typography>
          </Card>
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <Card sx={{ p: 2, bgcolor: '#222' }}>
            <Typography variant="subtitle2">Taxa de Cache</Typography>
            <Typography variant="h6">{metrics.cacheRate}%</Typography>
            <Typography variant="caption">Eficiência do cache</Typography>
          </Card>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <Card sx={{ p: 2, bgcolor: '#222' }}>
            <Typography variant="subtitle2">Tempo Médio</Typography>
            <Typography variant="h6">{metrics.avgTime}ms</Typography>
            <Typography variant="caption">Tempo de resposta</Typography>
          </Card>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <Card sx={{ p: 2, bgcolor: '#222' }}>
            <Typography variant="subtitle2">Taxa de Erro</Typography>
            <Typography variant="h6">{metrics.errorRate}%</Typography>
            <Typography variant="caption">Erros nas últimas 24h</Typography>
          </Card>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <Card sx={{ p: 2, bgcolor: '#222' }}>
            <Typography variant="subtitle2">Uptime</Typography>
            <Typography variant="h6">{metrics.uptime}%</Typography>
            <Typography variant="caption">Disponibilidade</Typography>
          </Card>
        </Grid>
      </Grid>
      {/* Filtros de Logs */}
      <Card sx={{ p: 2, bgcolor: '#222', mb: 2 }}>
        <Typography variant="h6">Filtros de Logs</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid size={12}>
            <Select value={period} onChange={e => setPeriod(e.target.value)}>
              <MenuItem value="24h">Últimas 24 horas</MenuItem>
              <MenuItem value="7d">Últimos 7 dias</MenuItem>
            </Select>
          </Grid>
          <Grid size={12}>
            <Select value={httpStatus} onChange={e => setHttpStatus(e.target.value)}>
              <MenuItem value="Todos">Todos</MenuItem>
              <MenuItem value="200">200</MenuItem>
              <MenuItem value="404">404</MenuItem>
              <MenuItem value="500">500</MenuItem>
            </Select>
          </Grid>
          <Grid size={12}>
            <TextField value={search} onChange={e => setSearch(e.target.value)} placeholder="IP, URL ou User Agent..." size="small" sx={{ bgcolor: '#333', color: '#fff' }} />
          </Grid>
        </Grid>
      </Card>
      {/* Logs de acesso */}
      <Card sx={{ p: 2, bgcolor: '#222', mb: 2 }}>
        <Typography variant="h6">Logs de Acesso - Últimas 24 Horas</Typography>
        {loading ? <Typography>Carregando...</Typography> : logs.length === 0 ? <Typography>Não há registros de acesso para os filtros selecionados.</Typography> : (
          <List>
            {logs.map((log: any, idx: number) => (
              <ListItem key={idx}>
                <ListItemText
                  primary={`IP: ${log.client_ip || '-'} | Método: ${log.method || '-'} | Status: ${log.status_code || '-'} | Proxy/Redirect: ${log.cache_status || '-'} | Episódio: ${log.episode_info ? JSON.stringify(log.episode_info) : '-'} | Caminho: ${log.path || '-'} | User-Agent: ${log.user_agent || '-'}`}
                  secondary={`Acessado em: ${log.accessed_at ? formatDateToSaoPaulo(log.accessed_at) : '-'} | País: ${log.country || '-'} | Cidade: ${log.city || '-'} | ISP: ${log.isp || '-'}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Card>
    </Box>
  );
}
