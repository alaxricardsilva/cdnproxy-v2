# 🐋 Docker Hub Setup - CDNProxy

## 📋 Informações das Imagens

### Backend
- **Imagem**: `alaxricard/cdnproxy-backend`
- **Tags**: `latest`, `v1.2.3`, `YYYYMMDD`
- **Descrição**: Backend Nuxt.js com APIs REST, autenticação e sistema PIX
- **Porta**: 5001
- **Base**: Node.js 20 Alpine

### Redis
- **Imagem**: `alaxricard/cdnproxy-redis`
- **Tags**: `latest`, `7.4.6`, `YYYYMMDD`
- **Descrição**: Redis customizado com persistência AOF habilitada
- **Porta**: 6379
- **Base**: Redis 7 Alpine

---

## 🚀 Quick Start

### 1. Login no Docker Hub

```bash
docker login
# Username: alaxricard
# Password: [sua senha]
```

### 2. Build e Push (Desenvolvimento)

```bash
# Dar permissão de execução
chmod +x docker-build-and-push.sh

# Executar build e push
./docker-build-and-push.sh
```

O script irá:
- ✅ Construir as imagens do Backend e Redis
- ✅ Taguear com múltiplas versões (latest, data, versão)
- ✅ Enviar para Docker Hub
- ✅ Exibir links para visualização

### 3. Pull (Produção)

```bash
# Dar permissão de execução
chmod +x docker-pull.sh

# Baixar imagens
./docker-pull.sh
```

### 4. Deploy

```bash
# Iniciar containers
docker-compose -f docker-compose.server2.yml up -d

# Verificar status
docker-compose -f docker-compose.server2.yml ps

# Ver logs
docker-compose -f docker-compose.server2.yml logs -f
```

---

## 📦 Estrutura de Tags

### Backend Tags:
```
alaxricard/cdnproxy-backend:latest      # Última versão
alaxricard/cdnproxy-backend:v1.2.3      # Versão específica
alaxricard/cdnproxy-backend:20251025    # Tag por data
```

### Redis Tags:
```
alaxricard/cdnproxy-redis:latest        # Última versão
alaxricard/cdnproxy-redis:7.4.6         # Versão Redis
alaxricard/cdnproxy-redis:20251025      # Tag por data
```

---

## 🔧 Comandos Úteis

### Build Manual

```bash
# Backend
docker build -t alaxricard/cdnproxy-backend:latest ./backend

# Redis
docker build -t alaxricard/cdnproxy-redis:latest ./redis
```

### Push Manual

```bash
# Backend
docker push alaxricard/cdnproxy-backend:latest

# Redis
docker push alaxricard/cdnproxy-redis:latest
```

### Pull Manual

```bash
# Backend
docker pull alaxricard/cdnproxy-backend:latest

# Redis
docker pull alaxricard/cdnproxy-redis:latest
```

### Listar Imagens Locais

```bash
docker images | grep alaxricard
```

### Remover Imagens Locais

```bash
docker rmi alaxricard/cdnproxy-backend:latest
docker rmi alaxricard/cdnproxy-redis:latest
```

---

## 📝 docker-compose.server2.yml

O arquivo foi atualizado para usar as imagens do Docker Hub:

```yaml
services:
  backend:
    image: alaxricard/cdnproxy-backend:latest
    build:
      context: ./backend
      dockerfile: Dockerfile
    # ... resto da configuração

  redis:
    image: alaxricard/cdnproxy-redis:latest
    build:
      context: ./redis
      dockerfile: Dockerfile
    # ... resto da configuração
```

**Comportamento**:
- Se a imagem existir localmente ou no Docker Hub: **usa a imagem**
- Se não existir: **faz o build local**

---

## 🌐 Links Docker Hub

### Backend
- **Repositório**: https://hub.docker.com/r/alaxricard/cdnproxy-backend
- **Tags**: https://hub.docker.com/r/alaxricard/cdnproxy-backend/tags

### Redis
- **Repositório**: https://hub.docker.com/r/alaxricard/cdnproxy-redis
- **Tags**: https://hub.docker.com/r/alaxricard/cdnproxy-redis/tags

