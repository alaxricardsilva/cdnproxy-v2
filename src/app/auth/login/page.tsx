"use client";
// Remover NextAuth e migrar para SuperTokens
import { useState } from "react";
import { Button, TextField, Typography, Card, Box, CircularProgress, Checkbox, FormControlLabel } from "@mui/material";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Estado para controlar se deve mostrar o campo 2FA
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const router = useRouter();
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Primeiro passo: autenticar email/senha via SuperTokens
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = await res.json();
    setLoading(false);
    if (result.status === "WRONG_CREDENTIALS_ERROR") {
      setError("Credenciais inválidas ou 2FA necessário.");
      // Se o usuário tiver 2FA habilitado, mostrar campo 2FA
      if (result.twoFactorRequired) {
        setShow2FA(true);
      }
      return;
    }
    if (result.status === "OK") {
      localStorage.setItem("jwt", result.token);
      console.log("[LOGIN] JWT salvo:", result.token);
      router.push("/");
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Segundo passo: enviar código 2FA
    const res = await fetch("/api/auth/verify-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, twoFactorCode }),
    });
    const result = await res.json();
    setLoading(false);
    if (result.status === "INVALID_2FA_CODE") {
      setError("Código 2FA inválido.");
      return;
    }
    if (result.status === "OK") {
      router.push("/");
    }
  };

  // Função para submissão do formulário
  const handleSubmit = show2FA ? handle2FASubmit : handleLogin;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)' }}>
      <Card sx={{ p: 4, borderRadius: 4, boxShadow: 8, maxWidth: 400, width: '100%', backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <img src="/cdnproxy-logo.svg" alt="CDN Proxy Logo" style={{ width: 64, marginBottom: 8, borderRadius: 8, boxShadow: '0 2px 8px #000' }} />
          <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 1, textShadow: '0 2px 8px #000' }}>CDN Proxy</Typography>
        </Box>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            variant="filled"
            fullWidth
            margin="normal"
            InputProps={{ style: { color: '#fff', background: 'rgba(255,255,255,0.05)' } }}
            InputLabelProps={{ style: { color: '#fff' } }}
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
          <TextField
            label="Senha"
            type="password"
            variant="filled"
            fullWidth
            margin="normal"
            InputProps={{ style: { color: '#fff', background: 'rgba(255,255,255,0.05)' } }}
            InputLabelProps={{ style: { color: '#fff' } }}
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {show2FA && (
            <TextField
              label="Código 2FA"
              variant="filled"
              fullWidth
              margin="normal"
              InputProps={{ style: { color: '#fff', background: 'rgba(255,255,255,0.05)' } }}
              InputLabelProps={{ style: { color: '#fff' } }}
              value={twoFactorCode}
              onChange={e => setTwoFactorCode(e.target.value)}
              autoComplete="one-time-code"
            />
          )}
          <FormControlLabel
            control={<Checkbox checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} sx={{ color: '#fff' }} />}
            label={<Typography sx={{ color: '#fff' }}>Lembrar de mim</Typography>}
            sx={{ mt: 1 }}
          />
          <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading} sx={{ mt: 2, fontWeight: 700, fontSize: 16, boxShadow: 4 }}>
            {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : "Entrar"}
          </Button>
          {error && <Typography color="error" align="center" sx={{ mt: 2 }}>{error}</Typography>}
        </form>
        <Typography align="center" sx={{ mt: 3, color: '#fff', opacity: 0.7, fontSize: 14 }}>
          Autenticação via SuperTokens com 2FA integrada.
        </Typography>
      </Card>
    </Box>
  );
}