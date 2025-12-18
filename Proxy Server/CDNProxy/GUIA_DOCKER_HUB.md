# 🚀 Guia Rápido - Docker Hub Setup

## 📋 Resumo

Configuração completa do Docker Hub para o CDNProxy com backend e redis.

**Username**: `alaxricard`  
**Repositórios**:
- `alaxricard/cdnproxy-backend`
- `alaxricard/cdnproxy-redis`

---

## ⚡ Quick Start (3 Passos)

### 1️⃣ Login no Docker Hub

```bash
docker login
# Username: alaxricard
# Password: [sua senha do Docker Hub]
```

### 2️⃣ Build e Enviar para Docker Hub

```bash
cd /www/wwwroot/CDNProxy
./docker-build-and-push.sh
```

**O que o script faz**:
- ✅ Constrói imagem do backend (Node.js 20 + Nuxt)
- ✅ Constrói imagem do redis (Redis 7 Alpine)
- ✅ Cria múltiplas tags (latest, versão, data)
- ✅ Envia para Docker Hub
- ✅ Exibe links para visualização

### 3️⃣ Verificar no Docker Hub

Acesse:
- https://hub.docker.com/r/alaxricard/cdnproxy-backend
- https://hub.docker.com/r/alaxricard/cdnproxy-redis

---

## 🌍 Deploy em Outro Servidor

### 1. Baixar Imagens

```bash
cd /www/wwwroot/CDNProxy
./docker-pull.sh
```

### 2. Iniciar Containers

```bash
docker-compose -f docker-compose.server2.yml up -d
```

### 3. Verificar Status

```bash
docker-compose -f docker-compose.server2.yml ps
docker-compose -f docker-compose.server2.yml logs -f
```

---

## 📦 Estrutura das Imagens

### Backend (alaxricard/cdnproxy-backend)

```
alaxricard/cdnproxy-backend:latest    # Última versão
alaxricard/cdnproxy-backend:v1.2.3    # Versão 1.2.3
alaxricard/cdnproxy-backend:20251025  # Build de 25/10/2025
```

**Conteúdo**:
- Node.js 20.19.5
- Nuxt 4.1.2
- APIs REST completas
- Sistema PIX corrigido
- Autenticação híbrida
- Redis client

**Tamanho**: ~200-300 MB

### Redis (alaxricard/cdnproxy-redis)

```
alaxricard/cdnproxy-redis:latest      # Última versão
alaxricard/cdnproxy-redis:7.4.6       # Redis 7.4.6
alaxricard/cdnproxy-redis:20251025    # Build de 25/10/2025
```

**Conteúdo**:
- Redis 7.4.6 Alpine
- Persistência AOF habilitada
- Configuração otimizada

**Tamanho**: ~15-20 MB

---

## 🔄 Workflow Completo

### Desenvolvimento Local

```bash
# 1. Fazer alterações no código
# ... editar arquivos ...

# 2. Testar localmente
docker-compose -f docker-compose.server2.yml up --build

# 3. Se OK, enviar para Docker Hub
./docker-build-and-push.sh
```

### Produção

```bash
# 1. Conectar ao servidor
ssh user@servidor-producao

# 2. Baixar novas imagens
cd /www/wwwroot/CDNProxy
./docker-pull.sh

# 3. Parar containers antigos
docker-compose -f docker-compose.server2.yml down

# 4. Iniciar com novas imagens
docker-compose -f docker-compose.server2.yml up -d

# 5. Verificar logs
docker-compose -f docker-compose.server2.yml logs -f backend
```

---

## 🎯 Comandos Essenciais

### Build e Push

```bash
# Build e push automático
./docker-build-and-push.sh

# Build manual backend
docker build -t alaxricard/cdnproxy-backend:latest ./backend

# Build manual redis
docker build -t alaxricard/cdnproxy-redis:latest ./redis

# Push manual
docker push alaxricard/cdnproxy-backend:latest
docker push alaxricard/cdnproxy-redis:latest
```

### Pull

```bash
# Pull automático
./docker-pull.sh

# Pull manual backend
docker pull alaxricard/cdnproxy-backend:latest

# Pull manual redis
docker pull alaxricard/cdnproxy-redis:latest
```

