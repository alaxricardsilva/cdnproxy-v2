"use client";
import { useEffect, useState } from 'react';
import { Card, Typography, List, ListItem, ListItemText } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, Snackbar, Alert } from '@mui/material';
import { formatDateToSaoPaulo } from '../../../utils/formatDate';

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
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editDomain, setEditDomain] = useState<Domain | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editType, setEditType] = useState('proxy');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success'|'error'>('success');

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

  const handleEditSave = async () => {
    try {
      await fetch(`/api/admin/domains/${editDomain?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: editUrl, type: editType }),
      });
      showSnackbar('Domínio atualizado com sucesso!', 'success');
      setEditOpen(false);
      setEditDomain(null);
      setEditUrl('');
      setEditType('proxy');
      // Atualiza lista
      fetch('/api/admin/domains')
        .then(res => res.json())
        .then(data => setDomains(data.domains || []));
    } catch {
      showSnackbar('Erro ao atualizar domínio.', 'error');
    }
  };

  const handleRenew = async (domain: Domain) => {
    // Implemente a lógica de renovação conforme sua API
    showSnackbar('Função de renovação chamada!', 'success');
  };

  const handleDelete = async (domain: Domain) => {
    try {
      await fetch(`/api/admin/domains/${domain.id}`, { method: 'DELETE' });
      showSnackbar('Domínio excluído com sucesso!', 'success');
      setDomains(domains.filter((d: Domain) => d.id !== domain.id));
    } catch {
      showSnackbar('Erro ao excluir domínio.', 'error');
    }
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
          <>
            <Button
              variant="contained"
              size="small"
              sx={{ mr: 1 }}
              disabled={expired}
              onClick={() => handleEditClick(domain!)}
            >Editar</Button>
            <Button
              variant="outlined"
              size="small"
              sx={{ mr: 1 }}
              onClick={() => handleRenew(domain!)}
            >Renovar</Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => handleDelete(domain!)}
            >Excluir</Button>
          </>
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
        initialState={{
          pagination: { paginationModel: { pageSize: 10, page: 0 } }
        }}
        sx={{ bgcolor: '#18181b', color: '#fff', borderRadius: 3 }}
        pageSizeOptions={[10, 20, 50]}
        pagination
      />
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogTitle>Editar Domínio</DialogTitle>
        <DialogContent>
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
    </>
  );
}
// Nenhum uso do Grid legacy encontrado neste arquivo.