# 🚀 Guia de Deploy - Servidor 1 (Frontend + Proxy Server)

## 📋 Visão Geral

Este guia detalha como instalar e configurar o **Servidor 1** da arquitetura CDN Proxy, que hospeda:

- **Frontend Nuxt.js** (porta 3000)
- **Proxy Server** (porta 8080) 
- **Nginx** (portas 80/443)

## 🏗️ Arquitetura do Servidor 1

```
┌─────────────────────────────────────────────────────────┐
│                    SERVIDOR 1                          │
│                https://app.cdnproxy.top                │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ aaPanel     │  │  Frontend   │  │ Proxy Server│    │
│  │ Nginx       │  │    :3000    │  │    :8080    │    │
│  │ :80/:443    │  │  (Docker)   │  │  (Docker)   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│         │               │               │              │
│         └───────────────┼───────────────┘              │
│                    Docker Network                      │
└─────────────────────────────────────────────────────────┘
                         │
                    Comunicação
                         │
┌─────────────────────────────────────────────────────────┐
│                    SERVIDOR 2                          │
│                https://api.cdnproxy.top                │
│              Backend + Redis                           │
└─────────────────────────────────────────────────────────┘
```

**Observação:** O Nginx do aaPanel gerencia SSL e proxy reverso, enquanto os containers Docker executam apenas o frontend e proxy server.

## 📦 Pré-requisitos

### Sistema Operacional
- Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- Mínimo 2GB RAM, 20GB disco
- Acesso root ou sudo

### Software Necessário
- Docker 20.10+
- Docker Compose 2.0+
- Git
- Curl
- aaPanel (recomendado)

### Domínios e DNS
- `app.cdnproxy.top` → IP do Servidor 1
- `proxy.cdnproxy.top` → IP do Servidor 1 (opcional)

### Certificados SSL
- Certificado para `app.cdnproxy.top`
- Certificado para `proxy.cdnproxy.top` (opcional)

## 🔧 Preparação do Ambiente

### 1. Instalar Docker (se necessário)

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Reiniciar sessão ou executar:
newgrp docker
```

### 2. Instalar Docker Compose (se necessário)

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Verificar Instalação

```bash
docker --version
docker-compose --version
```

## 📁 Preparação dos Arquivos

### 1. Estrutura de Diretórios

Crie a seguinte estrutura no servidor:

```
/www/wwwroot/CDNProxy/
├── frontend/
│   ├── .env.production
│   ├── Dockerfile
│   └── [arquivos do frontend]
├── backend/
│   └── utils/
│       └── [utilitários necessários]
├── ssl/
│   ├── app.cdnproxy.top.crt
│   └── app.cdnproxy.top.key
├── docker-compose.server1.yml
├── Dockerfile.proxy
├── proxy-server.js
├── nginx.server1.conf
└── install-server1.sh
```

### 2. Arquivos Essenciais para Upload

**Arquivos obrigatórios:**
- `docker-compose.server1.yml`
- `Dockerfile.proxy`
- `proxy-server.js`
- `nginx.server1.conf`
- `install-server1.sh`
- `frontend/` (pasta completa)
- `backend/utils/` (utilitários necessários)

**Arquivos de configuração:**
- `frontend/.env.production`
- `ssl/app.cdnproxy.top.crt`
- `ssl/app.cdnproxy.top.key`

## 🚀 Processo de Instalação

### 1. Upload dos Arquivos

**Via SCP/SFTP (com porta personalizada):**

### Opção 1: Transferência Direta de Pasta
```bash
# Do seu computador local - usando porta 22009
scp -P 22009 -r CDNProxy/ root@102.216.82.183:/www/wwwroot/
```

### Opção 2: Arquivo ZIP (Recomendado para pastas grandes)
```bash
# 1. Criar o arquivo zip da pasta
zip -r CDNProxy.zip CDNProxy/

# 2. Enviar o arquivo zip
scp -P 22009 CDNProxy.zip root@102.216.82.183:/www/wwwroot/

# 3. Conectar no servidor e descompactar
ssh -p 22009 root@102.216.82.183
cd /www/wwwroot/
unzip CDNProxy.zip
```

### Opção 3: Arquivo TAR.GZ (Mais Eficiente)
```bash
# 1. Criar arquivo tar.gz (melhor compressão)
tar -czf CDNProxy.tar.gz CDNProxy/

# 2. Enviar o arquivo compactado
scp -P 22009 CDNProxy.tar.gz root@102.216.82.183:/www/wwwroot/

# 3. Conectar no servidor e descompactar
ssh -p 22009 root@102.216.82.183
cd /www/wwwroot/
tar -xzf CDNProxy.tar.gz
```

### Opção 4: Tudo em Uma Linha (Pipeline)
```bash
# Comprimir, enviar e descompactar em um comando
tar -czf - CDNProxy/ | ssh -p 22009 root@102.216.82.183 "cd /www/wwwroot/ && tar -xzf -"
```

### Opção 5: Rsync (Sincronização Avançada)
```bash
# Sincronização com exclusões e progresso
rsync -avz --progress --exclude='node_modules' --exclude='.git' --exclude='.nuxt' \
  -e "ssh -p 22009" CDNProxy/ root@102.216.82.183:/www/wwwroot/CDNProxy/