---

## 🔐 Configuração de Credenciais

### Método 1: Login Interativo

```bash
docker login
```

### Método 2: Login com Token

```bash
docker login -u alaxricard -p YOUR_TOKEN
```

### Método 3: Arquivo de Configuração

```bash
# ~/.docker/config.json
{
  "auths": {
    "https://index.docker.io/v1/": {
      "auth": "base64_encoded_credentials"
    }
  }
}
```

---

## 📊 Workflow de CI/CD

### 1. Desenvolvimento Local

```bash
# 1. Fazer alterações no código
# 2. Testar localmente
docker-compose -f docker-compose.server2.yml up --build

# 3. Build e push para Docker Hub
./docker-build-and-push.sh
```

### 2. Deploy em Produção

```bash
# No servidor de produção
# 1. Pull das imagens
./docker-pull.sh

# 2. Parar containers antigos
docker-compose -f docker-compose.server2.yml down

# 3. Iniciar com novas imagens
docker-compose -f docker-compose.server2.yml up -d

# 4. Verificar
docker-compose -f docker-compose.server2.yml logs -f
```

---

## 🎯 Vantagens do Docker Hub

### ✅ Benefícios:
1. **Deploy Rápido**: Pull de imagens é mais rápido que build
2. **Consistência**: Mesma imagem em dev e prod
3. **Versionamento**: Controle de versões via tags
4. **Rollback Fácil**: Voltar para versão anterior rapidamente
5. **Distribuição**: Compartilhar com time facilmente
6. **CI/CD**: Integração com pipelines automatizados

### 📈 Comparação:

| Aspecto | Sem Docker Hub | Com Docker Hub |
|---------|----------------|----------------|
| **Deploy** | 3-5 min (build) | 30s (pull) |
| **Consistência** | ⚠️ Variável | ✅ Garantida |
| **Rollback** | ❌ Difícil | ✅ Fácil |
| **Versionamento** | ⚠️ Manual | ✅ Automático |
| **Distribuição** | ❌ Complexo | ✅ Simples |

---

## 🐛 Troubleshooting

### Erro: "denied: requested access to the resource is denied"

**Solução**:
```bash
# Fazer login novamente
docker logout
docker login
```

### Erro: "manifest unknown"

**Solução**:
```bash
# Verificar se a tag existe
docker pull alaxricard/cdnproxy-backend:latest --platform linux/amd64
```

### Erro: "cannot connect to Docker daemon"

**Solução**:
```bash
# Iniciar Docker
sudo systemctl start docker

# Ou no Mac/Windows
# Abrir Docker Desktop
```

### Build Lento

**Solução**:
```bash
# Usar buildkit
export DOCKER_BUILDKIT=1

# Limpar cache
docker builder prune -a
```

---

## 📋 Checklist de Deploy

### Antes do Deploy:
- [ ] Código testado localmente
- [ ] Build local sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados migrado (se necessário)
- [ ] Backup realizado

### Durante o Deploy:
- [ ] Login no Docker Hub OK
- [ ] Build e push bem-sucedido
- [ ] Tags corretas aplicadas
- [ ] Imagens verificadas no Docker Hub

### Após o Deploy:
- [ ] Pull no servidor de produção
- [ ] Containers iniciados
- [ ] Health checks passando
- [ ] Logs sem erros
- [ ] Aplicação acessível
- [ ] Testes de funcionalidade OK

---

## 🔄 Atualizações

### Para atualizar as imagens:

```bash
# 1. Fazer alterações no código
# 2. Build e push
./docker-build-and-push.sh

# 3. No servidor, pull e restart
./docker-pull.sh
docker-compose -f docker-compose.server2.yml up -d --force-recreate
```

---

## 📞 Suporte

- **Docker Hub**: https://hub.docker.com/u/alaxricard
- **Documentação**: Este arquivo
- **Logs**: `docker-compose logs -f`

---

