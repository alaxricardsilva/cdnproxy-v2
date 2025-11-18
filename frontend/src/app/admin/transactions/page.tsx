"use client";
import { useEffect, useState } from 'react';
import { Card, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/transactions')
      .then(res => res.json())
      .then(data => {
        setTransactions(data.transactions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Definição das colunas para o DataGrid
  const tableColumns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'info', headerName: 'Informação', width: 300 },
  ];

  // Adaptação dos dados para o DataGrid
  const tableData = transactions.map((tx: any) => ({
    id: tx.id,
    info: tx.info || '-',
  }));

  return (
    <Card sx={{ p: 4 }}>
      <Typography variant="h5">Transações (Admin)</Typography>
      {loading ? (
        <Typography variant="body1">Carregando...</Typography>
      ) : (
        <ul>
          {transactions.length === 0 ? (
            <li>Nenhuma transação encontrada.</li>
          ) : (
            transactions.map((tx: any) => (
              <li key={tx.id}>{tx.info}</li>
            ))
          )}
        </ul>
      )}
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
    </Card>
  );
}