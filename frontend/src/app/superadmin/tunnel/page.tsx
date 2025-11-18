"use client";
import React, { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Snackbar, Alert, CircularProgress } from "@mui/material";
// Substituir Snackbar por react-toastify
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Tipos básicos para túnel e domínio
interface Tunnel {
  id: string;
  name: string;
  status: string;
  domains: Domain[];
}

interface Domain {
  id: string;
  name: string;
  status: string;
}

const TunnelPage: React.FC = () => {
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [selectedTunnel, setSelectedTunnel] = useState<Tunnel | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [form, setForm] = useState<{ name: string }>({ name: "" });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });

  // Buscar dados reais da API REST do backend
  useEffect(() => {
    const fetchTunnels = async () => {
      setLoading(true);
      try {
        // Substitua a URL abaixo pela rota real do backend
        const res = await fetch("/api/cloudflare/tunnels");
        if (!res.ok) throw new Error("Erro ao buscar túneis");
        const data = await res.json();
        setTunnels(data.tunnels || []);
      } catch (err: any) {
        setError(err.message || "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    };
    fetchTunnels();
  }, []);

  // Funções para abrir/fechar diálogos
  const handleOpenDialog = (mode: "add" | "edit", tunnel?: Tunnel, domain?: Domain) => {
    setDialogMode(mode);
    setSelectedTunnel(tunnel || null);
    setSelectedDomain(domain || null);
    setForm({ name: domain?.name || "" });
    setOpenDialog(true);
  };
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTunnel(null);
    setSelectedDomain(null);
    setForm({ name: "" });
  };

  // Função para adicionar/editar domínio
  const handleSaveDomain = async () => {
    try {
      // Substitua a URL e payload conforme a API real
      const url = dialogMode === "add"
        ? `/api/cloudflare/tunnel/${selectedTunnel?.id}/domain`
        : `/api/cloudflare/tunnel/${selectedTunnel?.id}/domain/${selectedDomain?.id}`;
      const method = dialogMode === "add" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name })
      });
      if (!res.ok) throw new Error("Erro ao salvar domínio");
      toast.success("Domínio salvo com sucesso!");
      handleCloseDialog();
      // Atualiza lista
      // Ideal: refetch ou atualizar localmente
    } catch (err: any) {
      toast.error(err.message || "Erro desconhecido");
    }
  };

  // Função para remover domínio
  const handleRemoveDomain = async (tunnelId: string, domainId: string) => {
    try {
      const res = await fetch(`/api/cloudflare/tunnel/${tunnelId}/domain/${domainId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover domínio");
      toast.success("Domínio removido com sucesso!");
      // Atualiza lista
    } catch (err: any) {
      toast.error(err.message || "Erro desconhecido");
    }
  };

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>Cloudflare Tunnel</Typography>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        tunnels.map(tunnel => (
          <Box key={tunnel.id} mb={4} border={1} borderRadius={2} p={2}>
            <Typography variant="h6">Túnel: {tunnel.name} ({tunnel.status})</Typography>
            <Button variant="contained" color="primary" onClick={() => handleOpenDialog("add", tunnel)} sx={{ mt: 2 }}>Adicionar Domínio</Button>
            <Box mt={2}>
              <Typography variant="subtitle1">Domínios:</Typography>
              {tunnel.domains.length === 0 ? (
                <Typography color="textSecondary">Nenhum domínio vinculado.</Typography>
              ) : (
                tunnel.domains.map(domain => (
                  <Box key={domain.id} display="flex" alignItems="center" mb={1}>
                    <Typography>{domain.name} ({domain.status})</Typography>
                    <Button size="small" sx={{ ml: 2 }} onClick={() => handleOpenDialog("edit", tunnel, domain)}>Editar</Button>
                    <Button size="small" color="error" sx={{ ml: 1 }} onClick={() => handleRemoveDomain(tunnel.id, domain.id)}>Remover</Button>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        ))
      )}

      {/* Diálogo para adicionar/editar domínio */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{dialogMode === "add" ? "Adicionar Domínio" : "Editar Domínio"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome do Domínio"
            fullWidth
            value={form.name}
            onChange={e => setForm({ name: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveDomain}>{dialogMode === "add" ? "Adicionar" : "Salvar"}</Button>
        </DialogActions>
      </Dialog>
      <ToastContainer />


    </Box>
  );
};

export default TunnelPage;