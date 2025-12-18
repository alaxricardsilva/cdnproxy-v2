# 🌐 Documentação Detalhada das APIs - CDN Proxy Backend

## 📋 Índice

1. [Autenticação (Auth)](#autenticação-auth)
2. [Domínios (Domains)](#domínios-domains)
3. [Analytics](#analytics)
4. [Pagamentos (Payments)](#pagamentos-payments)
5. [Planos (Plans)](#planos-plans)
6. [Administração (Admin)](#administração-admin)
7. [Superadmin](#superadmin)
8. [Sistema (System)](#sistema-system)

---

## 🔐 Autenticação (Auth)

### POST /api/auth/login

Realiza login de usuário.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "João Silva",
    "role": "USER"
  }
}
```

**Response (Error):**
```json
{
  "error": true,
  "statusCode": 401,
  "message": "Credenciais inválidas"
}
```

---

### POST /api/auth/token

Gera token JWT customizado.

**Headers:**
```
Content-Type: application/json
```

**Request:**
```json
{
  "userId": "user-123",
  "email": "user@example.com",
  "role": "USER"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "7d"
}
```

---

### GET /api/auth/me

Retorna dados do usuário autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "João Silva",
    "role": "USER",
    "plan_id": "plan-uuid",
    "plan_expires_at": "2025-12-31T23:59:59Z",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

### POST /api/auth/2fa/setup

Configura autenticação de dois fatores (2FA).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgo...",
  "backupCodes": [
    "12345678",
    "87654321",
    "11223344"
  ]
}
```

---

### POST /api/auth/2fa/verify

Verifica código 2FA.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA ativado com sucesso"
}
```

---

## 🌍 Domínios (Domains)

### GET /api/domains

Lista todos os domínios do usuário autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
?page=1&limit=10&search=example&status=active
```

**Response:**
```json
{
  "success": true,
  "domains": [
    {
      "id": "domain-uuid",
      "domain": "cdn.example.com",
      "target_url": "https://origin.example.com",
      "user_id": "user-uuid",
      "plan_id": "plan-uuid",
      "status": "active",
      "created_at": "2025-01-01T00:00:00Z",
      "expires_at": "2025-12-31T23:59:59Z",
      "stats": {
        "requests_today": 1500,
        "bandwidth_used_mb": 250.5
      }
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### POST /api/domains

Cria um novo domínio.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "domain": "cdn.example.com",
  "target_url": "https://origin.example.com",
  "plan_id": "plan-uuid"
}
```

**Response (Success):**
```json
{
  "success": true,
  "domain": {
    "id": "domain-uuid",
    "domain": "cdn.example.com",
    "target_url": "https://origin.example.com",
    "user_id": "user-uuid",
    "plan_id": "plan-uuid",
    "status": "pending",
    "created_at": "2025-10-25T10:30:00Z",
    "expires_at": "2026-10-25T10:30:00Z"
  }
}
```

**Response (Error - Limite atingido):**
```json
{
  "error": true,
  "statusCode": 400,
  "message": "Limite de domínios atingido (5/5)"
}
```

---

### GET /api/domains/:id

Obtém detalhes de um domínio específico.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "domain": {
    "id": "domain-uuid",
    "domain": "cdn.example.com",
    "target_url": "https://origin.example.com",
    "user_id": "user-uuid",
    "plan_id": "plan-uuid",
    "status": "active",
    "created_at": "2025-01-01T00:00:00Z",
    "expires_at": "2025-12-31T23:59:59Z",
    "plan": {
      "id": "plan-uuid",
      "name": "Premium",
      "max_domains": 10,
      "max_bandwidth_gb": 1000
    },
    "stats": {
      "total_requests": 150000,
      "total_bandwidth_gb": 50.5,
      "requests_today": 1500,
      "bandwidth_today_mb": 250.5,
      "last_access": "2025-10-25T10:25:00Z"
    }
  }
}
```

---

### PUT /api/domains/:id

Atualiza um domínio existente.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "target_url": "https://new-origin.example.com",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "domain": {
    "id": "domain-uuid",
    "domain": "cdn.example.com",
    "target_url": "https://new-origin.example.com",
    "status": "active",
    "updated_at": "2025-10-25T10:35:00Z"
  }
}
```

---

### DELETE /api/domains/:id

Deleta um domínio.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Domínio deletado com sucesso"
}
```

---

## 📊 Analytics

### GET /api/analytics/overview

Visão geral de analytics do usuário.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
?period=7d&domainId=domain-uuid
```

**Response:**
```json
{
  "success": true,
  "overview": {
    "total_requests": 150000,
    "total_bandwidth_gb": 50.5,
    "unique_visitors": 5000,
    "avg_response_time_ms": 125,
    "error_rate": 0.5,
    "top_countries": [
      { "country": "Brasil", "countryCode": "BR", "requests": 100000 },
      { "country": "Estados Unidos", "countryCode": "US", "requests": 30000 }
    ],
    "top_content": [
      { "path": "/video.mp4", "requests": 50000 },
      { "path": "/stream.m3u8", "requests": 30000 }
    ],
    "requests_by_day": [
      { "date": "2025-10-18", "requests": 20000 },
      { "date": "2025-10-19", "requests": 22000 },
      { "date": "2025-10-20", "requests": 21000 }
    ]
  }
}
```

---

### GET /api/analytics/:domainId

Analytics específicas de um domínio.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
?startDate=2025-10-01&endDate=2025-10-25&period=daily
```

**Response:**
```json
{
  "success": true,
  "domainId": "domain-uuid",
  "domain": "cdn.example.com",
  "analytics": {
    "summary": {
      "total_requests": 80000,
      "total_bandwidth_gb": 30.2,
      "unique_ips": 3000,
      "avg_response_time_ms": 110,
      "success_rate": 99.5
    },
    "traffic": {
      "by_day": [...],
      "by_hour": [...],
      "peak_hour": "20:00"
    },
    "geography": {
      "by_country": [...],
      "by_continent": [...]
    },
    "content": {
      "top_accessed": [...],
      "by_type": [...]
    },
    "performance": {
      "response_times": [...],
      "error_codes": [...]
    }
  }
}
```

---

### GET /api/analytics/bandwidth

Dados de uso de bandwidth.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
?domainId=domain-uuid&period=30d&groupBy=day
```

**Response:**
```json
{
  "success": true,
  "bandwidth": {
    "total_gb": 50.5,
    "by_period": [
      { "date": "2025-10-01", "bandwidth_gb": 1.5 },
      { "date": "2025-10-02", "bandwidth_gb": 1.8 },
      { "date": "2025-10-03", "bandwidth_gb": 2.1 }
    ],
    "by_content_type": [
      { "type": "video/mp4", "bandwidth_gb": 30.0 },
      { "type": "application/vnd.apple.mpegurl", "bandwidth_gb": 15.5 },
      { "type": "video/mp2t", "bandwidth_gb": 5.0 }
    ],
    "peak_usage": {
      "date": "2025-10-15",
      "bandwidth_gb": 5.2
    }
  }
}
```

---

### GET /api/analytics/geo

Dados de geolocalização.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "geolocation": {
    "by_country": [
      {
        "country": "Brasil",
        "countryCode": "BR",
        "flag": "🇧🇷",
        "requests": 100000,
        "bandwidth_gb": 30.5,
        "percentage": 66.7
      },
      {
        "country": "Estados Unidos",
        "countryCode": "US",
        "flag": "🇺🇸",
        "requests": 30000,
        "bandwidth_gb": 10.0,
        "percentage": 20.0
      }
    ],
    "by_continent": [
      { "continent": "América do Sul", "requests": 100000 },
      { "continent": "América do Norte", "requests": 35000 },
      { "continent": "Europa", "requests": 15000 }
    ],
    "by_city": [
      { "city": "São Paulo", "country": "BR", "requests": 50000 },
      { "city": "Rio de Janeiro", "country": "BR", "requests": 30000 }
    ]
  }
}
```

---

### POST /api/analytics/collect-access-log

Coleta log de acesso (usado internamente).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "domainId": "domain-uuid",
  "domain": "cdn.example.com",
  "path": "/video.mp4",
  "targetUrl": "https://origin.example.com/video.mp4",
  "statusCode": 200,
  "responseTimeMs": 125,
  "bytesTransferred": 1048576
}
```

**Response:**
```json
{
  "success": true,
  "message": "Log coletado com sucesso"
}
```

---

## 💳 Pagamentos (Payments)

### POST /api/payments/create

Cria um novo pagamento.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "planId": "plan-uuid",
  "gateway": "mercadopago",
  "paymentMethod": "pix"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "payment-123",
    "transactionId": "tx-uuid",
    "status": "pending",
    "amount": 99.90,
    "currency": "BRL",
    "gateway": "mercadopago",
    "paymentMethod": "pix",
    "pix": {
      "qrCode": "00020126580014br.gov.bcb.pix...",
      "qrCodeBase64": "data:image/png;base64,iVBORw0KGgo...",
      "pixCopyPaste": "00020126580014br.gov.bcb.pix..."
    },
    "expiresAt": "2025-10-25T11:00:00Z",
    "createdAt": "2025-10-25T10:30:00Z"
  }
}
```

---

### GET /api/payments/list

Lista pagamentos do usuário.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
?page=1&limit=10&status=pending
```

