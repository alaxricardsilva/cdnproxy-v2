## Plano de Migração das Rotas do Backend (NestJS) para Next.js

### Cronograma Detalhado da Migração

| Etapa                                             | Status      | Estimativa         | Observações |
|---------------------------------------------------|-------------|--------------------|-------------|
| 1. Rotas de Autenticação (login, registro, senha) | Concluído   | -                  |             |
| 2. Rotas de Usuários (CRUD, Neon Auth)            | Concluído   | -                  |             |
| 3. Rotas de Pagamentos                            | Concluído   | 1 dia útil         | Migradas para API Routes Next.js |
| 4. Dashboard e Analytics                          | Concluído   | 1 dia útil         | Migradas para API Routes Next.js |
| 5. Configurações e Planos                         | Concluído   | 1 dia útil         | Migradas para API Routes Next.js |
| 6. Geolocalização                                 | Concluído   | 1 dia útil         | Multigeolocalização, cache e múltiplas APIs gratuitas implementadas |
| 7. Streaming Proxy                                | Concluído   | 1 dia útil         | Endpoint `/streaming/iptv/:episode` migrado e aprimorado para API Route Next.js (proxy reverso, registro de acesso, redirect automático) |
| 8. Middlewares, Validações, Integrações           | Parcial     | 1 dia útil         | Algumas validações e integrações já migradas (ex: device detection, registro de acesso, multigeolocalização). Middleware global e integrações externas pendentes de adaptação total. |
| 9. Testes das rotas migradas                      | Parcial     | 1 dia útil         | Testes manuais realizados nas rotas essenciais e avançadas. Testes automatizados e validação completa em ambiente de desenvolvimento pendentes. |
| 10. Integração com frontend e NextAuth.js         | Parcial     | 1 dia útil         | Integração básica com NextAuth.js implementada. Validação completa e ajustes finais pendentes. |
| 11. Deploy do frontend                            | Pendente    | 0,5 dia útil       | Deploy ainda não realizado. Preparação para ambiente de produção pendente. |
| 12. Validação em produção                         | Pendente    | 0,5 dia útil       | Validação em produção pendente. |
| 13. Documentação e remoção do backend antigo      | Pendente    | 0,5 dia útil       | Documentação das rotas migradas e remoção do backend antigo pendentes. |

**Prazo total estimado:** 6 a 8 dias úteis

---

### 1. Preparação
- [x] Backup completo da pasta `/backend` (exceto `node_modules`) em `backend-backup.zip`.
- [x] Garantir que o Prisma e NeonDB estão configurados no frontend (`/frontend/prisma/schema.prisma`).
- [x] Instalar dependências necessárias no frontend (Prisma, bcrypt, etc.).

### 2. Migração das Rotas Essenciais
- [x] Migrar rotas de autenticação (`auth`): login, registro, recuperação de senha.
- [x] Migrar rotas de usuários (`users`): listar, criar, editar, excluir usuários.
- [x] Adaptar lógica dos controllers/services do NestJS para funções nas rotas de API Next.js (`/frontend/src/app/api/`).
- [x] Integrar NextAuth.js para autenticação nativa.
- [x] Testar login, registro e acesso às rotas protegidas.

### 3. Migração das Rotas Avançadas
- [x] Migrar rotas de pagamentos (`payments`, `pix-transactions`, `mercadopago`).
- [x] Migrar rotas de dashboard e analytics (`dashboard-data`, `superadmin-analytics`).
- [x] Migrar rotas de configurações e planos (`configurations`, `plans`, `status`).
- [x] Migrar rotas de geolocalização (`geolocation`) com multigeolocalização, cache e múltiplas APIs gratuitas.
- [ ] **Migrar rota de streaming-proxy (`/streaming/iptv/:episode`) para API Route Next.js.**
- [ ] Adaptar middlewares, validações e integrações externas.

### 4. Etapas de Migração para Supabase Auth

#### Atualização do Painel de Usuários (/superadmin/users)
- O painel foi adaptado para integração direta com a Admin API do Supabase.
- Agora é possível listar, criar, editar, ativar/desativar e excluir usuários diretamente via Supabase Auth.
- O UUID do Supabase Auth é utilizado como identificador principal.
- Roles (SUPERADMIN, ADMIN) podem ser definidas ao criar ou editar usuários, via campo no modal.
- Cadastro público removido: apenas o superadmin pode cadastrar usuários manualmente.
- Todas as chamadas à API antiga (/api/neon-auth/users) foram substituídas por chamadas ao Supabase Admin API.

#### Próximos passos
- Adaptar painel de perfil para gerenciamento de MFA (TOTP) via Supabase Auth.
- Atualizar validação do JWT nas rotas protegidas para usar JWKS (jwks-rsa) e algoritmo RS256.
- Remover lógica antiga de autenticação/2FA/roles do SuperTokens.
- Testar todo o fluxo de autenticação, cadastro, MFA e gerenciamento de usuários.

**Acompanhe e marque cada etapa conforme avançamos na migração para Supabase Auth!**
- [ ] Testar todas as rotas migradas no ambiente de desenvolvimento.
- [ ] Validar integração com frontend (React) e NextAuth.js.
- [ ] Ajustar documentação das rotas e fluxos migrados.
- [ ] Remover dependências do backend antigo do projeto principal.
7. Realizar deploy do frontend com rotas de API integradas.
8. Validar funcionamento em produção.

Se quiser priorizar algum fluxo ou rota, basta avisar!



