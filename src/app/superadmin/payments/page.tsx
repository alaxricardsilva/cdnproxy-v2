"use client";
import { useEffect, useState } from 'react';
import { Card, Typography, Box, Button, Snackbar, Alert, Tabs, Tab, Grid, TextField, CircularProgress } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

export default function SuperadminPaymentsPage() {
  const [tab, setTab] = useState(0);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });

  // PIX config
  const [pixConfig, setPixConfig] = useState<any>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixSaving, setPixSaving] = useState(false);

  // Mercado Pago config
  const [mpConfig, setMpConfig] = useState<any>(null);
  const [mpLoading, setMpLoading] = useState(false);
  const [mpSaving, setMpSaving] = useState(false);

  useEffect(() => {
    fetch('/api/payments')
      .then(res => res.json())
      .then(data => {
        setPayments(data.payments || []);
        setLoading(false);
      })
      .catch(() => {
        setSnackbar({ open: true, message: "Erro ao carregar pagamentos", severity: "error" });
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    // Carregar configuração PIX
    setPixLoading(true);
    fetch('/api/superadmin/config/pix')
      .then(res => res.json())
      .then(data => {
        setPixConfig(data);
        setPixLoading(false);
      })
      .catch(() => {
        setSnackbar({ open: true, message: "Erro ao carregar configuração PIX", severity: "error" });
        setPixLoading(false);
      });
    // Carregar configuração Mercado Pago
    setMpLoading(true);
    fetch('/api/superadmin/config/mercadopago')
      .then(res => res.json())
      .then(data => {
        setMpConfig(data);
        setMpLoading(false);
      })
      .catch(() => {
        setSnackbar({ open: true, message: "Erro ao carregar configuração Mercado Pago", severity: "error" });
        setMpLoading(false);
      });
  }, []);

  // DataGrid columns
  const tableColumns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'user', headerName: 'Usuário', width: 200 },
    { field: 'amount', headerName: 'Valor', width: 120 },
    { field: 'status', headerName: 'Status', width: 150 },
    { field: 'createdAt', headerName: 'Data', width: 180 },
  ];
  const tableData = payments.map((payment: any) => ({
    id: payment.id,
    user: payment.userName || payment.user || '-',
    amount: payment.amount,
    status: payment.status,
    createdAt: payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '-',
  }));

  // Handlers PIX
  const handlePixChange = (field: string, value: string) => {
    setPixConfig((prev: any) => ({ ...prev, [field]: value }));
  };
  const handlePixSave = async () => {
    setPixSaving(true);
    try {
      const res = await fetch('/api/superadmin/config/pix', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pixConfig),
      });
      if (res.ok) {
        setSnackbar({ open: true, message: 'Configuração PIX salva com sucesso', severity: 'success' });
      } else {
        throw new Error();
      }
    } catch {
      setSnackbar({ open: true, message: 'Erro ao salvar configuração PIX', severity: 'error' });
    } finally {
      setPixSaving(false);
    }
  };

  // Handlers Mercado Pago
  const handleMpChange = (field: string, value: string) => {
    setMpConfig((prev: any) => ({ ...prev, [field]: value }));
  };
  const handleMpSave = async () => {
    setMpSaving(true);
    try {
      const res = await fetch('/api/superadmin/config/mercadopago', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mpConfig),
      });
      if (res.ok) {
        setSnackbar({ open: true, message: 'Configuração Mercado Pago salva com sucesso', severity: 'success' });
      } else {
        throw new Error();
      }
    } catch {
      setSnackbar({ open: true, message: 'Erro ao salvar configuração Mercado Pago', severity: 'error' });
    } finally {
      setMpSaving(false);
    }
  };

  return (
    <Grid container justifyContent="center" alignItems="flex-start" style={{ minHeight: "80vh" }}>
      <Grid
        size={{
          xs: 12,
          md: 8
        }}>
        <Card elevation={6} style={{ borderRadius: 16, background: "#181A20", color: "#fff", padding: 32, marginTop: 32 }}>
          <Typography variant="h5" gutterBottom>
            Pagamentos (Superadmin)
          </Typography>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="inherit" indicatorColor="primary" sx={{ mb: 3 }}>
            <Tab label="Pagamentos" />
            <Tab label="Configuração PIX" />
            <Tab label="Configuração Mercado Pago" />
          </Tabs>
          {tab === 0 && (
            <>
              {loading ? (
                <Box sx={{ py: 4 }}><CircularProgress /></Box>
              ) : (
                <>
                  <Typography variant="body2" sx={{ mb: 2 }}>Total de pagamentos: {payments.length}</Typography>
                  <DataGrid
                    rows={tableData}
                    columns={tableColumns}
                    autoHeight
                    initialState={{ pagination: { paginationModel: { pageSize: 20, page: 0 } } }}
                    sx={{ bgcolor: '#18181b', color: '#fff', borderRadius: 3 }}
                    pageSizeOptions={[20, 50, 100]}
                    pagination
                    loading={loading}
                  />
                </>
              )}
            </>
          )}
          {tab === 1 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>Configuração PIX</Typography>
              {pixLoading ? (
                <CircularProgress />
              ) : pixConfig ? (
                <Grid container spacing={2}>
                  {Object.entries(pixConfig).map(([key, value]) => (
                    <Grid
                      key={key}
                      size={{
                        xs: 12,
                        md: 6
                      }}>
                      <TextField
                        label={key}
                        value={value}
                        onChange={e => handlePixChange(key, e.target.value)}
                        fullWidth
                        variant="outlined"
                        InputProps={{ style: { color: "#fff" } }}
                        InputLabelProps={{ style: { color: "#bbb" } }}
                      />
                    </Grid>
                  ))}
                  <Grid size={12}>
                    <Button variant="contained" color="success" onClick={handlePixSave} disabled={pixSaving}>
                      {pixSaving ? <CircularProgress size={24} /> : "Salvar PIX"}
                    </Button>
                  </Grid>
                </Grid>
              ) : (
                <Typography variant="body2">Nenhuma configuração PIX encontrada.</Typography>
              )}
            </Box>
          )}
          {tab === 2 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>Configuração Mercado Pago</Typography>
              {mpLoading ? (
                <CircularProgress />
              ) : mpConfig ? (
                <Grid container spacing={2}>
                  {Object.entries(mpConfig).map(([key, value]) => (
                    <Grid
                      key={key}
                      size={{
                        xs: 12,
                        md: 6
                      }}>
                      <TextField
                        label={key}
                        value={value}
                        onChange={e => handleMpChange(key, e.target.value)}
                        fullWidth
                        variant="outlined"
                        InputProps={{ style: { color: "#fff" } }}
                        InputLabelProps={{ style: { color: "#bbb" } }}
                      />
                    </Grid>
                  ))}
                  <Grid size={12}>
                    <Button variant="contained" color="success" onClick={handleMpSave} disabled={mpSaving}>
                      {mpSaving ? <CircularProgress size={24} /> : "Salvar Mercado Pago"}
                    </Button>
                  </Grid>
                </Grid>
              ) : (
                <Typography variant="body2">Nenhuma configuração Mercado Pago encontrada.</Typography>
              )}
            </Box>
          )}
        </Card>
      </Grid>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Grid>
  );
}