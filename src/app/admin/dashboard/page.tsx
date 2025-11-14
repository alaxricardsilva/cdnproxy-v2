"use client";
import { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { useRouter } from "next/navigation";

const defaultData = {
  totalDomains: 0,
  activeDomains: 0,
  expiringDomains: 0,
};

export default function AdminDashboardDetail({ data }: { data?: any }) {
  const router = useRouter();
  useEffect(() => {
    // Verifica sessão via SuperTokens
    fetch("/api/auth/session").then(res => res.json()).then(data => {
      if (!data.loggedIn) {
        router.push("/auth/login");
      }
    });
  }, [router]);
  const safeData = data || defaultData;
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ p: 3, background: "#18181b", color: "#fff", borderRadius: 3 }}>
          <Typography variant="h6">Total de Domínios</Typography>
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>{safeData.totalDomains}</Typography>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ p: 3, background: "#18181b", color: "#fff", borderRadius: 3 }}>
          <Typography variant="h6">Domínios Ativos</Typography>
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>{safeData.activeDomains}</Typography>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ p: 3, background: "#18181b", color: "#fff", borderRadius: 3 }}>
          <Typography variant="h6">Expirando em 7 dias</Typography>
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>{safeData.expiringDomains}</Typography>
        </Card>
      </Grid>
    </Grid>
  );
}