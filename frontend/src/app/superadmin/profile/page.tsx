"use client";
import React, { useEffect, useState } from "react";
import { Card, Typography, Grid, TextField, Button, Snackbar, Alert, CircularProgress } from "@mui/material";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../utils/supabase/client";
import QRCode from "qrcode";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const supabase = createClient();
interface SuperAdminProfile {
  id: number;
  email: string;
  name: string;
  password?: string;
}

interface MFAStatus {
  enabled: boolean;
  qr?: string;
}

function SuperAdminProfile() {
  const [profile, setProfile] = useState<SuperAdminProfile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const router = useRouter();
  const [mfa, setMfa] = useState<MFAStatus | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const [challengeId, setChallengeId] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [qrSvg, setQrSvg] = useState<string>("");

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
    fetch("/api/superadmin/profile", {
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
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/auth/login");
      }
    });
  }, [router, supabase]);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.all?.find(f => f.factor_type === "totp" && f.status === "verified");
      setMfa({ enabled: !!totp });
    });
  }, [supabase]);

  const handleEnableMfa = async () => {
    setQrLoading(true);
    setQrError("");
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (data?.totp?.qr_code && data?.id) {
        setMfa({ enabled: false, qr: data.totp.qr_code });
        setFactorId(data.id);
        // Criar challenge para obter challengeId
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: data.id });
        if (challengeData?.id) {
          setChallengeId(challengeData.id);
        } else {
          setQrError(challengeError?.message || "Erro ao gerar challenge.");
        }
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
      const { data, error } = await supabase.auth.mfa.verify({ factorId, challengeId, code: mfaCode });
      if (!error) {
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

  const handleChange = (field: keyof SuperAdminProfile, value: string) => {
    setProfile((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch("/api/superadmin/profile", {
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

  useEffect(() => {
    if (mfa?.qr) {
      QRCode.toString(mfa.qr, { type: 'svg', width: 180 }, (err, svg) => {
        if (!err && svg) setQrSvg(svg);
      });
    } else {
      setQrSvg("");
    }
  }, [mfa?.qr]);

  if (loading) {
    return (
      <Grid container justifyContent="center" alignItems="center" style={{ minHeight: "60vh" }}>
        <CircularProgress />
      </Grid>
    );
  }

  return (
    <>
      <Grid container justifyContent="center" alignItems="center" style={{ minHeight: "80vh" }}>
        <Grid item xs={12} md={6}>
          <Card elevation={6} style={{ borderRadius: 16, background: "#181A20", color: "#fff", padding: 32 }}>
            <Typography variant="h5" gutterBottom>
              Perfil do SuperAdmin
            </Typography>
            <Grid container spacing={2}>
              {profile && Object.entries(profile).map(([key, value]) => (
                <Grid item xs={12} key={key}>
                  <TextField
                    label={key}
                    value={value}
                    onChange={(e) => handleChange(key as keyof SuperAdminProfile, e.target.value)}
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
              <Grid item>
                <Button variant="contained" color="primary" onClick={() => setEditMode((v) => !v)} disabled={saving}>
                  {editMode ? "Cancelar" : "Editar"}
                </Button>
              </Grid>
              {editMode && (
                <Grid item>
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
                <Grid item>
                  {mfa?.qr ? (
                    <Grid item>
                      <Typography variant="body1" gutterBottom>Escaneie o QR Code abaixo com seu aplicativo autenticador (Google Authenticator, Authy, etc):</Typography>
                      <Grid container justifyContent="center" style={{ margin: "16px 0" }}>
                        {/* Novo componente para exibir QR Code SVG */}
                        {qrSvg && (
                          <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
                        )}
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
    </>
  );
}
export default SuperAdminProfile;