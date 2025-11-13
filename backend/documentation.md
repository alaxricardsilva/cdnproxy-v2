# Documentação do Backend NestJS

## Estrutura do Projeto
O backend está agora consolidado diretamente na pasta `/backend`, sem subpastas intermediárias. Todos os arquivos principais (Dockerfile, package.json, tsconfig.json, src/, etc.) estão na raiz do backend.

## Configuração do Supabase no Backend
Para validar JWT e realizar operações administrativas, configure as variáveis de ambiente:

1. Crie um arquivo `.env` na pasta `/backend` com:
   ```env
   SUPABASE_DISCOVERY_URL=https://<project-id>.supabase.co/auth/v1/.well-known/jwks.json
   SUPABASE_SECRET_KEY=<sua-secret-key>
   ```
2. No código, utilize essas variáveis para autenticação e operações administrativas.
3. Certifique-se de que o Dockerfile e Docker Compose estejam configurados para carregar o `.env`.

## Build e Deploy
- Para build local: `npm run build` na pasta `/backend`.
- Para rodar em produção: `npm run start:prod`.
- Docker Compose já está configurado para usar `/backend` como raiz do backend NestJS.

## Histórico de Migração
- Backend antigo removido.
- Estrutura consolidada em `/backend`.
- Documentação e instruções atualizadas.

---

*Atualize este documento conforme novas mudanças forem realizadas.*