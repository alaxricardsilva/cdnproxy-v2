# Integração Cloudflare Tunnel - Backend REST API

## Objetivo
Criar rotas REST API no backend para permitir que o frontend gerencie túneis e domínios do Cloudflare Tunnel (listar, adicionar, editar, remover), integrando com a página `/superadmin/tunnel`.

## Estrutura Sugerida de Rotas

### 1. Listar Túneis e Domínios
- **GET /api/cloudflare/tunnels**
  - Retorna todos os túneis e domínios vinculados.
  - Exemplo de resposta:
    ```json
    {
      "tunnels": [
        {
          "id": "tunnel-1",
          "name": "Meu Tunnel",
          "status": "ativo",
          "domains": [
            { "id": "dom-1", "name": "meudominio.com", "status": "ativo" }
          ]
        }
      ]
    }
    ```

### 2. Adicionar Domínio ao Tunnel
- **POST /api/cloudflare/tunnel/:tunnelId/domain**
  - Payload: `{ "name": "dominio.com" }`
  - Adiciona um domínio ao túnel especificado.

### 3. Editar Domínio do Tunnel
- **PUT /api/cloudflare/tunnel/:tunnelId/domain/:domainId**
  - Payload: `{ "name": "novonome.com" }`
  - Edita o domínio vinculado ao túnel.

### 4. Remover Domínio do Tunnel
- **DELETE /api/cloudflare/tunnel/:tunnelId/domain/:domainId**
  - Remove o domínio do túnel.

## Requisitos para Integração Real
- O backend deve autenticar e validar permissões do usuário (Superadmin).
- As rotas devem manipular dados reais, seja via banco de dados ou integração direta com a API da Cloudflare Tunnel.
- Retornar respostas padronizadas (sucesso/erro) para o frontend exibir feedback.
- Documentar possíveis erros e formatos de resposta.

## Sugestão de Implementação
- Utilizar Express.js (já usado em proxy-server.js) para criar as rotas.
- Integrar com a API da Cloudflare Tunnel usando o token de autenticação da Cloudflare.
- Salvar informações dos túneis/domínios no banco de dados para persistência e consulta rápida.
- Exemplo de estrutura de código:
  ```js
  app.get('/api/cloudflare/tunnels', async (req, res) => { /* ... */ });
  app.post('/api/cloudflare/tunnel/:tunnelId/domain', async (req, res) => { /* ... */ });
  app.put('/api/cloudflare/tunnel/:tunnelId/domain/:domainId', async (req, res) => { /* ... */ });
  app.delete('/api/cloudflare/tunnel/:tunnelId/domain/:domainId', async (req, res) => { /* ... */ });
  ```

## Como Integrar ao Frontend
- O frontend `/superadmin/tunnel` já está preparado para consumir essas rotas.
- Basta garantir que as rotas estejam funcionando e retornando dados reais.
- Ajustar o frontend conforme o formato de resposta do backend, se necessário.

## Observações
- Se precisar de exemplos de integração com a API da Cloudflare, posso fornecer trechos de código.
- Recomendo criar testes para as rotas e validar todos os fluxos (listar, adicionar, editar, remover).

---

**Após criar as rotas, basta rodar o backend e testar a integração visualmente pelo painel Superadmin.**