"use client";
import React, { useEffect, useState } from "react";
import { Card, Typography, Grid, TextField, Button, Snackbar, Alert, CircularProgress } from "@mui/material";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => {
        setSnackbar({ open: true, message: "Erro ao carregar perfil", severity: "error" });
        setLoading(false);
      });
  }, []);

  const handleChange = (field: string, value: string) => {
    setProfile((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setSnackbar({ open: true, message: "Perfil atualizado com sucesso", severity: "success" });
        setEditMode(false);
      } else {
        throw new Error();
      }
    } catch {
      setSnackbar({ open: true, message: "Erro ao atualizar perfil", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Grid container justifyContent="center" alignItems="center" style={{ minHeight: "60vh" }}>
        <CircularProgress />
      </Grid>
    );
  }

  return (
    <Grid container justifyContent="center" alignItems="center" style={{ minHeight: "80vh" }}>
      <Grid
        size={{
          xs: 12,
          md: 6
        }}>
        <Card elevation={6} style={{ borderRadius: 16, background: "#181A20", color: "#fff", padding: 32 }}>
          <Typography variant="h5" gutterBottom>
            Perfil do Admin
          </Typography>
          <Grid container spacing={2}>
            {profile && Object.entries(profile).map(([key, value]) => (
              <Grid key={key} size={12}>
                <TextField
                  label={key}
                  value={value}
                  onChange={(e) => handleChange(key, e.target.value)}
                  fullWidth
                  disabled={!editMode}
                  variant="outlined"
                  InputProps={{ style: { color: "#fff" } }}
                  InputLabelProps={{ style: { color: "#bbb" } }}
                />
              </Grid>
            ))}
          </Grid>
          <Grid container spacing={2} justifyContent="flex-end" style={{ marginTop: 24 }}>
            <Grid>
              <Button variant="contained" color="primary" onClick={() => setEditMode((v) => !v)} disabled={saving}>
                {editMode ? "Cancelar" : "Editar"}
              </Button>
            </Grid>
            {editMode && (
              <Grid>
                <Button variant="contained" color="success" onClick={handleSave} disabled={saving}>
                  {saving ? <CircularProgress size={24} /> : "Salvar"}
                </Button>
              </Grid>
            )}
          </Grid>
        </Card>
      </Grid>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Grid>
  );
}