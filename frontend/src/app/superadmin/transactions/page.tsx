"use client";
import { useEffect, useState } from 'react';
import { Card, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

export default function SuperadminTransactionsPage() {
  type Transaction = {
    id: number|string;
    amount?: string|number;
    status?: string;
    info?: string;
  };
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/superadmin/transactions')
      .then(res => res.json())
      .then(data => {
        setTransactions(data.transactions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Definição das colunas para o DataGrid
  const tableColumns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'amount', headerName: 'Valor', width: 120 },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'info', headerName: 'Info', width: 250 },
  ];

  // Mapeamento dos dados das transações para o formato esperado pelo DataGrid
  const tableData = transactions.map((tx, idx) => ({
    id: tx.id ?? idx,
    amount: tx.amount ?? '',
    status: tx.status ?? '',
    info: tx.info ?? '',
  }));

  return (
    <Card sx={{ p: 4 }}>
      <Typography variant="h5">Transações (Superadmin)</Typography>
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
        sx={{ bgcolor: '#18181b', color: '#fff', borderRadius: 3 }}
      />
    </Card>
  );
}