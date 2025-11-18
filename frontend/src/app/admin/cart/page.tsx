"use client";
import { useEffect, useState } from 'react';
import { Card, Typography } from '@mui/material';

type CartItem = {
  id: string | number;
  name: string;
  status: string;
};

export default function AdminCartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/cart')
      .then(res => res.json())
      .then(data => {
        setCart(data.cart || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <Card sx={{ p: 4 }}>
      <Typography variant="h5">Carrinho de Domínios (Admin)</Typography>
      {loading ? (
        <Typography variant="body1">Carregando...</Typography>
      ) : (
        <ul>
          {cart.length === 0 ? (
            <li>Carrinho vazio.</li>
          ) : (
            cart.map((item: CartItem) => (
              <li key={item.id}>{item.name} - {item.status}</li>
            ))
          )}
        </ul>
      )}
    </Card>
  );
}
// Nenhum uso do Grid legacy encontrado neste arquivo.