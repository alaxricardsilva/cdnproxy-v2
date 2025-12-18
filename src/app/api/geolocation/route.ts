import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const prisma = new PrismaClient();

const JWKS_URI = process.env.SUPABASE_JWKS_URL || 'https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/auth/v1/keys';
const client = jwksClient({ jwksUri: JWKS_URI });

async function verifyJWT(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      callback(err);
    } else {
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    }
  });
}

async function getUserFromJWT(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = await verifyJWT(token);
    return decoded;
  } catch (err) {
    return null;
  }
}

// Device detection logic (adapted from DeviceDetectionService)
function detectDevice(userAgent: string) {
  if (!userAgent) return { device: 'Unknown', os: 'Unknown', browser: 'Unknown', isBot: false, isApp: false, isBrowser: false, isStreamingDevice: false };
  let device = /mobile/i.test(userAgent) ? 'Mobile' : /tablet/i.test(userAgent) ? 'Tablet' : 'Desktop';
  let os = /windows/i.test(userAgent) ? 'Windows' : /android/i.test(userAgent) ? 'Android' : /linux/i.test(userAgent) ? 'Linux' : /iphone|ipad|ipod/i.test(userAgent) ? 'iOS' : /mac os/i.test(userAgent) ? 'MacOS' : 'Unknown';
  let browser = /chrome/i.test(userAgent) ? 'Chrome' : /firefox/i.test(userAgent) ? 'Firefox' : /safari/i.test(userAgent) ? 'Safari' : /edge/i.test(userAgent) ? 'Edge' : /msie|trident/i.test(userAgent) ? 'IE' : 'Unknown';
  const isBot = /bot|spider|crawler/i.test(userAgent);
  const isBrowser = /chrome|firefox|safari|edge|msie|trident/i.test(userAgent);
  const isStreamingDevice = /smarttv|roku|firetv|chromecast|appletv|androidtv/i.test(userAgent);
  const isApp = /iptv|player|app/i.test(userAgent);
  return { device, os, browser, isBot, isApp, isBrowser, isStreamingDevice };
}

// Simple in-memory log (adapted from LogsService)
const logs: any[] = [];
function registerAccessLog(logData: any) {
  logs.push({ ...logData, timestamp: Date.now() });
}

// Cache simples em memória para geolocalização por IP
const geoCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// APIs gratuitas de fallback
async function fetchGeoFromAPIs(ip: string): Promise<{ source: string, data: any }> {
  // 1. ip-api.com
  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon,isp,query`);
    if (response.data.status === 'success') {
      return { source: 'ip-api.com', data: response.data };
    }
  } catch {}
  // 2. ipwhois.io
  try {
    const response = await axios.get(`https://free.ipwhois.io/json/${ip}`);
    if (response.data && response.data.success !== false) {
      return { source: 'ipwhois.io', data: response.data };
    }
  } catch {}
  // 3. ipinfo.io
  try {
    const response = await axios.get(`https://ipinfo.io/${ip}/json`);
    if (response.data && !response.data.error) {
      return { source: 'ipinfo.io', data: response.data };
    }
  } catch {}
  return { source: 'none', data: { error: 'Todas APIs de geolocalização falharam.' } };
}

export async function GET(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  // Suporte a múltiplos IPs (multigeolocalização)
  const ipList = forwardedFor ? forwardedFor.split(',').map(ip => ip.trim()).filter(Boolean) : [];
  const userAgent = request.headers.get('user-agent') || '';
  const deviceInfo = detectDevice(userAgent);
  registerAccessLog({ ip: ipList.join(','), deviceInfo, userAgent });

  // Consulta geolocalização para cada IP, usando cache e múltiplas APIs
  const geoResults = await Promise.all(ipList.map(async (ip) => {
    if (!ip) return null;
    const cached = geoCache[ip];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return { ip, geoData: cached.data, cached: true, source: cached.data.source };
    }
    const geo = await fetchGeoFromAPIs(ip);
    geoCache[ip] = { data: { ...geo.data, source: geo.source }, timestamp: Date.now() };
    return { ip, geoData: geo.data, cached: false, source: geo.source };
  }));

  return NextResponse.json({ ipList, deviceInfo, geoResults });
}