// Rota para listar domínios (zones) da Cloudflare
import { NextRequest, NextResponse } from 'next/server';

const CLOUDFLARE_API_URL = 'https://api.cloudflare.com/client/v4/zones';
const CLOUDFLARE_ANALYTICS_URL = 'https://api.cloudflare.com/client/v4/zones';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

async function fetchZoneAnalytics(zoneId: string) {
  const url = `${CLOUDFLARE_ANALYTICS_URL}/${zoneId}/analytics/dashboard?since=-1440`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  return response.json();
}

async function fetchDNSChanges(zoneId: string) {
  // Exemplo: buscar logs de alterações DNS
  const url = `${CLOUDFLARE_ANALYTICS_URL}/${zoneId}/dns_records?per_page=10`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  return response.json();
}

export async function GET(req: NextRequest) {
  if (!CLOUDFLARE_API_TOKEN) {
    return NextResponse.json({ error: 'Cloudflare API Token não configurado.' }, { status: 500 });
  }
  try {
    const response = await fetch(CLOUDFLARE_API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.errors || 'Erro ao consultar Cloudflare.' }, { status: response.status });
    }
    const zones = data.result;
    // Buscar dados de analytics, DNS, status, etc. para cada zona
    const analyticsPromises = zones.map(async (zone: any) => {
      const analytics = await fetchZoneAnalytics(zone.id);
      const dnsChanges = await fetchDNSChanges(zone.id);
      return {
        id: zone.id,
        name: zone.name,
        status: zone.status,
        monthlyTraffic: analytics.result?.totals?.bandwidth?.all || 0,
        httpRequests: analytics.result?.totals?.requests?.all || 0,
        expiringDomains: zone.status === 'active' && zone.expires_on ? zone.expires_on : null,
        statusDomains: zone.status,
        trafficPeaks: analytics.result?.timeseries?.map((t: any) => ({ timestamp: t.since, requests: t.requests?.all })) || [],
        dnsChanges: dnsChanges.result || [],
        geoAccess: analytics.result?.totals?.country || {},
      };
    });
    const zonesData = await Promise.all(analyticsPromises);
    return NextResponse.json({ zones: zonesData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}