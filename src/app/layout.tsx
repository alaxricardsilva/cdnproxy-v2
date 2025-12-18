"use client";
import * as React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DomainIcon from '@mui/icons-material/Public';
import PaymentIcon from '@mui/icons-material/Payment';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Avatar from '@mui/material/Avatar';
import { deepPurple } from '@mui/material/colors';
import { usePathname, useRouter } from 'next/navigation';
// Removido: import { SessionProvider } from "next-auth/react";

const drawerWidth = 240;

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#111',
      paper: '#18181b',
    },
    primary: {
      main: '#377dff',
    },
  },
});

const adminMenu = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
  { text: 'Domínios', icon: <DomainIcon />, path: '/admin/domains' },
  { text: 'Carrinho', icon: <ShoppingCartIcon />, path: '/admin/cart' },
  { text: 'Pagamentos', icon: <PaymentIcon />, path: '/admin/payments' },
  { text: 'PIX', icon: <PaymentIcon />, path: '/admin/pix' },
  { text: 'Profile', icon: <AccountCircleIcon />, path: '/admin/profile' },
  { text: 'Sair', icon: <AccountCircleIcon color="error" />, path: '/auth/logout', logout: true },
];

const superadminMenu = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/superadmin/dashboard' },
  { text: 'Domínios', icon: <DomainIcon />, path: '/superadmin/domains' },
  { text: 'Planos', icon: <PaymentIcon />, path: '/superadmin/plans' },
  { text: 'Usuários', icon: <PeopleIcon />, path: '/superadmin/users' },
  { text: 'Analytics', icon: <BarChartIcon />, path: '/superadmin/analytics' },
  { text: 'Configurações', icon: <SettingsIcon />, path: '/superadmin/config' },
  { text: 'Pagamentos', icon: <PaymentIcon />, path: '/superadmin/payments' },
  { text: 'Banco de Dados', icon: <BarChartIcon />, path: '/superadmin/database' },
  { text: 'Transações', icon: <PaymentIcon />, path: '/superadmin/transactions' },
  { text: 'Profile', icon: <AccountCircleIcon />, path: '/superadmin/profile' },
  { text: 'Sair', icon: <AccountCircleIcon color="error" />, path: '/auth/logout', logout: true },
];

function getMenuByPath(pathname: string) {
  if (pathname.startsWith('/admin')) return adminMenu;
  if (pathname.startsWith('/superadmin')) return superadminMenu;
  return [];
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const menu = getMenuByPath(pathname ?? "");
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (path: string) => {
    router.push(path);
  };

  // Verifica se está em rota de admin ou superadmin
  const isDashboardRoute = (pathname ?? "").startsWith('/admin') || (pathname ?? "").startsWith('/superadmin');

  return (
    <html lang="pt-BR">
      <body>
        <ThemeProvider theme={theme}>
          {/* Removido SessionProvider pois NextAuth não é mais usado */}
          {isDashboardRoute ? (
            <Box sx={{ display: 'flex' }}>
              <Drawer
                variant="permanent"
                sx={{
                  width: drawerWidth,
                  flexShrink: 0,
                  [`& .MuiDrawer-paper`]: {
                    width: drawerWidth,
                    boxSizing: 'border-box',
                    background: theme.palette.background.paper,
                    color: '#fff',
                  },
                }}
              >
                <Toolbar />
                <Box sx={{ overflow: 'auto' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, px: 2, py: 2 }}>
                    Proxy System
                  </Typography>
                  <Divider />
                  <List>
                    {menu.map((item) => (
                      <ListItemButton key={item.text} onClick={() => {
                        if (item.logout) {
                          localStorage.removeItem('supabase_jwt');
                          router.push('/auth/login');
                        } else {
                          router.push(item.path);
                        }
                      }}>
                        <ListItemIcon sx={{ color: item.logout ? theme.palette.error.main : '#fff' }}>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.text} />
                      </ListItemButton>
                    ))}
                  </List>
                </Box>
              </Drawer>
              <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: '#23272f', boxShadow: 3 }}>
                  <Toolbar>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                      <Avatar src="/logo.svg" sx={{ mr: 2, bgcolor: deepPurple[500] }} />
                      <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold', letterSpacing: 1 }}>
                        Proxy System
                      </Typography>
                    </Box>
                    <IconButton color="inherit" sx={{ mr: 2 }}>
                      <NotificationsIcon />
                    </IconButton>
                    <Avatar sx={{ bgcolor: deepPurple[500] }}>
                      <AccountCircleIcon />
                    </Avatar>
                  </Toolbar>
                </AppBar>
                <CssBaseline />
                {children}
              </Box>
            </Box>
          ) : (
            // Layout simples para rotas fora do dashboard
            (<Box sx={{ minHeight: '100vh', background: theme.palette.background.default }}>
              <CssBaseline />
              {children}
            </Box>)
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}

// Nenhum uso do Grid legacy encontrado neste arquivo.
