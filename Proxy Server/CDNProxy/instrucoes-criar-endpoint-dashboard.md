a# Instruções para Criar Endpoint Dashboard no Backend Remoto

## 1. Estrutura do Endpoint

O endpoint deve ser criado no repositório do backend remoto (`https://api.cdnproxy.top`) seguindo a estrutura de pastas padrão do Nuxt:

- **Caminho:** `/server/api/admin/dashboard.get.ts`
- **Tipo:** Endpoint GET
- **Autenticação:** Requer autenticação de administrador

## 2. Conteúdo do Endpoint

```typescript
import { logger } from '~/utils/logger'
import { defineEventHandler, createError } from 'h3'
import { requireAdminAuth, getSystemClient } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate admin
    const { user, userProfile } = await requireAdminAuth(event)
    
    // Buscar estatísticas do usuário
    const supabase = getSystemClient()
    
    // Contar domínios do usuário
    const { count: totalDomains, error: domainsError } = await supabase
      .from('domains')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userProfile.id)

    // Contar domínios ativos
    const { count: activeDomains, error: activeError } = await supabase
      .from('domains')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userProfile.id)
      .eq('status', 'active')

    // Contar domínios expirados
    const { count: expiredDomains, error: expiredError } = await supabase
      .from('domains')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userProfile.id)
      .eq('status', 'expired')

    // Lidar com erros
    if (domainsError) {
      logger.error('❌ [admin/dashboard] Erro ao contar domínios:', domainsError.message)
    }
    
    if (activeError) {
      logger.error('❌ [admin/dashboard] Erro ao contar domínios ativos:', activeError.message)
    }
    
    if (expiredError) {
      logger.error('❌ [admin/dashboard] Erro ao contar domínios expirados:', expiredError.message)
    }

    // Retornar dados do dashboard do admin
    return {
      success: true,
      data: {
        user: {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          role: userProfile.role
        },
        stats: {
          totalDomains: totalDomains || 0,
          activeDomains: activeDomains || 0,
          expiredDomains: expiredDomains || 0
        }
      }
    }
  } catch (error: any) {
    logger.error('❌ [admin/dashboard] Erro:', error.message)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})
```

## 3. Funcionalidades do Endpoint

1. **Autenticação:** Valida se o usuário tem permissão de administrador usando `requireAdminAuth`
2. **Dados do Usuário:** Retorna informações básicas do usuário administrador
3. **Estatísticas:** Busca estatísticas de domínios:
   - Total de domínios do usuário
   - Domínios ativos
   - Domínios expirados

## 4. Deploy no Backend Remoto

1. Acesse o repositório do backend remoto
2. Crie o arquivo no caminho especificado: `/server/api/admin/dashboard.get.ts`
3. Faça commit e push das alterações
4. Execute o processo de deploy do backend (geralmente automático via CI/CD)

## 5. Teste do Endpoint

Após o deploy, o endpoint estará disponível em:
```
GET https://api.cdnproxy.top/api/admin/dashboard
```

Headers necessários:
```
Authorization: Bearer [TOKEN_JWT]
```

## 6. Resposta Esperada

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-do-usuario",
      "email": "admin@exemplo.com",
      "name": "Nome do Admin",
      "role": "ADMIN"
    },
    "stats": {
      "totalDomains": 10,
      "activeDomains": 8,
      "expiredDomains": 2
    }
  }
}
```

## 7. Problema de Autenticação com Role Incorreta

### Descrição do Problema
O frontend está recebendo "Role: authenticated" ao invés de "SUPERADMIN" ou "ADMIN". Isso impede que o sistema identifique corretamente o tipo de usuário e conceda as permissões apropriadas.

### Arquitetura de Autenticação Atual

1. **Frontend (Nuxt.js)**: 
   - Utiliza Supabase Auth para autenticação
   - Converte tokens do Supabase para tokens personalizados JWT
   - Se comunica com o backend remoto em `https://api.cdnproxy.top`

2. **Processo de Autenticação**:
   - Usuário faz login no Supabase através do frontend
   - Supabase retorna um token de acesso
   - Frontend envia esse token para o endpoint `/api/auth/exchange` no backend
   - Backend valida o token do Supabase e cria um token personalizado JWT
   - Backend retorna o token JWT para o frontend
   - Frontend usa esse token JWT para acessar endpoints protegidos

3. **Fluxo Completo**:
   ```
   Usuário -> Login Supabase -> Token Supabase -> /api/auth/exchange -> Token JWT -> Frontend -> Endpoints Protegidos
   ```

