#!/bin/bash

# Script de Deploy para Produção - CDNProxy
# Autor: Sistema CDNProxy
# Data: $(date)

set -e

echo "🚀 Iniciando deploy para produção..."

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.production.yml"
ENV_FILE="$PROJECT_DIR/.env.production.docker"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_FILE="$PROJECT_DIR/logs/deploy.log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
        "DEBUG")
            echo -e "${BLUE}[DEBUG]${NC} $message"
            ;;
    esac
    
    # Log para arquivo
    mkdir -p "$(dirname "$LOG_FILE")"
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Função para verificar dependências
check_dependencies() {
    log "INFO" "Verificando dependências..."
    
    local deps=("docker" "docker-compose" "curl" "jq")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log "ERROR" "Dependência não encontrada: $dep"
            exit 1
        fi
    done
    
    log "INFO" "Todas as dependências estão instaladas"
}

# Função para verificar arquivos necessários
check_files() {
    log "INFO" "Verificando arquivos necessários..."
    
    local files=("$COMPOSE_FILE" "$ENV_FILE")
    for file in "${files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log "ERROR" "Arquivo não encontrado: $file"
            exit 1
        fi
    done
    
    log "INFO" "Todos os arquivos necessários estão presentes"
}

# Função para criar backup
create_backup() {
    log "INFO" "Criando backup..."
    
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$backup_path"
    
    # Backup dos volumes Docker
    if docker-compose -f "$COMPOSE_FILE" ps -q app &> /dev/null; then
        log "INFO" "Fazendo backup dos dados da aplicação..."
        docker run --rm \
            -v proxycdn_app_data:/source:ro \
            -v "$backup_path":/backup \
            alpine:latest \
            tar czf /backup/app_data.tar.gz -C /source .
    fi
    
    if docker-compose -f "$COMPOSE_FILE" ps -q redis &> /dev/null; then
        log "INFO" "Fazendo backup do Redis..."
        docker run --rm \
            -v proxycdn_redis_data:/source:ro \
            -v "$backup_path":/backup \
            alpine:latest \
            tar czf /backup/redis_data.tar.gz -C /source .
    fi
    
    # Backup dos certificados SSL
    if [[ -d "/etc/letsencrypt" ]]; then
        log "INFO" "Fazendo backup dos certificados SSL..."
        sudo tar czf "$backup_path/ssl_certs.tar.gz" -C /etc/letsencrypt .
    fi
    
    # Backup dos arquivos de configuração
    log "INFO" "Fazendo backup das configurações..."
    cp "$COMPOSE_FILE" "$backup_path/"
    cp "$ENV_FILE" "$backup_path/"
    
    log "INFO" "Backup criado em: $backup_path"
    echo "$backup_path"
}

# Função para verificar saúde da aplicação
health_check() {
    log "INFO" "Verificando saúde da aplicação..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost/api/health &> /dev/null; then
            log "INFO" "Aplicação está saudável"
            return 0
        fi
        
        log "DEBUG" "Tentativa $attempt/$max_attempts - Aguardando aplicação..."
        sleep 10
        ((attempt++))
    done
    
    log "ERROR" "Aplicação não respondeu após $max_attempts tentativas"
    return 1
}

# Função para deploy
deploy() {
    log "INFO" "Iniciando deploy da aplicação..."
    
    # Verificações pré-deploy
    check_dependencies
    check_files
    
    # Criar backup antes do deploy
    local backup_path
    backup_path=$(create_backup)
    
    # Pull das imagens mais recentes
    log "INFO" "Atualizando imagens Docker..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Build da aplicação se necessário
    if [[ "${BUILD:-false}" == "true" ]]; then
        log "INFO" "Fazendo build da aplicação..."
        docker-compose -f "$COMPOSE_FILE" build --no-cache
    fi
    
    # Deploy com zero downtime
    log "INFO" "Fazendo deploy da aplicação..."
    docker-compose -f "$COMPOSE_FILE" up -d --remove-orphans
    
    # Verificar saúde da aplicação
    if health_check; then
        log "INFO" "Deploy realizado com sucesso!"
        
        # Limpeza de imagens antigas
        log "INFO" "Limpando imagens antigas..."
        docker image prune -f
        
        return 0
    else
        log "ERROR" "Deploy falhou - fazendo rollback..."
        rollback "$backup_path"
        return 1
    fi
}

