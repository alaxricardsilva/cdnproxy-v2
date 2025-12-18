"use client";
// Remover NextAuth e migrar para SuperTokens
import { useEffect, useState } from "react";
import { Card, Typography, CircularProgress } from "@mui/material";
import Grid from '@mui/material/Grid';
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import { QRCodeCanvas } from "qrcode.react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../utils/supabase/client";

export default function SuperAdminProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<any>({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success'|'error'>("success");
  const [twoFA, setTwoFA] = useState<{ enabled: boolean; otpauth_url?: string } | null>(null);
  const [twoFACode, setTwoFACode] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Verifica sessão via SuperTokens
    fetch("/api/auth/session").then(res => res.json()).then(data => {
      if (!data.loggedIn) {
        router.push("/auth/login");
      }
    });
  }, [router]);

  useEffect(() => {
    fetch("/api/superadmin/profile")
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setForm(data || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Verifica status do 2FA
    fetch("/api/neon-auth/2fa-status")
      .then(res => res.json())
      .then(data => setTwoFA({ enabled: data.enabled, otpauth_url: data.otpauth_url }))
      .catch(() => setTwoFA({ enabled: false }));
  }, []);

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const res = await fetch("/api/superadmin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSnackbarMessage("Perfil salvo com sucesso.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setEditMode(false);
        const updated = await res.json();
        setProfile(updated);
        setForm(updated);
      } else {
        setSnackbarMessage("Erro ao salvar perfil.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch {
      setSnackbarMessage("Erro ao salvar perfil.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleGenerate2FA = async () => {
    setQrLoading(true);
    setQrError("");
    try {
      const res = await fetch("/api/neon-auth/generate-2fa-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile?.email }),
      });
      const data = await res.json();
      if (data.otpauth_url) {
        setTwoFA({ enabled: false, otpauth_url: data.otpauth_url });
      } else {
        setQrError("Erro ao gerar QR Code.");
      }
    } catch {
      setQrError("Erro ao gerar QR Code.");
    } finally {
      setQrLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    setQrLoading(true);
    setQrError("");
    try {
      const res = await fetch("/api/neon-auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile?.email, code: twoFACode }),
      });
      const data = await res.json();
      if (data.success) {
        setSnackbarMessage("2FA ativado com sucesso!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setTwoFA({ enabled: true });
      } else {
        setQrError("Código inválido. Tente novamente.");
      }
    } catch {
      setQrError("Erro ao verificar código.");
    } finally {
      setQrLoading(false);
    }
  };

  return (
    <Grid container justifyContent="center" alignItems="center" style={{ minHeight: "80vh" }}>
      <Grid
        size={{
          xs: 12,
          md: 6
        }}>
        <Card style={{ padding: 32, background: "#18181b", color: "#fff", borderRadius: 16 }}>
          <Typography variant="h5" gutterBottom>Perfil (Superadmin)</Typography>
          {loading ? (
            <Grid container justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
              <CircularProgress color="inherit" />
            </Grid>
          ) : profile ? (
            editMode ? (
              <form>
                {Object.keys(form).map((key) => (
                  <TextField
                    key={key}
                    label={key}
                    name={key}
                    value={form[key] ?? ""}
                    onChange={handleFormChange}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                  />
                ))}
                <Button variant="contained" color="primary" onClick={handleSave} style={{ marginTop: 16 }}>
                  Salvar
                </Button>
                <Button variant="outlined" color="secondary" onClick={() => setEditMode(false)} style={{ marginLeft: 8, marginTop: 16 }}>
                  Cancelar
                </Button>
              </form>
            ) : (
              <>
                {Object.keys(profile).map((key) => (
                  <Typography key={key} variant="body1" style={{ marginBottom: 8 }}>
                    <strong>{key}:</strong> {profile[key]}
                  </Typography>
                ))}
                <Button variant="contained" color="primary" onClick={() => setEditMode(true)} style={{ marginTop: 16 }}>
                  Editar Perfil
                </Button>
              </>
            )
          ) : (
            <Typography variant="body1">Nenhum dado de perfil encontrado.</Typography>
          )}
        </Card>
        <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)}>
          <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: "100%" }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
        <Divider sx={{ my: 4 }} />
        <Box>
          <Typography variant="h6" gutterBottom>Autenticação em Dois Fatores (2FA)</Typography>
          {twoFA?.enabled ? (
            <Alert severity="success">2FA está ativado para sua conta.</Alert>
          ) : (
            <Box>
              {twoFA?.otpauth_url ? (
                <Box>
                  <Typography variant="body1" gutterBottom>Escaneie o QR Code abaixo com seu aplicativo autenticador (Google Authenticator, Authy, etc):</Typography>
                  <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
                    <QRCodeCanvas value={twoFA.otpauth_url} size={180} />
                  </Box>
                  <TextField
                    label="Código do aplicativo"
                    value={twoFACode}
                    onChange={e => setTwoFACode(e.target.value)}
                    fullWidth
                    margin="normal"
                  />
                  <Button variant="contained" color="success" onClick={handleVerify2FA} disabled={qrLoading || !twoFACode} sx={{ mt: 2 }}>
                    {qrLoading ? <CircularProgress size={24} /> : "Confirmar 2FA"}
                  </Button>
                  {qrError && <Alert severity="error" sx={{ mt: 2 }}>{qrError}</Alert>}
                </Box>
              ) : (
                <Button variant="contained" color="primary" onClick={handleGenerate2FA} disabled={qrLoading} sx={{ mt: 2 }}>
                  {qrLoading ? <CircularProgress size={24} /> : "Ativar 2FA"}
                </Button>
                )}
            </Box>
          )}
        </Box>
        <Divider sx={{ my: 4 }} />
        <Box>
          <Typography variant="h6" gutterBottom>Autenticação Multi-Fator (MFA - TOTP)</Typography>
          {mfa?.enabled ? (
            <Alert severity="success">MFA (TOTP) está ativado para sua conta.</Alert>
          ) : (
            <Box>
              {mfa?.qr ? (
                <Box>
                  <Typography variant="body1" gutterBottom>Escaneie o QR Code abaixo com seu aplicativo autenticador (Google Authenticator, Authy, etc):</Typography>
                  <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
                    <QRCodeCanvas value={mfa.qr} size={180} />
                  </Box>
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
                </Box>
              ) : (
                <Button variant="contained" color="primary" onClick={handleEnableMfa} disabled={qrLoading} sx={{ mt: 2 }}>
                  {qrLoading ? <CircularProgress size={24} /> : "Ativar MFA"}
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Grid>
    </Grid>
  );
}


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
    } catch {
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
        setSnackbarMessage("MFA ativado com sucesso!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
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