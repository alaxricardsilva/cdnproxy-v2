import fetch from 'node-fetch';

describe('Validação das rotas de API (superadmin e admin)', () => {
  const superadminCreds = {
    email: 'alaxricardsilva@gmail.com',
    password: 'Admin123',
  };
  const adminCreds = {
    email: 'alaxricardsilva@outlook.com',
    password: 'Admin123',
  };

  let superadminToken = '';
  let adminToken = '';

  // URLs base
  const baseUrl = 'http://localhost:3000/api';

  // Rotas a serem testadas
  const routes = [
    // Superadmin
    '/superadmin/profile',
    '/superadmin/general-config',
    '/superadmin/analytics',
    // Admin
    '/admin-domains',
    '/configurations',
    '/dashboard-data',
    '/geolocation',
    '/mercadopago',
    '/payments',
    '/pix-transactions',
    '/plans',
    '/status',
    '/streaming',
    '/streaming-proxy',
    '/users',
  ];

  beforeAll(async () => {
    // Login SUPERADMIN
    const resSuperadmin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(superadminCreds),
    });
    const superadminData = await resSuperadmin.json();
    superadminToken = superadminData.token || superadminData.accessToken || '';

    // Login ADMIN
    const resAdmin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminCreds),
    });
    const adminData = await resAdmin.json();
    adminToken = adminData.token || adminData.accessToken || '';
  });

  routes.forEach((route) => {
    it(`GET ${route} deve retornar status 200 ou 401, nunca 500 (SUPERADMIN)`, async () => {
      const res = await fetch(`${baseUrl}${route}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${superadminToken}` },
      });
      expect([200, 401]).toContain(res.status);
      expect(res.status).not.toBe(500);
    });
    it(`GET ${route} deve retornar status 200 ou 401, nunca 500 (ADMIN)`, async () => {
      const res = await fetch(`${baseUrl}${route}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect([200, 401]).toContain(res.status);
      expect(res.status).not.toBe(500);
    });
  });
});