# Função para rollback
rollback() {
    local backup_path=${1:-}
    
    if [[ -z "$backup_path" ]]; then
        log "ERROR" "Caminho do backup não fornecido para rollback"
        return 1
    fi
    
    log "WARN" "Iniciando rollback..."
    
    # Parar serviços atuais
    docker-compose -f "$COMPOSE_FILE" down
    
    # Restaurar dados se existirem
    if [[ -f "$backup_path/app_data.tar.gz" ]]; then
        log "INFO" "Restaurando dados da aplicação..."
        docker run --rm \
            -v proxycdn_app_data:/target \
            -v "$backup_path":/backup \
            alpine:latest \
            tar xzf /backup/app_data.tar.gz -C /target
    fi
    
    if [[ -f "$backup_path/redis_data.tar.gz" ]]; then
        log "INFO" "Restaurando dados do Redis..."
        docker run --rm \
            -v proxycdn_redis_data:/target \
            -v "$backup_path":/backup \
            alpine:latest \
            tar xzf /backup/redis_data.tar.gz -C /target
    fi
    
    # Restaurar configurações
    if [[ -f "$backup_path/docker-compose.production.yml" ]]; then
        cp "$backup_path/docker-compose.production.yml" "$COMPOSE_FILE"
    fi
    
    if [[ -f "$backup_path/.env.production.docker" ]]; then
        cp "$backup_path/.env.production.docker" "$ENV_FILE"
    fi
    
    # Reiniciar serviços
    docker-compose -f "$COMPOSE_FILE" up -d
    
    if health_check; then
        log "INFO" "Rollback realizado com sucesso"
        return 0
    else
        log "ERROR" "Rollback falhou"
        return 1
    fi
}

# Função para parar aplicação
stop() {
    log "INFO" "Parando aplicação..."
    docker-compose -f "$COMPOSE_FILE" down
    log "INFO" "Aplicação parada"
}

# Função para iniciar aplicação
start() {
    log "INFO" "Iniciando aplicação..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    if health_check; then
        log "INFO" "Aplicação iniciada com sucesso"
    else
        log "ERROR" "Falha ao iniciar aplicação"
        return 1
    fi
}

# Função para restart
restart() {
    log "INFO" "Reiniciando aplicação..."
    stop
    start
}

# Função para mostrar status
status() {
    log "INFO" "Status da aplicação:"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    log "INFO" "Uso de recursos:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# Função para mostrar logs
logs() {
    local service=${1:-}
    local lines=${2:-100}
    
    if [[ -n "$service" ]]; then
        log "INFO" "Logs do serviço $service (últimas $lines linhas):"
        docker-compose -f "$COMPOSE_FILE" logs --tail="$lines" "$service"
    else
        log "INFO" "Logs de todos os serviços (últimas $lines linhas):"
        docker-compose -f "$COMPOSE_FILE" logs --tail="$lines"
    fi
}

# Função para limpeza
cleanup() {
    log "INFO" "Executando limpeza..."
    
    # Remover containers parados
    docker container prune -f
    
    # Remover imagens não utilizadas
    docker image prune -f
    
    # Remover volumes não utilizados (cuidado!)
    if [[ "${CLEANUP_VOLUMES:-false}" == "true" ]]; then
        log "WARN" "Removendo volumes não utilizados..."
        docker volume prune -f
    fi
    
    # Remover networks não utilizadas
    docker network prune -f
    
    # Limpar logs antigos (mais de 30 dias)
    find "$PROJECT_DIR/logs" -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    # Limpar backups antigos (mais de 7 dias)
    find "$BACKUP_DIR" -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
    
    log "INFO" "Limpeza concluída"
}

# Função para mostrar ajuda
show_help() {
    cat << EOF
ProxyCDN Production Deploy Script

Uso: $0 [COMANDO] [OPÇÕES]

Comandos:
    deploy      Faz deploy da aplicação (padrão)
    start       Inicia a aplicação
    stop        Para a aplicação
    restart     Reinicia a aplicação
    status      Mostra status da aplicação
    logs        Mostra logs da aplicação
    rollback    Faz rollback para backup específico
    cleanup     Limpa recursos não utilizados
    backup      Cria backup manual
    help        Mostra esta ajuda

Opções:
    --build     Força rebuild das imagens (apenas para deploy)
    --service   Especifica serviço para logs (app, nginx, redis, etc.)
    --lines     Número de linhas para logs (padrão: 100)
    --backup    Caminho do backup para rollback

Exemplos:
    $0 deploy --build
    $0 logs --service app --lines 50
    $0 rollback --backup /path/to/backup
    $0 cleanup

Variáveis de ambiente:
    BUILD=true              Força rebuild durante deploy
    CLEANUP_VOLUMES=true    Permite limpeza de volumes durante cleanup

EOF
}

# Função principal
main() {
    local command=${1:-deploy}
    shift || true
    
    # Parse de argumentos
    while [[ $# -gt 0 ]]; do
        case $1 in
            --build)
                export BUILD=true
                shift
                ;;
            --service)
                SERVICE="$2"
                shift 2
                ;;
            --lines)
                LINES="$2"
                shift 2
                ;;
            --backup)
                BACKUP_PATH="$2"
                shift 2
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log "ERROR" "Opção desconhecida: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Executar comando
    case $command in
        deploy)
            deploy
            ;;
        start)
            start
            ;;
        stop)
            stop
            ;;
        restart)
            restart
            ;;
        status)
            status
            ;;
        logs)
            logs "${SERVICE:-}" "${LINES:-100}"
            ;;
        rollback)
            if [[ -z "${BACKUP_PATH:-}" ]]; then
                log "ERROR" "Caminho do backup é obrigatório para rollback"
                exit 1
            fi
            rollback "$BACKUP_PATH"
            ;;
        cleanup)
            cleanup
            ;;
        backup)
            create_backup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log "ERROR" "Comando desconhecido: $command"
            show_help
            exit 1
            ;;
    esac
}

# Executar apenas se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi