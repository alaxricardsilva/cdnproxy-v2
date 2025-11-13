import { NextResponse } from 'next/server';

export async function GET() {
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Status do Proxy CDN</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f7f7f7; color: #222; }
        .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #ccc; padding: 32px; }
        h1 { color: #0077cc; }
        .info { margin-top: 24px; font-size: 1.1em; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Status do Proxy CDN</h1>
        <div class="info">
          <p>Este domínio está protegido por CDN Proxy.</p>
          <p>Se você está vendo esta página, o acesso foi realizado via navegador ou bot.</p>
          <p>Para streaming, utilize um aplicativo ou dispositivo compatível.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
    },
  });
}