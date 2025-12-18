"use client";
import { useEffect, useState } from 'react';
import { Card, Typography } from '@mui/material';

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
    </Card>
  );
}