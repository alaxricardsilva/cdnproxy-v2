"use client";
import { useEffect, useState } from 'react';
import { Card, Typography, List, ListItem, ListItemText } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, IconButton, MenuItem } from '@mui/material';
import { Edit, Delete, ToggleOn, ToggleOff } from '@mui/icons-material';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SuperadminUsersPage() {
  // Definição do tipo User
  interface User {
    id: number;
    name: string;
    email: string;
    status: string;
    // Adicione outros campos conforme necessário
  }
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    whatsapp: '+55',
    password: '',
    status: 'Ativo',
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const showSnackbar = (msg: string, severity: 'success' | 'error' = 'success') => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleOpenModal = (user: any = null) => {
    if (user) {
      setEditMode(true);
      setSelectedUser(user);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        company: user.company || '',
        whatsapp: user.whatsapp || '+55',
        password: '',
        status: user.status || 'Ativo',
      });
    } else {
      setEditMode(false);
      setSelectedUser(null);
      setFormData({ name: '', email: '', company: '', whatsapp: '+55', password: '', status: 'Ativo' });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
    }
  }, [session, status, router]);
  useEffect(() => {
    // Listar usuários via Neon Auth
    fetch('/api/neon-auth/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSaveUser = async () => {
    try {
      const method = editMode ? 'PUT' : 'POST';
      const url = editMode ? `/api/neon-auth/users/${selectedUser.id}` : '/api/neon-auth/users';
      const body = { ...formData };
      if (!editMode && !body.password) {
        showSnackbar('Senha obrigatória.', 'error');
        return;
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showSnackbar(editMode ? 'Editado com sucesso.' : 'Criado com sucesso.', 'success');
        setModalOpen(false);
        // Atualiza tabela
        const updated = await fetch('/api/neon-auth/users').then(r => r.json());
        setUsers(updated.users || []);
      } else {
        showSnackbar('Erro ao salvar usuário.', 'error');
      }
    } catch {
      showSnackbar('Erro ao salvar usuário.', 'error');
    }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      const res = await fetch(`/api/neon-auth/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: user.status === 'Ativo' ? 'Inativo' : 'Ativo' }),
      });
      if (res.ok) {
        showSnackbar('Status alterado.', 'success');
        const updated = await fetch('/api/neon-auth/users').then(r => r.json());
        setUsers(updated.users || []);
      } else {
        showSnackbar('Erro ao alterar status.', 'error');
      }
    } catch {
      showSnackbar('Erro ao alterar status.', 'error');
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!window.confirm('Deseja realmente excluir este usuário?')) return;
    try {
      const res = await fetch(`/api/neon-auth/users/${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        showSnackbar('Usuário excluído.', 'success');
        const updated = await fetch('/api/neon-auth/users').then(r => r.json());
        setUsers(updated.users || []);
      } else {
        showSnackbar('Erro ao excluir usuário.', 'error');
      }
    } catch {
      showSnackbar('Erro ao excluir usuário.', 'error');
    }
  };

  // Definição das colunas para o DataGrid
  const tableColumns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Nome', width: 200 },
    { field: 'email', headerName: 'Email', width: 250 },
    { field: 'status', headerName: 'Status', width: 150 },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 220,
      renderCell: (params: any) => {
        const user = users.find((u: any) => u.id === params.row.id);
        if (!user) return null;
        return (
          <>
            <IconButton color="primary" onClick={() => handleOpenModal(user)}>
              <Edit />
            </IconButton>
            <IconButton color={user.status === 'Ativo' ? 'warning' : 'success'} onClick={() => handleToggleStatus(user)}>
              {user.status === 'Ativo' ? <ToggleOff /> : <ToggleOn />}
            </IconButton>
            <IconButton color="error" onClick={() => handleDeleteUser(user)}>
              <Delete />
            </IconButton>
          </>
        );
      },
    },
  ];

  // Adaptação dos dados para o DataGrid
  const tableData = users.map((user: any) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status || 'Ativo',
  }));

  return (
    <>
      <Card sx={{ p: 4 }}>
        <Typography variant="h5">Usuários (Superadmin)</Typography>
        <Button variant="contained" color="primary" sx={{ mt: 2, mb: 2 }} onClick={() => handleOpenModal()}>
          Criar Usuário
        </Button>
        {loading ? (
          <Typography variant="body1">Carregando...</Typography>
        ) : (
          <List>
            {users.length === 0 ? (
              <ListItem><ListItemText primary="Nenhum usuário encontrado." /></ListItem>
            ) : (
              users.map((user: any) => (
                <ListItem key={user.id}>
                  <ListItemText primary={user.name} secondary={user.email} />
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
      <Dialog open={modalOpen} onClose={handleCloseModal}>
        <DialogTitle>{editMode ? 'Editar Usuário' : 'Criar Usuário'}</DialogTitle>
        <DialogContent sx={{ minWidth: 350 }}>
          <TextField
            margin="dense"
            label="Nome"
            name="name"
            fullWidth
            value={formData.name}
            onChange={handleFormChange}
          />
          <TextField
            margin="dense"
            label="E-mail"
            name="email"
            type="email"
            fullWidth
            value={formData.email}
            onChange={handleFormChange}
          />
          <TextField
            margin="dense"
            label="Empresa"
            name="company"
            fullWidth
            value={formData.company}
            onChange={handleFormChange}
          />
          <TextField
            margin="dense"
            label="WhatsApp"
            name="whatsapp"
            fullWidth
            value={formData.whatsapp}
            onChange={handleFormChange}
            inputProps={{ maxLength: 16 }}
            placeholder="+55 DDD Número"
          />
          {!editMode && (
            <TextField
              margin="dense"
              label="Senha"
              name="password"
              type="password"
              fullWidth
              value={formData.password}
              onChange={handleFormChange}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancelar</Button>
          <Button onClick={handleSaveUser} variant="contained" color="primary">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
    </>
  );
}