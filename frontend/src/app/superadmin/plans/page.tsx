"use client";
import { useEffect, useState } from 'react';
import { Card, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Definição do tipo Plan fora do componente
interface Plan {
  id: number;
  name: string;
  price: number;
  description: string;
}

export default function SuperadminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/superadmin/plans')
      .then(res => res.json())
      .then(data => {
        setPlans(data.plans || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Definição das colunas para o DataGrid
  const tableColumns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Nome', width: 200 },
    { field: 'price', headerName: 'Preço', width: 120 },
    { field: 'description', headerName: 'Descrição', width: 250 },
  ];

  // Mapeamento dos dados dos planos para o formato esperado pelo DataGrid
  const tableData = plans.map((plan, idx) => ({
    id: plan.id ?? idx,
    name: plan.name ?? '',
    price: plan.price ?? '',
    description: plan.description ?? '',
  }));

  return (
    <Card sx={{ p: 4 }}>
      <Typography variant="h5">Planos (Superadmin)</Typography>
      {loading ? (
        <Typography variant="body1">Carregando...</Typography>
      ) : (
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
      )}
      <ToastContainer />
    </Card>
  );
}