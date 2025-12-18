"use client";
// Remover NextAuth e migrar para SuperTokens
import React, { useEffect, useState } from "react";
import { Card, Typography, Grid, TextField, Button, Snackbar, Alert, CircularProgress } from "@mui/material";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../utils/supabase/client";

const supabase = createClient();
export default function AdminProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const router = useRouter();
  const [mfa, setMfa] = useState<{ enabled: boolean; qr?: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");

  useEffect(() => {
    // Verifica sessão via SuperTokens
    const jwt = localStorage.getItem("jwt");
    fetch("/api/auth/session", {
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : {}
    })
      .then(res => {
        if (!res.ok) throw new Error("Sessão inválida");
        return res.json();
      })
      .then(data => {
        if (!data.loggedIn) {
          router.push("/auth/login");
        }
      })
      .catch(() => {
        router.push("/auth/login");
      });
  }, [router]);

  useEffect(() => {
    const jwt = localStorage.getItem("jwt");
    fetch("/api/admin/profile", {
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : {}
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar perfil");
        return res.json();
      })
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => {
        setSnackbar({ open: true, message: "Erro ao carregar perfil", severity: "error" });
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    // Verifica sessão via Supabase Auth
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/auth/login");
      }
    });
  }, [router, supabase]);

  useEffect(() => {
    // Busca status do MFA (TOTP) via Supabase
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.find(f => f.factorType === "totp" && f.status === "verified");
      setMfa({ enabled: !!totp });
    });
  }, [supabase]);

  const handleEnableMfa = async () => {
    setQrLoading(true);
    setQrError("");
    try {
      const { data, error } = await supabase.auth.mfa.create({ factorType: "totp" });
      if (data?.totp?.qr_code) {
        setMfa({ enabled: false, qr: data.totp.qr_code });
      } else {
        setQrError(error?.message || "Erro ao gerar QR Code.");
      }
    } catch (err) {
      setQrError("Erro ao gerar QR Code.");
    } finally {
      setQrLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    setQrLoading(true);
    setQrError("");
    try {
      const { data, error } = await supabase.auth.mfa.verify({ factorType: "totp", code: mfaCode });
      if (data?.totp?.status === "verified") {
        setSnackbar({ open: true, message: "MFA ativado com sucesso!", severity: "success" });
        setMfa({ enabled: true });
      } else {
        setQrError(error?.message || "Código inválido. Tente novamente.");
      }
    } catch {
      setQrError("Erro ao verificar código.");
    } finally {
      setQrLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setProfile((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {})
        },
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
          <Grid container justifyContent="center" alignItems="center" style={{ marginTop: 32 }}>
            <Typography variant="h6" gutterBottom>Autenticação Multi-Fator (MFA - TOTP)</Typography>
            {mfa?.enabled ? (
              <Alert severity="success">MFA (TOTP) está ativado para sua conta.</Alert>
            ) : (
              <Grid>
                {mfa?.qr ? (
                  <Grid>
                    <Typography variant="body1" gutterBottom>Escaneie o QR Code abaixo com seu aplicativo autenticador (Google Authenticator, Authy, etc):</Typography>
                    <Grid container justifyContent="center" style={{ margin: "16px 0" }}>
                      <QRCodeCanvas value={mfa.qr} size={180} />
                    </Grid>
                    <TextField
                      label="Código do aplicativo"
                      value={mfaCode}
                      onChange={e => setMfaCode(e.target.value)}
                      fullWidth
                      margin="normal"
                    />
                    <Button variant="contained" color="success" onClick={handleVerifyMfa} disabled={qrLoading || !mfaCode} sx={{ mt: 2 }}>
                      {qrLoading ? <CircularProgress size={24} /> : "Confirmar MFA"}
                    </Button>
                    {qrError && <Alert severity="error" sx={{ mt: 2 }}>{qrError}</Alert>}
                  </Grid>
                ) : (
                  <Button variant="contained" color="primary" onClick={handleEnableMfa} disabled={qrLoading} sx={{ mt: 2 }}>
                    {qrLoading ? <CircularProgress size={24} /> : "Ativar MFA"}
                  </Button>
                )}
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