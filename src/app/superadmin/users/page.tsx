"use client";
import { useEffect, useState } from "react";
import { Card, Typography, Button, Snackbar, Alert, CircularProgress, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from "@mui/material";
import { Edit, Delete, ToggleOn, ToggleOff } from '@mui/icons-material';
import { useRouter } from "next/navigation";
import { createClient } from "../../../../utils/supabase/client";

export default function SuperAdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success'|'error'>("success");
  const router = useRouter();

  useEffect(() => {
    // Verifica sessão via Supabase Auth
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/auth/login");
      }
    });
  }, [router]);

  useEffect(() => {
    // Listar usuários via Supabase Admin API
    async function fetchUsers() {
      setLoading(true);
      try {
        const supabase = createClient();
        // Busca usuários do Supabase Auth
        const { data, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;
        setUsers(data.users || []);
      } catch (err) {
        setSnackbarMessage("Erro ao carregar usuários.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
      setLoading(false);
    }
    fetchUsers();
  }, []);

  const handleSaveUser = async () => {
    try {
      const supabase = createClient();
      let result;
      if (editMode) {
        // Editar usuário
        result = await supabase.auth.admin.updateUserById(selectedUser.id, {
          email: formData.email,
          user_metadata: {
            name: formData.name,
            company: formData.company,
            whatsapp: formData.whatsapp,
            role: formData.role
          }
        });
      } else {
        // Criar usuário
        result = await supabase.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          user_metadata: {
            name: formData.name,
            company: formData.company,
            whatsapp: formData.whatsapp,
            role: formData.role
          }
        });
      }
      if (result.error) throw result.error;
      setSnackbarMessage(editMode ? "Editado com sucesso." : "Criado com sucesso.");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setModalOpen(false);
      // Atualiza tabela
      const { data } = await supabase.auth.admin.listUsers();
      setUsers(data.users || []);
    } catch {
      setSnackbarMessage("Erro ao salvar usuário.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      const supabase = createClient();
      // Ativar/desativar usuário
      const result = await supabase.auth.admin.updateUserById(user.id, {
        banned: user.banned ? false : true
      });
      if (result.error) throw result.error;
      setSnackbarMessage("Status alterado.");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      const { data } = await supabase.auth.admin.listUsers();
      setUsers(data.users || []);
    } catch {
      setSnackbarMessage("Erro ao alterar status.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!window.confirm('Deseja realmente excluir este usuário?')) return;
    try {
      const supabase = createClient();
      const result = await supabase.auth.admin.deleteUser(user.id);
      if (result.error) throw result.error;
      setSnackbarMessage("Usuário excluído.");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      const { data } = await supabase.auth.admin.listUsers();
      setUsers(data.users || []);
    } catch {
      setSnackbarMessage("Erro ao excluir usuário.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  // Função para abrir o modal de criação/edição de usuário
  const handleOpenModal = (user?: any) => {
    if (user) {
      setEditMode(true);
      setSelectedUser(user);
      setFormData({ ...user });
    } else {
      setEditMode(false);
      setSelectedUser(null);
      setFormData({});
    }
    setModalOpen(true);
  };

  // Função para fechar o modal de usuário
  const handleCloseModal = () => {
    setModalOpen(false);
    setEditMode(false);
    setSelectedUser(null);
    setFormData({});
  };

  // Função para atualizar os dados do formulário
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
          <TextField
            margin="dense"
            label="Role"
            name="role"
            select
            fullWidth
            value={formData.role || "ADMIN"}
            onChange={handleFormChange}
          >
            <MenuItem value="SUPERADMIN">SUPERADMIN</MenuItem>
            <MenuItem value="ADMIN">ADMIN</MenuItem>
          </TextField>
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