**Última atualização**: 25/10/2025  
**Versão**: 1.2.3  
**Maintainer**: alaxricard
# 🐋 Docker Hub Setup - CDNProxy

## 📋 Informações das Imagens

### Backend
- **Imagem**: `alaxricard/cdnproxy-backend`
- **Tags**: `latest`, `v1.2.3`, `YYYYMMDD`
- **Descrição**: Backend Nuxt.js com APIs REST, autenticação e sistema PIX
- **Porta**: 5001
- **Base**: Node.js 20 Alpine

### Redis
- **Imagem**: `alaxricard/cdnproxy-redis`
- **Tags**: `latest`, `7.4.6`, `YYYYMMDD`
- **Descrição**: Redis customizado com persistência AOF habilitada
- **Porta**: 6379
- **Base**: Redis 7 Alpine

---

## 🚀 Quick Start

### 1. Login no Docker Hub

```bash
docker login
# Username: alaxricard
# Password: [sua senha]
```

### 2. Build e Push (Desenvolvimento)

```bash
# Dar permissão de execução
chmod +x docker-build-and-push.sh

# Executar build e push
./docker-build-and-push.sh
```

O script irá:
- ✅ Construir as imagens do Backend e Redis
- ✅ Taguear com múltiplas versões (latest, data, versão)
- ✅ Enviar para Docker Hub
- ✅ Exibir links para visualização

### 3. Pull (Produção)

```bash
# Dar permissão de execução
chmod +x docker-pull.sh

# Baixar imagens
./docker-pull.sh
```

### 4. Deploy

```bash
# Iniciar containers
docker-compose -f docker-compose.server2.yml up -d

# Verificar status
docker-compose -f docker-compose.server2.yml ps

# Ver logs
docker-compose -f docker-compose.server2.yml logs -f
```

---

## 📦 Estrutura de Tags

### Backend Tags:
```
alaxricard/cdnproxy-backend:latest      # Última versão
alaxricard/cdnproxy-backend:v1.2.3      # Versão específica
alaxricard/cdnproxy-backend:20251025    # Tag por data
```

### Redis Tags:
```
alaxricard/cdnproxy-redis:latest        # Última versão
alaxricard/cdnproxy-redis:7.4.6         # Versão Redis
alaxricard/cdnproxy-redis:20251025      # Tag por data
```

---

## 🔧 Comandos Úteis

### Build Manual

```bash
# Backend
docker build -t alaxricard/cdnproxy-backend:latest ./backend

# Redis
docker build -t alaxricard/cdnproxy-redis:latest ./redis
```

### Push Manual

```bash
# Backend
docker push alaxricard/cdnproxy-backend:latest

# Redis
docker push alaxricard/cdnproxy-redis:latest
```

### Pull Manual

```bash
# Backend
docker pull alaxricard/cdnproxy-backend:latest

# Redis
docker pull alaxricard/cdnproxy-redis:latest
```

### Listar Imagens Locais

```bash
docker images | grep alaxricard
```

### Remover Imagens Locais

```bash
docker rmi alaxricard/cdnproxy-backend:latest
docker rmi alaxricard/cdnproxy-redis:latest
```

---

## 📝 docker-compose.server2.yml

O arquivo foi atualizado para usar as imagens do Docker Hub:

```yaml
services:
  backend:
    image: alaxricard/cdnproxy-backend:latest
    build:
      context: ./backend
      dockerfile: Dockerfile
    # ... resto da configuração

  redis:
    image: alaxricard/cdnproxy-redis:latest
    build:
      context: ./redis
      dockerfile: Dockerfile
    # ... resto da configuração
```

**Comportamento**:
- Se a imagem existir localmente ou no Docker Hub: **usa a imagem**
- Se não existir: **faz o build local**

---

## 🌐 Links Docker Hub

### Backend
- **Repositório**: https://hub.docker.com/r/alaxricard/cdnproxy-backend
- **Tags**: https://hub.docker.com/r/alaxricard/cdnproxy-backend/tags

### Redis
- **Repositório**: https://hub.docker.com/r/alaxricard/cdnproxy-redis
- **Tags**: https://hub.docker.com/r/alaxricard/cdnproxy-redis/tags