```

### Opção 6: SCP com Múltiplos Arquivos Específicos
```bash
# Enviar apenas arquivos essenciais
scp -P 22009 docker-compose.server1.yml Dockerfile.proxy proxy-server.js \
  nginx.server1.conf install-server1.sh root@102.216.82.183:/www/wwwroot/CDNProxy/

# Enviar pasta frontend separadamente
scp -P 22009 -r frontend/ root@102.216.82.183:/www/wwwroot/CDNProxy/
```

### Opção 7: SFTP Interativo
```bash
# Conectar via SFTP
sftp -P 22009 root@102.216.82.183

# Comandos SFTP:
# put -r CDNProxy /www/wwwroot/
# put arquivo.zip /www/wwwroot/
# quit
```

### Opção 8: SCP com Compressão em Tempo Real
```bash
# Compressão durante a transferência
scp -P 22009 -C -r CDNProxy/ root@102.216.82.183:/www/wwwroot/
```

### Opção 9: SCP com Preservação de Atributos
```bash
# Preservar timestamps e permissões
scp -P 22009 -p -r CDNProxy/ root@102.216.82.183:/www/wwwroot/
```

### Opção 10: SCP com Limite de Largura de Banda
```bash
# Limitar a 1MB/s para não sobrecarregar a conexão
scp -P 22009 -l 8192 -r CDNProxy/ root@102.216.82.183:/www/wwwroot/
```

### Comparação de Métodos

| Método | Velocidade | Compressão | Facilidade | Recomendado Para |
|--------|------------|------------|------------|------------------|
| SCP Direto | Média | Nenhuma | Alta | Arquivos pequenos |
| ZIP | Rápida | Boa | Alta | Uso geral |
| TAR.GZ | Rápida | Excelente | Alta | Arquivos grandes |
| Pipeline | Muito Rápida | Excelente | Média | Usuários avançados |
| Rsync | Muito Rápida | Nenhuma | Média | Sincronização |
| SFTP | Média | Nenhuma | Baixa | Transferência interativa |
| SCP -C | Média | Automática | Alta | Conexões lentas |
| SCP -p | Média | Nenhuma | Alta | Preservar metadados |
| SCP -l | Controlada | Nenhuma | Alta | Conexões limitadas |

### Dicas de Performance

**Para conexões lentas:**
```bash
# Use compressão e limite de banda
scp -P 22009 -C -l 4096 -r CDNProxy/ root@102.216.82.183:/www/wwwroot/
```

**Para arquivos grandes:**
```bash
# Use tar.gz com pipeline
tar -czf - CDNProxy/ | ssh -p 22009 root@102.216.82.183 "cd /www/wwwroot/ && tar -xzf -"
```

**Para sincronização incremental:**
```bash
# Use rsync para atualizações
rsync -avz --progress --delete -e "ssh -p 22009" CDNProxy/ root@102.216.82.183:/www/wwwroot/CDNProxy/
```

**Via Git (recomendado):**
```bash
# No servidor
cd /www/wwwroot/
git clone https://github.com/SEU_USUARIO/CDNProxy.git
cd CDNProxy
```

### 2. Configurar Permissões

```bash
cd /www/wwwroot/CDNProxy
chmod +x install-server1.sh
chmod 600 ssl/*.key
chmod 644 ssl/*.crt
```

### 3. Executar Instalação

```bash
./install-server1.sh
```

### 4. Verificar Instalação

```bash
# Verificar containers
docker-compose -f docker-compose.server1.yml ps

# Verificar logs
docker-compose -f docker-compose.server1.yml logs -f

# Testar serviços
curl http://localhost:3000
curl http://localhost:8080/health
```

## ⚙️ Configuração do aaPanel

### 1. Configurar Proxy Reverso

No aaPanel, vá para **Website** → **Add Site**:

**Site 1: Frontend**
- Domain: `app.cdnproxy.top`
- Proxy: `http://127.0.0.1:3000`
- SSL: Ativar com certificado

**Site 2: Proxy Server (opcional)**
- Domain: `proxy.cdnproxy.top`  
- Proxy: `http://127.0.0.1:8080`
- SSL: Ativar com certificado

### 2. Configuração SSL

**Importante:** Como estamos usando aaPanel, os certificados SSL devem estar no caminho padrão do aaPanel:

```bash
# Os certificados devem estar em:
/www/server/panel/vhost/cert/app.cdnproxy.top/fullchain.pem
/www/server/panel/vhost/cert/app.cdnproxy.top/privkey.pem

# O nginx.server1.conf já está configurado para usar estes caminhos
```

### 3. Configuração Nginx (Alternativa)

Se não usar aaPanel, configure manualmente:

```nginx
# /etc/nginx/sites-available/app.cdnproxy.top
server {
    listen 80;
    server_name app.cdnproxy.top;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.cdnproxy.top;
    
    ssl_certificate /path/to/app.cdnproxy.top.crt;
    ssl_certificate_key /path/to/app.cdnproxy.top.key;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔍 Verificação e Testes

### 1. Testes Básicos

```bash
# Testar frontend
curl -I http://localhost:3000

# Testar proxy server
curl -I http://localhost:8080/health

# Testar via domínio
curl -I https://app.cdnproxy.top
```

### 2. Verificar Logs

```bash
# Logs gerais
docker-compose -f docker-compose.server1.yml logs

# Logs específicos
docker-compose -f docker-compose.server1.yml logs frontend
docker-compose -f docker-compose.server1.yml logs proxy
docker-compose -f docker-compose.server1.yml logs nginx
```

### 3. Monitoramento

```bash
# Status dos containers
docker-compose -f docker-compose.server1.yml ps

# Uso de recursos
docker stats

# Health checks
docker-compose -f docker-compose.server1.yml exec frontend curl -f http://localhost:3000/health
docker-compose -f docker-compose.server1.yml exec proxy curl -f http://localhost:8080/health
```

## 🛠️ Comandos Úteis

### Gerenciamento de Containers

```bash
# Iniciar serviços
docker-compose -f docker-compose.server1.yml up -d

# Parar serviços
docker-compose -f docker-compose.server1.yml down

# Reiniciar serviços
docker-compose -f docker-compose.server1.yml restart

# Reconstruir e iniciar
docker-compose -f docker-compose.server1.yml up --build -d

# Ver logs em tempo real
docker-compose -f docker-compose.server1.yml logs -f

# Executar comandos nos containers
docker-compose -f docker-compose.server1.yml exec frontend bash
docker-compose -f docker-compose.server1.yml exec proxy sh
```

### Manutenção

```bash
# Limpar containers parados
docker container prune

# Limpar imagens não utilizadas
docker image prune

# Limpar volumes não utilizados
docker volume prune

# Backup de volumes
docker run --rm -v cdnproxy_data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz -C /data .
```

## 🔧 Troubleshooting

### Problemas Comuns

**1. Container não inicia**
```bash
# Verificar logs
docker-compose -f docker-compose.server1.yml logs [service_name]

# Verificar configuração
docker-compose -f docker-compose.server1.yml config
```

**2. Erro de permissão SSL**
```bash
chmod 600 ssl/*.key
chmod 644 ssl/*.crt
chown root:root ssl/*
```

**3. Proxy não funciona**
```bash
# Verificar se o backend está acessível
curl https://api.cdnproxy.top/api/health

# Verificar configuração do Supabase
docker-compose -f docker-compose.server1.yml exec proxy env | grep SUPABASE
```

**4. Frontend não carrega**
```bash
# Verificar variáveis de ambiente
docker-compose -f docker-compose.server1.yml exec frontend env | grep NUXT

# Reconstruir frontend
docker-compose -f docker-compose.server1.yml up --build frontend
```

### Logs Importantes

```bash
# Logs do sistema
journalctl -u docker
tail -f /var/log/nginx/error.log

# Logs dos containers
docker-compose -f docker-compose.server1.yml logs --tail=100 frontend
docker-compose -f docker-compose.server1.yml logs --tail=100 proxy
```

## 📊 Monitoramento de Performance

### Métricas dos Containers

```bash
# Uso de recursos em tempo real
docker stats

# Informações detalhadas
docker-compose -f docker-compose.server1.yml exec frontend top
docker-compose -f docker-compose.server1.yml exec proxy top
```

### Health Checks

```bash
# Status de saúde
docker-compose -f docker-compose.server1.yml ps

# Testar endpoints
curl -f http://localhost:3000/health
curl -f http://localhost:8080/health
```

## 🔄 Atualizações

### Atualizar Código

```bash
# Via Git
git pull origin main

# Reconstruir containers
docker-compose -f docker-compose.server1.yml up --build -d
```

### Atualizar Configurações

```bash
# Editar configurações
nano frontend/.env.production

# Reiniciar serviços
docker-compose -f docker-compose.server1.yml restart
```

## 📞 Suporte

### Informações de Debug

Ao reportar problemas, inclua:

```bash
# Versões
docker --version
docker-compose --version

# Status dos containers
docker-compose -f docker-compose.server1.yml ps

# Logs recentes
docker-compose -f docker-compose.server1.yml logs --tail=50

# Configuração
docker-compose -f docker-compose.server1.yml config
```

### Contatos

- **Documentação**: Este arquivo
- **Logs**: `/www/wwwroot/CDNProxy/logs/`
- **Configurações**: `/www/wwwroot/CDNProxy/`

---

## ✅ Checklist de Deploy

- [ ] Docker e Docker Compose instalados
- [ ] Arquivos do projeto enviados para o servidor
- [ ] Certificados SSL configurados
- [ ] Variáveis de ambiente configuradas
- [ ] Script de instalação executado
- [ ] Containers iniciados com sucesso
- [ ] aaPanel configurado (se aplicável)
- [ ] Testes de conectividade realizados
- [ ] Domínios apontando para o servidor
- [ ] SSL funcionando corretamente
- [ ] Comunicação com Servidor 2 testada

**🎉 Deploy concluído com sucesso!**