**Response:**
```json
{
  "success": true,
  "payments": [
    {
      "id": "payment-123",
      "transactionId": "tx-uuid",
      "planId": "plan-uuid",
      "planName": "Premium",
      "amount": 99.90,
      "status": "approved",
      "gateway": "mercadopago",
      "createdAt": "2025-10-25T10:30:00Z",
      "approvedAt": "2025-10-25T10:35:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10
  }
}
```

---

### GET /api/payments/history

Histórico completo de pagamentos.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "id": "payment-123",
      "date": "2025-10-25T10:30:00Z",
      "plan": "Premium",
      "amount": 99.90,
      "status": "approved",
      "gateway": "mercadopago",
      "receipt": "https://..."
    }
  ],
  "summary": {
    "totalPaid": 299.70,
    "totalTransactions": 3,
    "averageAmount": 99.90
  }
}
```

---

### POST /api/payments/webhook

Webhook para atualização de status de pagamento.

**Headers:**
```
Content-Type: application/json
X-Signature: <gateway-signature>
```

**Request (MercadoPago):**
```json
{
  "action": "payment.updated",
  "data": {
    "id": "payment-123"
  },
  "type": "payment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook processado"
}
```

---

## 📦 Planos (Plans)

### GET /api/plans

Lista planos disponíveis para o usuário.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "plans": [
    {
      "id": "plan-basic",
      "name": "Básico",
      "price": 29.90,
      "currency": "BRL",
      "interval": "monthly",
      "features": [
        "3 domínios",
        "100 GB bandwidth",
        "Suporte por email"
      ],
      "limits": {
        "max_domains": 3,
        "max_bandwidth_gb": 100,
        "max_requests_per_month": 100000
      },
      "popular": false
    },
    {
      "id": "plan-premium",
      "name": "Premium",
      "price": 99.90,
      "currency": "BRL",
      "interval": "monthly",
      "features": [
        "10 domínios",
        "1000 GB bandwidth",
        "Analytics avançado",
        "Suporte prioritário"
      ],
      "limits": {
        "max_domains": 10,
        "max_bandwidth_gb": 1000,
        "max_requests_per_month": 1000000
      },
      "popular": true
    }
  ]
}
```

