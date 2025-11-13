#!/bin/bash

# Script Interativo para Gerenciamento do Projeto

PROJECT_DIR="/www/wwwroot/CDNProxy_v2"
LOG_FILE="/var/log/cdnproxy_manage.log"
TIMEZONE="America/Sao_Paulo"

# Configurar fuso horário para os logs
export TZ=$TIMEZONE

function log() {
    local message="$1"
    echo "$(date '+%d/%m/%Y %H:%M:%S') - $message" | tee -a $LOG_FILE
}

function deploy() {
    log "Iniciando deploy..."
    cd "$PROJECT_DIR/frontend"
    npm install
    npm run build
    pm2 start npm --name "frontend" -- run start

    cd "$PROJECT_DIR/backend"
    npm install
    pm2 start npm --name "backend" -- run start

    cd "$PROJECT_DIR"
    pm2 delete proxy-server
    pm2 start proxy-server-fastify.js --name "proxy-server-fastify" --watch

    log "Deploy concluído."
    log "Resumo do status dos serviços:"
    pm2 status | tee -a $LOG_FILE

    log "Testando conexões..."
    test_connection "Frontend" "http://127.0.0.1:3000"
    test_connection "Backend" "http://127.0.0.1:5001"
    test_connection "Proxy" "http://127.0.0.1:8080/health"
}

function test_connection() {
    local service_name="$1"
    local url="$2"
    log "Testando conexão com $service_name em $url..."
    curl -I $url 2>&1 | tee -a $LOG_FILE
}

function monitor() {
    log "Monitorando processos PM2..."
    pm2 monit
}

function interactive_menu() {
    log "Escolha uma opção:"
    echo "1 - Deploy do sistema"
    echo "2 - Monitorar processos"
    echo "3 - Verificar status dos serviços"
    echo "4 - Limpar processos PM2"
    echo "5 - Sair"

    read -p "Digite o número da opção desejada: " option

    case "$option" in
        1) deploy ;;
        2) monitor ;;
        3) pm2 status | tee -a $LOG_FILE ;;
        4) pm2 delete all && pm2 flush ;;
        5) log "Saindo..." ;;
        *) log "Opção inválida!" ;;
    esac
}

interactive_menu