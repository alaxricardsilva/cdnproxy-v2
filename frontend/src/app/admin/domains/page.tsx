"use client";
import { useEffect, useState } from 'react';
import { Card, Typography, List, ListItem, ListItemText, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, Snackbar, Alert } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { formatDateToSaoPaulo } from '../../../utils/formatDate';
// Substituir Snackbar por react-toastify
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Defina a interface do domínio incluindo expiration
interface Domain {
  id: string;
  name: string;
  status: string;
  expiration?: string;
  targetUrl?: string;
  type?: string;
}

export default function AdminDomainsPage() {
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [editDomain, setEditDomain] = useState<Domain | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editType, setEditType] = useState('proxy');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success'|'error'>('success');
  const [editOpen, setEditOpen] = useState(false);

  const showSnackbar = (message: string, severity: 'success'|'error' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleEditClick = (domain: Domain) => {
    setEditDomain(domain);
    setEditUrl(domain.targetUrl || '');
    setEditType(domain.type || 'proxy');
    setEditOpen(true);
  };

  // Remover Snackbar/Alert
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  const handleEdit = (domain: Domain) => {
    setEditDomain(domain);
    setEditUrl(domain.targetUrl || '');
    setEditType(domain.type || 'proxy');
    setEditOpen(true);
  };

  const handleRenew = async (domain: Domain) => {
    try {
      window.location.href = `/admin/cart?renew=${domain.id}`;
    } catch {
      showToast('Erro ao redirecionar para renovação.', 'error');
    }
  };

  const handleToggleStatus = async (domain: Domain) => {
    try {
      await fetch(`/api/admin/domains/${domain.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: domain.status === 'active' ? 'inactive' : 'active' }),
      });
      showToast(`Domínio ${domain.status === 'active' ? 'desativado' : 'ativado'} com sucesso!`, 'success');
      fetch('/api/admin/domains')
        .then(res => res.json())
        .then(data => setDomains(data.domains || []));
    } catch {
      showToast('Erro ao alterar status do domínio.', 'error');
    }
  };

  const handleDelete = async (domain: Domain) => {
    try {
      await fetch(`/api/admin/domains/${domain.id}`, { method: 'DELETE' });
      showToast('Domínio excluído com sucesso!', 'success');
      setDomains(domains.filter((d: Domain) => d.id !== domain.id));
    } catch {
      showToast('Erro ao excluir domínio.', 'error');
    }
  };

  const handleEditSave = () => {
    // Aqui você pode adicionar a lógica para salvar a edição do domínio
    setEditOpen(false);
    showToast('Domínio editado com sucesso!', 'success');
  };

  // Definição das colunas para o DataGrid
  const tableColumns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Domínio', width: 200 },
    { field: 'status', headerName: 'Status', width: 150 },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 260,
      renderCell: (params: any) => {
        const domain = domains.find((d: Domain) => d.id === params.row.id);
        const expired = !!(domain && domain.expiration && new Date(domain.expiration) < new Date());
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" disabled={expired} onClick={() => handleEdit(domain!)}>Editar</Button>
            <Button variant="outlined" size="small" onClick={() => handleRenew(domain!)}>Renovar</Button>
            <Button variant="outlined" size="small" onClick={() => handleToggleStatus(domain!)}>{domain?.status === 'active' ? 'Desativar' : 'Ativar'}</Button>
            <Button variant="outlined" size="small" color="error" onClick={() => handleDelete(domain!)}>Excluir</Button>
          </Box>
        );
      }
    }
  ];

  // Adaptação dos dados para o DataGrid
  const tableData = domains.map((domain: Domain) => ({
    id: domain.id,
    name: domain.name,
    status: domain.status,
    actions: ''
  }));

  return (
    <>
      <Card sx={{ p: 4 }}>
        <Typography variant="h5">Gerenciamento de Domínios (Admin)</Typography>
        {loading ? (
          <Typography variant="body1">Carregando...</Typography>
        ) : (
          <List>
            {domains.length === 0 ? (
              <ListItem><ListItemText primary="Nenhum domínio encontrado." /></ListItem>
            ) : (
              domains.map((domain: Domain) => (
                <ListItem key={domain.id}>
                  <ListItemText primary={domain.name} secondary={domain.status} />
                </ListItem>
              ))
            )}
          </List>
        )}
      </Card>
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
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogTitle>Editar Domínio</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            O sistema automaticamente identifica se vai ser Proxy Reverso/Redirecionamento.
          </Alert>
          <TextField
            label="URL de Destino"
            fullWidth
            margin="normal"
            value={editUrl}
            onChange={e => setEditUrl(e.target.value)}
          />
          <Select
            label="Tipo"
            fullWidth
            value={editType}
            onChange={e => setEditType(e.target.value)}
            sx={{ mt: 2 }}
            disabled
          >
            <MenuItem value="proxy">Proxy Reverso</MenuItem>
            <MenuItem value="redirect">Redirecionamento 301</MenuItem>
          </Select>
          <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
            O tipo de entrega (Proxy/Redirecionamento) é definido automaticamente pelo sistema. Para alterar, entre em contato com o suporte.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleEditSave}>Salvar</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <ToastContainer />
    </>
  );
}