"use client";
import { useEffect, useState } from 'react';
import { Card, Typography, Box, Button } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function formatSize(bytes: number) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' B';
}

export default function SuperadminDatabasePage() {
  const [dbInfo, setDbInfo] = useState<{ tables?: Array<{ name: string; size: number; protected: boolean }>; totalSize?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaningTable, setCleaningTable] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/superadmin/database')
      .then(res => res.json())
      .then(data => {
        setDbInfo(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCleanTable = async (tableName: string) => {
    setCleaningTable(tableName);
    await fetch(`/api/superadmin/database/clean/${tableName}`, { method: 'POST' });
    // Atualiza os dados após limpeza
    fetch('/api/superadmin/database')
      .then(res => res.json())
      .then(data => {
        setDbInfo(data);
        setCleaningTable(null);
      })
      .catch(() => setCleaningTable(null));
  };

  // Colunas do DataGrid
  const tableColumns = [
    { field: 'name', headerName: 'Tabela', width: 200 },
    { field: 'size', headerName: 'Tamanho', width: 150 },
    { field: 'protected', headerName: 'Protegido', width: 120, renderCell: (params: any) => params.value ? 'Sim' : 'Não' },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 150,
      renderCell: (params: any) =>
        !params.row.protected ? (
          <Button
            variant="contained"
            color="warning"
            size="small"
            disabled={cleaningTable === params.row.name}
            onClick={() => handleCleanTable(params.row.name)}
          >
            {cleaningTable === params.row.name ? 'Limpando...' : 'Limpar Dados'}
          </Button>
        ) : (
          <Typography variant="caption" color="text.secondary">Protegido</Typography>
        )
    }
  ];

  // Dados para o DataGrid
  const tableData = dbInfo?.tables?.map((table: any) => ({
    id: table.name,
    name: table.name,
    size: formatSize(table.size),
    protected: table.protected,
  })) || [];

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Banco de Dados (Superadmin)</Typography>
      {loading ? (
        <Typography variant="body1">Carregando...</Typography>
      ) : dbInfo ? (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Card sx={{ flex: 1, minWidth: 220, p: 3, bgcolor: '#18181b', color: '#fff' }}>
            <Typography variant="h6">Tamanho Total</Typography>
            <Typography variant="h4">{formatSize(typeof dbInfo.totalSize === 'number' ? dbInfo.totalSize : 0)}</Typography>
          </Card>
          <Card sx={{ flex: 1, minWidth: 220, p: 3, bgcolor: '#18181b', color: '#fff' }}>
            <Typography variant="h6">Total de Tabelas</Typography>
            <Typography variant="h4">{dbInfo.tables?.length || 0}</Typography>
          </Card>
        </Box>
      ) : (
        <Typography variant="body1">Erro ao carregar dados do banco.</Typography>
      )}
      <Box sx={{ mt: 2 }}>
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
            '& .MuiDataGrid-row.Mui-selected': {
              backgroundColor: '#00bcd4',
              color: '#18181b',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#23232b',
              color: '#bdbdbd',
              fontWeight: 'bold',
              fontSize: '1rem',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #23232b',
            },
          }}
        />
      </Box>
    </Box>
  );
}
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (type === 'success') toast.success(message);
  else toast.error(message);
};

// Removido: função handleDelete, tipo Database e array columns duplicados do final do arquivo
// ... existing code ...
// Removido: função handleDelete, tipo Database e array columns duplicados do final do arquivo
// ... existing code ...