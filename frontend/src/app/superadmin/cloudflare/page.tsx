"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Card, Typography, Grid, CircularProgress, Box, Button } from '@mui/material';
import { LineChart, BarChart } from '@mui/x-charts';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const isSuperadmin = true; // Aqui deve ser sua lógica real de verificação

export default function CloudflareAdminPage() {
  const router = useRouter();
  const [zones, setZones] = useState<Array<{ id: string; name: string; status: string; expires_at?: string }>>([]);
  const [monthlyTrafficData, setMonthlyTrafficData] = useState<Array<{ domain: string; download: number; upload: number }>>([]);
  const [httpRequestsData, setHttpRequestsData] = useState<Array<{ date: string; requests: number }>>([]);
  const [expiringDomainsData, setExpiringDomainsData] = useState<Array<{ date: string; expiring: number }>>([]);
  const [statusDomainsData, setStatusDomainsData] = useState<Array<{ status: string; count: number }>>([]);
  const [trafficPeaksData, setTrafficPeaksData] = useState<Array<{ hour: string; peaks: number }>>([]);
  const [dnsChangesData, setDnsChangesData] = useState<Array<{ date: string; changes: number }>>([]);
  const [geoAccessData, setGeoAccessData] = useState<Array<{ country: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuperadmin) {
      router.replace('/');
      return;
    }
    fetch('/api/cloudflare/zones')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
          toast.error(data.error);
        } else {
          setZones(data.zones);
          setMonthlyTrafficData(data.monthlyTraffic || []);
          setHttpRequestsData(data.httpRequests || []);
          setExpiringDomainsData(data.expiringDomains || []);
          setStatusDomainsData(data.statusDomains || []);
          setTrafficPeaksData(data.trafficPeaks || []);
          setDnsChangesData(data.dnsChanges || []);
          setGeoAccessData(data.geoAccess || []);
          toast.success('Dados carregados com sucesso!');
        }
      })
      .catch(err => {
        setError('Erro ao buscar domínios.');
        toast.error('Erro ao buscar domínios.');
      })
      .finally(() => setLoading(false));
  }, [isSuperadmin, router]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast.info(message);
  };

  const handleEdit = (zone: any) => {
    showToast('Função de edição ainda não implementada.', 'info');
  };

  const handleCreateSubdomain = (zone: any) => {
    showToast('Função de criação de subdomínio ainda não implementada.', 'info');
  };

  const handleDelete = async (cloudflare: any) => {
    try {
      await fetch(`/api/superadmin/cloudflare/${cloudflare.id}`, { method: 'DELETE' });
      showToast('Registro excluído com sucesso!', 'success');
      setZones(zones.filter((c: any) => c.id !== cloudflare.id));
    } catch {
      showToast('Erro ao excluir registro.', 'error');
    }
  };

  if (!isSuperadmin) {
    return null;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <ToastContainer />
      <h1>Cloudflare - Gestão de Domínios</h1>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, backgroundColor: '#18181b', color: '#fff', borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
            <Typography variant="subtitle2" sx={{ color: '#bdbdbd' }}>Total de Domínios</Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#00bcd4' }}>{zones.length}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, backgroundColor: '#18181b', color: '#fff', borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
            <Typography variant="subtitle2" sx={{ color: '#bdbdbd' }}>Domínios Ativos</Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#4caf50' }}>{zones.filter(z => z.status === 'active').length}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, backgroundColor: '#18181b', color: '#fff', borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
            <Typography variant="subtitle2" sx={{ color: '#bdbdbd' }}>Expirando em 7 dias</Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#ff9800' }}>{zones.filter(z => {
              if (!z.expires_at) return 0;
              const expiresAt = new Date(z.expires_at);
              const now = new Date();
              const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
              return diffDays <= 7 && diffDays > 0;
            }).length}</Typography>
          </Card>
        </Grid>
      </Grid>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, bgcolor: '#23272f', color: '#fff', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Tráfego Mensal por Domínio</Typography>
            <LineChart
              series={[
                { data: monthlyTrafficData.map((d) => d.download), label: 'Download', color: '#00bcd4' },
                { data: monthlyTrafficData.map((d) => d.upload), label: 'Upload', color: '#4caf50' }
              ]}
              xAxis={[{ scaleType: 'point', data: monthlyTrafficData.map((d) => d.domain) }]}
              height={220}
            />
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, bgcolor: '#23272f', color: '#fff', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Requisições HTTP</Typography>
            <LineChart
              series={[
                { data: httpRequestsData.map((d) => d.requests), label: 'Requisições', color: '#ff9800' }
              ]}
              xAxis={[{ scaleType: 'point', data: httpRequestsData.map((d) => d.date) }]}
              height={220}
            />
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, bgcolor: '#23272f', color: '#fff', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Domínios Expirando</Typography>
            <BarChart
              series={[
                { data: expiringDomainsData.map((d) => d.expiring), label: 'Expirando', color: '#ff9800' }
              ]}
              xAxis={[{ scaleType: 'point', data: expiringDomainsData.map((d) => d.date) }]}
              height={220}
            />
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, bgcolor: '#23272f', color: '#fff', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Status dos Domínios</Typography>
            <BarChart
              series={[
                { data: statusDomainsData.map((d) => d.count), label: 'Status', color: '#00bcd4' }
              ]}
              xAxis={[{ scaleType: 'point', data: statusDomainsData.map((d) => d.status) }]}
              height={220}
            />
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, bgcolor: '#23272f', color: '#fff', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Picos de Tráfego</Typography>
            <LineChart
              series={[
                { data: trafficPeaksData.map((d) => d.peaks), label: 'Picos', color: '#00bcd4' }
              ]}
              xAxis={[{ scaleType: 'point', data: trafficPeaksData.map((d) => d.hour) }]}
              height={220}
            />
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, bgcolor: '#23272f', color: '#fff', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Histórico de Alterações DNS</Typography>
            <BarChart
              series={[
                { data: dnsChangesData.map((d) => d.changes), label: 'Alterações DNS', color: '#4caf50' }
              ]}
              xAxis={[{ scaleType: 'point', data: dnsChangesData.map((d) => d.date) }]}
              height={220}
            />
          </Card>
        </Grid>
        <Grid item xs={12} md={12}>
          <Card sx={{ p: 3, bgcolor: '#23272f', color: '#fff', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Distribuição Geográfica dos Acessos</Typography>
            {/* MapChart removido pois não existe definição/importação. Substitua por outro componente ou mensagem se necessário. */}
            <Typography variant="body2" sx={{ color: '#bdbdbd' }}>
              Visualização geográfica não disponível.
            </Typography>
          </Card>
        </Grid>
      </Grid>
      {loading && <CircularProgress sx={{ mt: 8 }} />}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '2rem' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Domínio</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>ID</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Status</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {zones.map(zone => (
              <tr key={zone.id}>
                <td>{zone.name}</td>
                <td>{zone.id}</td>
                <td>{zone.status}</td>
                <td>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" size="small" onClick={() => handleEdit(zone)}>Editar</Button>
                    <Button variant="outlined" size="small" onClick={() => handleCreateSubdomain(zone)}>Criar Subdomínio</Button>
                  </Box>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
