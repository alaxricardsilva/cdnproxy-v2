import { Card, Typography } from '@mui/material';

export default function AdminPixPage() {
  return (
    <Card sx={{ p: 4 }}>
      <Typography variant="h5">PIX (Admin)</Typography>
      <Typography variant="body1">Página para gerenciar pagamentos via PIX.</Typography>
    </Card>
  );
}