---

### GET /api/plans/public

Lista planos públicos (sem autenticação).

**Response:**
```json
{
  "success": true,
  "plans": [
    {
      "id": "plan-basic",
      "name": "Básico",
      "price": 29.90,
      "features": [...]
    }
  ]
}
```

---

### POST /api/plans/upgrade

Faz upgrade de plano.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "planId": "plan-premium"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Plano atualizado com sucesso",
  "plan": {
    "id": "plan-premium",
    "name": "Premium",
    "activatedAt": "2025-10-25T10:30:00Z",
    "expiresAt": "2025-11-25T10:30:00Z"
  }
}
```

---

## 👨‍💼 Administração (Admin)

### GET /api/admin/profile

Obtém perfil do admin.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "admin-uuid",
    "email": "admin@cdnproxy.top",
    "name": "Admin User",
    "role": "ADMIN",
    "permissions": [
      "manage_domains",
      "manage_users",
      "view_analytics"
    ],
    "twoFactorEnabled": true,
    "lastLogin": "2025-10-25T09:00:00Z"
  }
}
```

---

### GET /api/admin/domains

Lista todos os domínios (visão admin).

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:**
```
?page=1&limit=20&userId=user-uuid&status=active
```

**Response:**
```json
{
  "success": true,
  "domains": [
    {
      "id": "domain-uuid",
      "domain": "cdn.example.com",
      "user": {
        "id": "user-uuid",
        "email": "user@example.com",
        "name": "João Silva"
      },
      "plan": {
        "id": "plan-uuid",
        "name": "Premium"
      },
      "status": "active",
      "stats": {
        "requests_total": 150000,
        "bandwidth_used_gb": 50.5
      },
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

---

### GET /api/admin/payments

Lista todos os pagamentos (visão admin).

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:**
```
?status=approved&gateway=mercadopago&startDate=2025-10-01
```

**Response:**
```json
{
  "success": true,
  "payments": [
    {
      "id": "payment-123",
      "user": {
        "id": "user-uuid",
        "email": "user@example.com"
      },
      "plan": "Premium",
      "amount": 99.90,
      "status": "approved",
      "gateway": "mercadopago",
      "createdAt": "2025-10-25T10:30:00Z",
      "approvedAt": "2025-10-25T10:35:00Z"
    }
  ],
  "summary": {
    "total_amount": 10000.00,
    "total_transactions": 100,
    "approved": 95,
    "pending": 3,
    "rejected": 2
  }
}
```

---

## 🔧 Superadmin

### GET /api/superadmin/stats

Estatísticas globais do sistema.

**Headers:**
```
Authorization: Bearer <superadmin-token>
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "users": {
      "total": 1500,
      "active": 1200,
      "inactive": 300,
      "new_this_month": 50
    },
    "domains": {
      "total": 3000,
      "active": 2500,
      "pending": 200,
      "expired": 300
    },
    "revenue": {
      "total": 150000.00,
      "this_month": 15000.00,
      "last_month": 14500.00,
      "growth_rate": 3.4
    },
    "bandwidth": {
      "total_gb": 50000,
      "this_month_gb": 5000,
      "avg_per_domain_gb": 16.7
    },
    "requests": {
      "total": 150000000,
      "this_month": 15000000,
      "avg_response_time_ms": 125
    }
  }
}
```

---

### GET /api/superadmin/system-health

Saúde completa do sistema.

**Headers:**
```
Authorization: Bearer <superadmin-token>
```

**Response:**
```json
{
  "success": true,
  "health": {
    "overall_status": "healthy",
    "timestamp": "2025-10-25T10:30:00Z",
    "services": {
      "database": {
        "healthy": true,
        "responseTime": 15,
        "connections": {
          "active": 10,
          "max": 100
        }
      },
      "redis": {
        "healthy": true,
        "responseTime": 2,
        "memory_used_mb": 50,
        "connected_clients": 5
      },
      "backend": {
        "healthy": true,
        "uptime": 86400,
        "memory_usage": "45%",
        "cpu_usage": "20%"
      }
    },
    "critical_apis": {
      "summary": {
        "total": 10,
        "healthy": 9,
        "warning": 1,
        "unhealthy": 0
      },
      "details": [...]
    },
    "alerts": {
      "active": 1,
      "total_today": 5
    }
  }
}
```

---

### GET /api/superadmin/performance

Métricas de performance do sistema.

**Headers:**
```
Authorization: Bearer <superadmin-token>
```

**Response:**
```json
{
  "success": true,
  "performance": {
    "api_response_times": {
      "p50": 80,
      "p95": 150,
      "p99": 300,
      "avg": 95
    },
    "database_queries": {
      "slow_queries_count": 5,
      "avg_query_time_ms": 25,
      "total_queries": 150000
    },
    "cache_hit_rate": 85.5,
    "error_rate": 0.5,
    "throughput_per_second": 500
  }
}
```

---

## 🛠️ Sistema (System)

### GET /api/system/health

Health check do sistema.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "services": {
    "database": { "status": "up", "responseTime": 15 },
    "redis": { "status": "up", "responseTime": 2 }
  },
  "timestamp": "2025-10-25T10:30:00Z"
}
```