### Problema Específico
O backend não está enviando corretamente o ROLE do usuário no token JWT, causando o retorno de "authenticated" ao invés de "ADMIN" ou "SUPERADMIN".

## 8. Correção no Backend

### Arquivo: `/server/api/auth/exchange.post.ts` (Endpoint de troca de tokens)

```typescript
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseClient } from '~/utils/supabase-client'
import { createJWTToken } from '~/utils/jwt-handler'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { accessToken } = body

    // Validar token do Supabase
    const supabase = getSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)

    if (error || !user) {
      logger.error('❌ [auth/exchange] Token do Supabase inválido:', error?.message)
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    // Buscar perfil do usuário no banco de dados
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      logger.error('❌ [auth/exchange] Perfil de usuário não encontrado:', profileError?.message)
      throw createError({
        statusCode: 404,
        statusMessage: 'Perfil de usuário não encontrado'
      })
    }

    // Criar token JWT personalizado com ROLE correto
    const jwtToken = await createJWTToken({
      userId: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      role: userProfile.role  // Importante: Incluir o ROLE correto aqui
    })

    logger.info('✅ [auth/exchange] Token JWT criado com sucesso para:', userProfile.email)

    return {
      success: true,
      token: jwtToken,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role  // Retornar o ROLE na resposta
      }
    }
  } catch (error: any) {
    logger.error('❌ [auth/exchange] Erro:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})
```

### Arquivo: `/utils/hybrid-auth.ts` (Utilitário de autenticação híbrida)

```typescript
import { getSupabaseClient } from './supabase-client'
import { verifyJWTToken } from './jwt-handler'
import { logger } from './logger'

/**
 * Requer autenticação de administrador
 */
export async function requireAdminAuth(event: any) {
  const authHeader = event.req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('❌ [hybrid-auth] Token não fornecido ou formato inválido')
    throw createError({
      statusCode: 401,
      statusMessage: 'Token de autenticação não fornecido'
    })
  }

  const token = authHeader.substring(7) // Remove "Bearer "

  try {
    // Tentar verificar token JWT personalizado primeiro
    const decoded = await verifyJWTToken(token)
    
    // Verificar se o usuário tem permissão de admin
    if (decoded.role !== 'ADMIN' && decoded.role !== 'SUPERADMIN') {
      logger.warn('❌ [hybrid-auth] Usuário não tem permissão de administrador:', decoded.email)
      throw createError({
        statusCode: 403,
        statusMessage: 'Permissão insuficiente'
      })
    }

    // Retornar informações do usuário autenticado
    return {
      user: {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name
      },
      userProfile: {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role  // Importante: Retornar o ROLE correto
      }
    }
  } catch (jwtError) {
    logger.error('❌ [hybrid-auth] Erro ao verificar token JWT:', jwtError.message)
    throw createError({
      statusCode: 401,
      statusMessage: 'Token de autenticação inválido'
    })
  }
}

/**
 * Obter cliente Supabase com credenciais do sistema
 */
export function getSystemClient() {
  return getSupabaseClient()
}
```

## 9. Validação da Correção

Após implementar as correções no backend:

1. **Teste o endpoint de troca de tokens**:
   ```
   POST https://api.cdnproxy.top/api/auth/exchange
   Body: { "accessToken": "[TOKEN_SUPABASE]" }
   ```

2. **Verifique se a resposta inclui o ROLE correto**:
   ```json
   {
     "success": true,
     "token": "[TOKEN_JWT]",
     "user": {
       "id": "uuid-do-usuario",
       "email": "admin@exemplo.com",
       "name": "Nome do Admin",
       "role": "ADMIN"  // Deve ser ADMIN ou SUPERADMIN
     }
   }
   ```

3. **Teste o endpoint dashboard com o token JWT**:
   ```
   GET https://api.cdnproxy.top/api/admin/dashboard
   Headers: Authorization: Bearer [TOKEN_JWT]
   ```

4. **Verifique se a resposta inclui o ROLE correto**:
   ```json
   {
     "success": true,
     "data": {
       "user": {
         "id": "uuid-do-usuario",
         "email": "admin@exemplo.com",
         "name": "Nome do Admin",
         "role": "ADMIN"  // Deve ser ADMIN ou SUPERADMIN
       },
       "stats": {
         "totalDomains": 10,
         "activeDomains": 8,
         "expiredDomains": 2
       }
     }
   }
   ```

## 10. Considerações Finais

Com essas correções, o frontend receberá o ROLE correto do usuário, permitindo que os middlewares de administração funcionem adequadamente e que as permissões sejam aplicadas corretamente.