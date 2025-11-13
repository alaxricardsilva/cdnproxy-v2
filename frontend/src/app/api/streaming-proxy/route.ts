// API Route Next.js para streaming-proxy
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // TODO: lógica de proxy de streaming IPTV
  return NextResponse.json({ message: 'GET streaming-proxy' });
}