---

### GET /api/system/monitoring

Monitoramento completo do sistema.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "monitoring": {
    "system": {
      "uptime": 86400,
      "memory": {
        "total": "8GB",
        "used": "3.6GB",
        "usage": "45%"
      },
      "cpu": {
        "usage": "20%",
        "cores": 4
      },
      "disk": {
        "total": "100GB",
        "used": "40GB",
        "usage": "40%"
      }
    },
    "services": {...},
    "metrics": {...}
  }
}
```

---

### POST /api/system/cleanup

Limpa dados antigos do sistema.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Request:**
```json
{
  "retentionDays": 90,
  "tables": ["access_logs", "hls_metrics"]
}
```

**Response:**
```json
{
  "success": true,
  "cleaned": {
    "access_logs": 50000,
    "hls_metrics": 30000
  },
  "message": "Limpeza concluída com sucesso"
}
```

---

### GET /api/system/background-tasks

Status das tarefas em background.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "tasks": {
    "total": 10,
    "pending": 5,
    "running": 2,
    "completed": 3,
    "failed": 0,
    "list": [
      {
        "id": "task-123",
        "type": "analytics_aggregation",
        "status": "running",
        "priority": "medium",
        "attempts": 1,
        "createdAt": "2025-10-25T10:00:00Z"
      }
    ]
  }
}
```

