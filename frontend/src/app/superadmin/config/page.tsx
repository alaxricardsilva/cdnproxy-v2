"use client";
import { useEffect, useState } from 'react';
import { Card, Typography, List, ListItem, ListItemText, Box } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, Snackbar, Alert } from '@mui/material';
import Grid from '@mui/material/Grid';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function SuperadminConfigPage() {
  const [config, setConfig] = useState<Record<string, string | number | boolean> | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});

  // Definição do DataGrid
  const tableData = config ? Object.entries(config).map(([key, value]) => ({ id: key, key, value })) : [];
  const tableColumns: GridColDef[] = [
    { field: 'key', headerName: 'Chave', flex: 1 },
    { field: 'value', headerName: 'Valor', flex: 2 },
  ];
  useEffect(() => {
    fetch('/api/superadmin/config')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setForm(data || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/superadmin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Configuração salva com sucesso.');
        setEditMode(false);
        const updated = await res.json();
        setConfig(updated);
        setForm(updated);
      } else {
        toast.error('Erro ao salvar configuração.');
      }
    } catch {
      toast.error('Erro ao salvar configuração.');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  // Função handleDelete removida

  return (
    <Grid container justifyContent="center" alignItems="center" style={{ minHeight: '80vh' }}>
      <Grid item xs={12} md={6}>
        <Card style={{ padding: 32, background: '#18181b', color: '#fff', borderRadius: 16 }}>
          <ToastContainer />
          <Typography variant="h5" gutterBottom>Configurações (Superadmin)</Typography>
          {loading ? (
            <Typography variant="body1">Carregando...</Typography>
          ) : config ? (
            editMode ? (
              <form>
                {Object.keys(form).map((key) => (
                  <TextField
                    key={key}
                    label={key}
                    name={key}
                    value={form[key] ?? ''}
                    onChange={handleFormChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                  />
                ))}
                <Button variant="contained" color="primary" onClick={handleSave} style={{ marginTop: 16 }}>
                  Salvar
                </Button>
                <Button variant="outlined" color="secondary" onClick={() => setEditMode(false)} style={{ marginLeft: 8, marginTop: 16 }}>
                  Cancelar
                </Button>
              </form>
            ) : (
              <>
                {Object.keys(config).map((key) => (
                  <Box key={key} mb={2}>
                    <Typography variant="subtitle2">{key}</Typography>
                    <Typography variant="body2">{String(config[key])}</Typography>
                  </Box>
                ))}
                <Button variant="contained" color="primary" onClick={() => setEditMode(true)}>
                  Editar
                </Button>
              </>
            )
          ) : (
            <Typography variant="body1">Erro ao carregar configurações.</Typography>
          )}
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
  );
}