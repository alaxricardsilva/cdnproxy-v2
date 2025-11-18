"use client";
import { useEffect, useState } from 'react';
import { Card, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { List, ListItem, ListItemText } from '@mui/material';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Payment {
  id: string;
  userName?: string;
  user?: string;
  amount: number;
  status?: string;
  createdAt?: string;
  // Adicione outros campos conforme necessário
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/payments')
      .then(res => res.json())
      .then(data => {
        setPayments(data.payments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Definição das colunas para o DataGrid
  const tableColumns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'user', headerName: 'Usuário', width: 200 },
    { field: 'amount', headerName: 'Valor', width: 120 },
    { field: 'status', headerName: 'Status', width: 150 },
    { field: 'createdAt', headerName: 'Data', width: 180 },
  ];

  // Adaptação dos dados para o DataGrid
  const tableData = payments.map((payment: Payment) => ({
    id: payment.id,
    user: payment.userName || payment.user || '-',
    amount: payment.amount,
    status: payment.status,
    createdAt: payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '-',
  }));

  return (
    <>
      <Card sx={{ p: 4 }}>
        <Typography variant="h5">Pagamentos (Admin)</Typography>
        {loading ? (
          <Typography variant="body1">Carregando...</Typography>
        ) : (
          <List>
            {payments.length === 0 ? (
              <ListItem><ListItemText primary="Nenhum pagamento encontrado." /></ListItem>
            ) : (
              payments.map((payment: any) => (
                <ListItem key={payment.id}>
                  <ListItemText primary={payment.userName || payment.user || '-'} secondary={`R$ ${payment.amount} - ${payment.status}`} />
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
      <ToastContainer />
    </>
  );
}