---

## 🔑 Códigos de Status HTTP

| Código | Significado | Quando usar |
|--------|-------------|-------------|
| 200 | OK | Requisição bem-sucedida |
| 201 | Created | Recurso criado com sucesso |
| 204 | No Content | Sucesso sem conteúdo (OPTIONS) |
| 400 | Bad Request | Dados inválidos |
| 401 | Unauthorized | Não autenticado |
| 403 | Forbidden | Sem permissão |
| 404 | Not Found | Recurso não encontrado |
| 409 | Conflict | Conflito (domínio duplicado) |
| 429 | Too Many Requests | Rate limit excedido |
| 500 | Internal Server Error | Erro interno |
| 503 | Service Unavailable | Serviço indisponível |

---

## 📝 Notas Importantes

### Rate Limiting

Todas as APIs possuem rate limiting configurado:
- Usuários comuns: 100 requisições/minuto
- Admins: 200 requisições/minuto
- Superadmins: 500 requisições/minuto

### Paginação

APIs que retornam listas suportam paginação:
```
?page=1&limit=20
```

### Filtros

APIs suportam filtros via query parameters:
```
?status=active&search=example&startDate=2025-10-01
```

### Ordenação

```
?orderBy=created_at&order=desc
```

---

**Versão:** 1.2.2  
**Última Atualização:** 25/10/2025