---

## 🔐 Configuração de Credenciais

### Método 1: Login Interativo

```bash
docker login
```

### Método 2: Login com Token

```bash
docker login -u alaxricard -p YOUR_TOKEN
```

### Método 3: Arquivo de Configuração

```bash
# ~/.docker/config.json
{
  "auths": {
    "https://index.docker.io/v1/": {
      "auth": "base64_encoded_credentials"
    }
  }
}
```

---

## 📊 Workflow de CI/CD

### 1. Desenvolvimento Local

```bash
# 1. Fazer alterações no código
# 2. Testar localmente
docker-compose -f docker-compose.server2.yml up --build

# 3. Build e push para Docker Hub
./docker-build-and-push.sh
```

### 2. Deploy em Produção

```bash
# No servidor de produção
# 1. Pull das imagens
./docker-pull.sh

# 2. Parar containers antigos
docker-compose -f docker-compose.server2.yml down

# 3. Iniciar com novas imagens
docker-compose -f docker-compose.server2.yml up -d

# 4. Verificar
docker-compose -f docker-compose.server2.yml logs -f
```

---

## 🎯 Vantagens do Docker Hub

### ✅ Benefícios:
1. **Deploy Rápido**: Pull de imagens é mais rápido que build
2. **Consistência**: Mesma imagem em dev e prod
3. **Versionamento**: Controle de versões via tags
4. **Rollback Fácil**: Voltar para versão anterior rapidamente
5. **Distribuição**: Compartilhar com time facilmente
6. **CI/CD**: Integração com pipelines automatizados

### 📈 Comparação:

| Aspecto | Sem Docker Hub | Com Docker Hub |
|---------|----------------|----------------|
| **Deploy** | 3-5 min (build) | 30s (pull) |
| **Consistência** | ⚠️ Variável | ✅ Garantida |
| **Rollback** | ❌ Difícil | ✅ Fácil |
| **Versionamento** | ⚠️ Manual | ✅ Automático |
| **Distribuição** | ❌ Complexo | ✅ Simples |

---

## 🐛 Troubleshooting

### Erro: "denied: requested access to the resource is denied"

**Solução**:
```bash
# Fazer login novamente
docker logout
docker login
```

### Erro: "manifest unknown"

**Solução**:
```bash
# Verificar se a tag existe
docker pull alaxricard/cdnproxy-backend:latest --platform linux/amd64
```

### Erro: "cannot connect to Docker daemon"

**Solução**:
```bash
# Iniciar Docker
sudo systemctl start docker

# Ou no Mac/Windows
# Abrir Docker Desktop
```

### Build Lento

**Solução**:
```bash
# Usar buildkit
export DOCKER_BUILDKIT=1

# Limpar cache
docker builder prune -a
```

---

## 📋 Checklist de Deploy

### Antes do Deploy:
- [ ] Código testado localmente
- [ ] Build local sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados migrado (se necessário)
- [ ] Backup realizado

### Durante o Deploy:
- [ ] Login no Docker Hub OK
- [ ] Build e push bem-sucedido
- [ ] Tags corretas aplicadas
- [ ] Imagens verificadas no Docker Hub

### Após o Deploy:
- [ ] Pull no servidor de produção
- [ ] Containers iniciados
- [ ] Health checks passando
- [ ] Logs sem erros
- [ ] Aplicação acessível
- [ ] Testes de funcionalidade OK

---

## 🔄 Atualizações

### Para atualizar as imagens:

```bash
# 1. Fazer alterações no código
# 2. Build e push
./docker-build-and-push.sh

# 3. No servidor, pull e restart
./docker-pull.sh
docker-compose -f docker-compose.server2.yml up -d --force-recreate
```

---

## 📞 Suporte

- **Docker Hub**: https://hub.docker.com/u/alaxricard
- **Documentação**: Este arquivo
- **Logs**: `docker-compose logs -f`

---

**Última atualização**: 25/10/2025  
**Versão**: 1.2.3  
**Maintainer**: alaxricard