### Gestão de Imagens

```bash
# Listar imagens do CDNProxy
docker images | grep alaxricard

# Remover imagens antigas
docker rmi alaxricard/cdnproxy-backend:20251024
docker rmi alaxricard/cdnproxy-redis:20251024

# Limpar cache de build
docker builder prune -a
```

---

## 📊 Vantagens

### ✅ Antes (sem Docker Hub):
- ⏱️ Deploy: 3-5 minutos (build completo)
- 📦 Transferência: Todo o código fonte
- 🔄 Consistência: Variável entre servidores
- 🔙 Rollback: Difícil

### ✅ Depois (com Docker Hub):
- ⚡ Deploy: 30 segundos (pull)
- 📦 Transferência: Apenas imagem otimizada
- 🔄 Consistência: Garantida (mesma imagem)
- 🔙 Rollback: Fácil (trocar tag)

---

## 🐛 Problemas Comuns

### "denied: requested access to the resource is denied"

**Causa**: Não está logado ou sem permissão

**Solução**:
```bash
docker logout
docker login
# Usar credenciais corretas
```

### "manifest unknown: manifest unknown"

**Causa**: Imagem não existe no Docker Hub

**Solução**:
```bash
# Fazer build e push primeiro
./docker-build-and-push.sh
```

### Build muito lento

**Causa**: Cache não otimizado

**Solução**:
```bash
# Habilitar BuildKit
export DOCKER_BUILDKIT=1

# Rebuild
./docker-build-and-push.sh
```

### Imagem muito grande

**Causa**: Build sem otimização

**Solução**:
```bash
# Verificar tamanho
docker images | grep alaxricard

# Multi-stage build já está otimizado no Dockerfile
```

---

## 📋 Checklist

### Antes do Primeiro Push

- [ ] Conta no Docker Hub criada (alaxricard)
- [ ] Repositórios criados no Docker Hub
- [ ] Docker instalado localmente
- [ ] Login no Docker Hub OK
- [ ] Scripts com permissão de execução

### Antes de Cada Push

- [ ] Código testado localmente
- [ ] Build local sem erros
- [ ] Testes passando
- [ ] Changelog atualizado
- [ ] Versão incrementada (se aplicável)

### Antes do Deploy

- [ ] Imagens no Docker Hub verificadas
- [ ] Servidor de destino acessível
- [ ] Backup realizado
- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados atualizado

### Após o Deploy

- [ ] Containers iniciados OK
- [ ] Health checks passando
- [ ] Logs sem erros críticos
- [ ] Aplicação acessível
- [ ] Funcionalidades testadas

---

## 🔗 Links Úteis

### Docker Hub
- **Perfil**: https://hub.docker.com/u/alaxricard
- **Backend**: https://hub.docker.com/r/alaxricard/cdnproxy-backend
- **Redis**: https://hub.docker.com/r/alaxricard/cdnproxy-redis

### Documentação
- **Docker Hub Docs**: https://docs.docker.com/docker-hub/
- **Docker Build**: https://docs.docker.com/engine/reference/commandline/build/
- **Docker Compose**: https://docs.docker.com/compose/

---

## 💡 Dicas Avançadas

### 1. Build Multi-Plataforma

```bash
# Criar builder
docker buildx create --name mybuilder --use

# Build para AMD64 e ARM64
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t alaxricard/cdnproxy-backend:latest \
  --push \
  ./backend
```

### 2. Tags Automáticas por Git

```bash
# Usar hash do commit como tag
GIT_HASH=$(git rev-parse --short HEAD)
docker tag alaxricard/cdnproxy-backend:latest \
  alaxricard/cdnproxy-backend:${GIT_HASH}
```

### 3. Automated Builds

Configurar no Docker Hub:
1. Conectar repositório GitHub
2. Configurar build automático
3. Deploy automático ao fazer push

---

## 📞 Suporte

**Documentação Completa**: [`DOCKER_HUB_SETUP.md`](./DOCKER_HUB_SETUP.md)

**Scripts**:
- `docker-build-and-push.sh` - Build e push
- `docker-pull.sh` - Pull das imagens

---

**Última atualização**: 25/10/2025  
**Versão**: 1.0  
**Autor**: alaxricard
