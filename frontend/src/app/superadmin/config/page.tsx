"use client";
import { useEffect, useState } from 'react';
import { Card, Typography, List, ListItem, ListItemText, Box } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, Snackbar, Alert } from '@mui/material';
import Grid from '@mui/material/Grid';

export default function SuperadminConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<any>({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success'|'error'>('success');

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

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/superadmin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSnackbarMessage('Configuração salva com sucesso.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setEditMode(false);
        const updated = await res.json();
        setConfig(updated);
        setForm(updated);
      } else {
        setSnackbarMessage('Erro ao salvar configuração.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch {
      setSnackbarMessage('Erro ao salvar configuração.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  return (
    <Grid container justifyContent="center" alignItems="center" style={{ minHeight: '80vh' }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card style={{ padding: 32, background: '#18181b', color: '#fff', borderRadius: 16 }}>
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
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={() => setSnackbarOpen(false)}
          message={snackbarMessage}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        />
      </Grid>
    </Grid>
  );
}