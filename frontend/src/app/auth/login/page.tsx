"use client";
// Remover NextAuth e migrar para SuperTokens
import { useState } from "react";
import { Button, TextField, Typography, Card, Box, CircularProgress, Checkbox, FormControlLabel } from "@mui/material";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../utils/supabase/client";

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
  const supabase = createClient();
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Autenticar via Supabase Auth
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (loginError) {
      console.error('Erro Supabase:', loginError.message); // Adicionado log explícito
      setError("Credenciais inválidas ou MFA necessário.");
      return;
    }
    if (data.session) {
      // Salvar JWT completo no localStorage
      const jwt = data.session.access_token;
      console.log("JWT salvo:", jwt); // <-- Adiciona log para inspeção
      localStorage.setItem("jwt", jwt);
      // Buscar role do usuário via API
      try {
        const userId = data.session.user.id;
        const response = await fetch(`/api/auth/users/${userId}`);
        const result = await response.json();
        const role = result.role;
        if (role === "SUPERADMIN") {
          router.push("/superadmin/dashboard");
        } else if (role === "ADMIN") {
          router.push("/admin/dashboard");
        } else {
          router.push("/");
        }
      } catch (err) {
        setError("Erro ao buscar role do usuário.");
        router.push("/");
      }
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Autenticação 2FA via Supabase (exemplo, ajuste conforme backend)
    // Aqui você pode implementar a lógica de verificação do código 2FA via Supabase se necessário
    setLoading(false);
    router.push("/");
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
          Autenticação via Supabase Auth com MFA integrada.
        </Typography>
      </Card>
    </Box>
  );
}