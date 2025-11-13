"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button, TextField, Typography, Card, Box, CircularProgress, Checkbox, FormControlLabel } from "@mui/material";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { data: session, status } = useSession();
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
    // Primeiro passo: autenticar email/senha
    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    // Se o usuário tiver 2FA habilitado, mostrar campo 2FA
    if (result?.ok === false && result?.status === 2) {
      setShow2FA(true);
      return;
    }
    // Se não precisar de 2FA, redirecionar normalmente
    if (result?.ok) {
      // Forçar atualização da sessão após login
      await fetch("/api/auth/session");
      router.push("/");
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Segundo passo: enviar código 2FA
    const result = await signIn("credentials", {
      redirect: true,
      email,
      password,
      twoFactorCode,
    });
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    if (result?.ok) {
      await fetch("/api/auth/session");
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
          Autenticação via NextAuth.js com 2FA integrada.
        </Typography>
      </Card>
    </Box>
  );
}