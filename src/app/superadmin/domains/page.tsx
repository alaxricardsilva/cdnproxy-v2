"use client";
import { useEffect, useState } from 'react';
import { Card, Typography, Box } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControlLabel, Checkbox, Select, MenuItem, InputLabel, FormControl, Snackbar, Alert } from '@mui/material';
import { formatDateToSaoPaulo } from '../../../utils/formatDate';

export default function SuperadminDomainsPage() {
  // Estados principais
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editDomain, setEditDomain] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    domain: '',
    destinationUrl: '',
    isReverseProxy: true,
    isRedirect301: false,
    userId: '',
    expiresAt: '',
    expiresHour: '23:59',
  });
  const [users, setUsers] = useState<any[]>([]);

  // Estados do Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');

  // Removido função showSnackbar fora do escopo do componente
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  useEffect(() => {
    fetch('/api/domains')
      .then(res => res.json())
      .then(data => {
        setDomains(data.domains || []);
        setActiveCount(data.domains?.filter((d: any) => d.status === 'active').length || 0);
        setExpiredCount(data.domains?.filter((d: any) => d.status === 'expired').length || 0);
        setExpiringSoonCount(data.domains?.filter((d: any) => d.status === 'expiring').length || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data.users || []));
  }, []);

  const handleOpenDialog = (domain?: any) => {
    if (domain) {
      setEditDomain(domain);
      setForm({
        name: domain.name || '',
        domain: domain.domain || '',
        destinationUrl: domain.destinationUrl || '',
        isReverseProxy: domain.type === 'reverse',
        isRedirect301: domain.type === 'redirect',
        userId: domain.userId || '',
        expiresAt: domain.expiresAt ? domain.expiresAt.split('T')[0] : '',
        expiresHour: '23:59',
      });
    } else {
      setEditDomain(null);
      setForm({
        name: '',
        domain: '',
        destinationUrl: '',
        isReverseProxy: true,
        isRedirect301: false,
        userId: '',
        expiresAt: '',
        expiresHour: '23:59',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditDomain(null);
  };

  const handleFormChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Função para atualizar lista de domínios após operações
  const fetchDomains = () => {
    setLoading(true);
    fetch('/api/domains')
      .then(res => res.json())
      .then(data => {
        setDomains(data.domains || []);
        setActiveCount(data.domains?.filter((d: any) => d.status === 'active').length || 0);
        setExpiredCount(data.domains?.filter((d: any) => d.status === 'expired').length || 0);
        setExpiringSoonCount(data.domains?.filter((d: any) => d.status === 'expiring').length || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // Submissão do formulário (criar/editar)
  const handleSubmit = async () => {
    const payload = {
      name: form.name,
      domain: form.domain,
      destinationUrl: form.destinationUrl,
      type: form.isReverseProxy ? 'reverse' : form.isRedirect301 ? 'redirect' : '',
      userId: form.userId,
      expiresAt: form.expiresAt ? `${form.expiresAt}T${form.expiresHour}` : null,
    };
    try {
      if (editDomain) {
        await fetch(`/api/domains/${editDomain.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/domains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      fetchDomains();
      handleCloseDialog();
    } catch (err) {
      // TODO: tratar erro
    }
  };

  // Ações da tabela
  const handleRenew = async (domain: any) => {
    await fetch(`/api/domains/${domain.id}/renew`, { method: 'POST' });
    fetchDomains();
  };
  const handleToggleStatus = async (domain: any) => {
    await fetch(`/api/domains/${domain.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: domain.status === 'active' ? 'inactive' : 'active' }),
    });
    fetchDomains();
  };
  const handleDelete = async (domain: any) => {
    await fetch(`/api/domains/${domain.id}`, { method: 'DELETE' });
    fetchDomains();
  };

  useEffect(() => {
    const fetchAndDeactivate = async () => {
      const res = await fetch('/api/domains');
      const data = await res.json();
      const now = new Date();
      // Desativa domínios expirados
      await Promise.all(
        (data.domains || []).map(async (domain: any) => {
          if (domain.status === 'ativo' && domain.expiration && new Date(domain.expiration) < now) {
            await fetch(`/api/domains/${domain.id}/deactivate`, { method: 'PATCH' });
          }
        })
      );
      fetchDomains();
    };
    fetchAndDeactivate();
  }, []);

  // Definição das colunas para o DataGrid
  const tableColumns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    {
      field: 'name',
      headerName: 'Domínio',
      width: 220,
      renderCell: (params) => (
        <Box>
          <Typography variant="subtitle2">{params.row.displayName || params.row.name}</Typography>
          <Typography variant="body2" color="text.secondary">{params.row.domain}</Typography>
        </Box>
      ),
    },
    {
      field: 'userName',
      headerName: 'Usuário',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2">{params.row.userName || '-'}</Typography>
      ),
    },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'expiresAt', headerName: 'Expira em', width: 180 },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 260,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={() => handleOpenDialog(params.row)}>Editar</Button>
          <Button variant="outlined" size="small" onClick={() => handleRenew(params.row)}>Renovar</Button>
          <Button variant="outlined" size="small" onClick={() => handleToggleStatus(params.row)}>{params.row.status === 'active' ? 'Desativar' : 'Ativar'}</Button>
          <Button variant="outlined" size="small" color="error" onClick={() => handleDelete(params.row)}>Excluir</Button>
        </Box>
      ),
    },
  ];

  const tableData = domains.map((domain: any) => ({
    id: domain.id,
    name: domain.name,
    displayName: domain.displayName,
    domain: domain.domain,
    status: domain.status,
    expiresAt: domain.expiresAt ? formatDateToSaoPaulo(domain.expiresAt) : '-',
    userId: domain.userId,
    userName: domain.user?.name || '-',
    type: domain.type,
    destinationUrl: domain.destinationUrl,
  }));

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: 1, minWidth: 220, p: 3, bgcolor: '#18181b', color: '#fff' }}>
          <Typography variant="h6">Domínios Ativos</Typography>
          <Typography variant="h4">{activeCount}</Typography>
        </Card>
        <Card sx={{ flex: 1, minWidth: 220, p: 3, bgcolor: '#18181b', color: '#fff' }}>
          <Typography variant="h6">Domínios Expirados</Typography>
          <Typography variant="h4">{expiredCount}</Typography>
        </Card>
        <Card sx={{ flex: 1, minWidth: 220, p: 3, bgcolor: '#18181b', color: '#fff' }}>
          <Typography variant="h6">Próximos de Vencer</Typography>
          <Typography variant="h4">{expiringSoonCount}</Typography>
        </Card>
        <Button variant="contained" color="primary" sx={{ height: 56 }} onClick={() => handleOpenDialog()}>
          Criar Domínio
        </Button>
      </Box>
      <DataGrid
        rows={tableData}
        columns={tableColumns}
        autoHeight
        initialState={{
          pagination: { paginationModel: { pageSize: 20, page: 0 } }
        }}
        sx={{ bgcolor: '#18181b', color: '#fff', borderRadius: 3 }}
        pageSizeOptions={[20, 50, 100]}
        pagination
        loading={loading}
      />
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editDomain ? 'Editar Domínio' : 'Criar Domínio'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Nome" name="name" value={form.name} onChange={handleFormChange} fullWidth required />
          <TextField label="Domínio" name="domain" value={form.domain} onChange={handleFormChange} fullWidth required />
          <TextField label="URL de Destino" name="destinationUrl" value={form.destinationUrl} onChange={handleFormChange} fullWidth required />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControlLabel control={<Checkbox checked={form.isReverseProxy} name="isReverseProxy" disabled />} label="Proxy Reverso" />
            <FormControlLabel control={<Checkbox checked={form.isRedirect301} name="isRedirect301" disabled />} label="Redirecionamento 301" />
          </Box>
          <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
            O tipo de entrega (Proxy/Redirecionamento) é definido automaticamente pelo sistema.
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="user-select-label">Usuário</InputLabel>
            <Select labelId="user-select-label" name="userId" value={form.userId} onChange={handleFormChange} required>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>{user.name || user.email}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Hora" name="expiresHour" value={form.expiresHour} disabled fullWidth />
            <TextField label="Data de Expiração" name="expiresAt" value={form.expiresAt} onChange={handleFormChange} fullWidth placeholder="DD/MM/YYYY" inputProps={{ maxLength: 10 }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">{editDomain ? 'Salvar' : 'Criar'}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}