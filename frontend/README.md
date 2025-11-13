## Plano de Migração das Rotas do Backend (NestJS) para Next.js

### Cronograma Detalhado da Migração

| Etapa                                             | Status      | Estimativa         | Observações |
|---------------------------------------------------|-------------|--------------------|-------------|
| 1. Rotas de Autenticação (login, registro, senha) | Concluído   | -                  |             |
| 2. Rotas de Usuários (CRUD, Neon Auth)            | Concluído   | -                  |             |
| 3. Rotas de Pagamentos                            | Concluído   | 1 dia útil         | Migradas para API Routes Next.js |
| 4. Dashboard e Analytics                          | Concluído   | 1 dia útil         | Migradas para API Routes Next.js |
| 5. Configurações e Planos                         | Concluído   | 1 dia útil         | Migradas para API Routes Next.js |
| 6. Geolocalização e Streaming                     | Em andamento| 1 dia útil         | Multigeolocalização, cache e múltiplas APIs gratuitas implementadas |
| 7. Middlewares, Validações, Integrações           | Pendente    | 1 dia útil         |             |
| 8. Testes das rotas migradas                      | Pendente    | 1 dia útil         |             |
| 9. Integração com frontend e NextAuth.js          | Pendente    | 1 dia útil         |             |
| 10. Deploy do frontend                            | Pendente    | 0,5 dia útil       |             |
| 11. Validação em produção                         | Pendente    | 0,5 dia útil       |             |
| 12. Documentação e remoção do backend antigo      | Pendente    | 0,5 dia útil       |             |

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
- [x] Migrar rotas de geolocalização e streaming (`geolocation`, `streaming-proxy`) com multigeolocalização, cache e múltiplas APIs gratuitas.
- [ ] Adaptar middlewares, validações e integrações externas.

### 4. Testes e Ajustes Finais
- [x] Testar rotas de configurações e planos migradas no ambiente de desenvolvimento.
- [x] Testar rotas de geolocalização e streaming migradas.
- [ ] Testar todas as rotas migradas no ambiente de desenvolvimento.
- [ ] Validar integração com frontend (React) e NextAuth.js.
- [ ] Ajustar documentação das rotas e fluxos migrados.
- [ ] Remover dependências do backend antigo do projeto principal.

### 5. Deploy
- [ ] Realizar deploy do frontend com rotas de API integradas.
- [ ] Validar funcionamento em produção.

---

**Observações:**
- Priorize a migração das rotas essenciais para garantir login e acesso básico.
- Utilize o backup para restaurar qualquer lógica ou dado necessário.
- Após a migração, o backend separado pode ser mantido para outros projetos ou desativado.

---

### Próximos Passos
1. Adaptar middlewares, validações e integrações externas para Next.js API routes.
2. Testar todas as rotas migradas no ambiente de desenvolvimento.
3. Validar integração com frontend (React) e NextAuth.js.
4. Ajustar documentação das rotas e fluxos migrados.
5. Remover dependências do backend antigo do projeto principal.
6. Realizar deploy do frontend com rotas de API integradas.
7. Validar funcionamento em produção.

Se quiser priorizar algum fluxo ou rota, basta avisar!