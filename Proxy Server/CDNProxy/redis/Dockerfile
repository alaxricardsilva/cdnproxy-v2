# Dockerfile customizado para Redis - CDNProxy
FROM redis:7-alpine

# Metadata
LABEL maintainer="alaxricard"
LABEL description="Redis customizado para CDNProxy"
LABEL version="7.4.6"

# Criar diretório de dados
RUN mkdir -p /data && chown redis:redis /data

# Expor porta padrão do Redis
EXPOSE 6379

# Volume para persistência
VOLUME ["/data"]

# Comando padrão com AOF (Append Only File) habilitado
CMD ["redis-server", "--appendonly", "yes"]
