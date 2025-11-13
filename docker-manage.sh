#!/bin/bash

# Funções para gerenciamento do Docker
function deploy() {
  echo "========================================="
  echo " 🚀 Iniciando os containers..."
  echo "========================================="
  docker-compose up -d
  if [ $? -eq 0 ]; then
    echo "\n✅ Containers iniciados com sucesso!"
  else
    echo "\n❌ Erro ao iniciar os containers. Verifique os logs para mais detalhes."
  fi
}

function stop() {
  echo "========================================="
  echo " 🛑 Parando os containers..."
  echo "========================================="
  docker-compose down
  if [ $? -eq 0 ]; then
    echo "\n✅ Containers parados com sucesso!"
  else
    echo "\n❌ Erro ao parar os containers. Verifique os logs para mais detalhes."
  fi
}

function remove() {
  echo "========================================="
  echo " 🗑️ Removendo containers, volumes e imagens..."
  echo "========================================="
  docker-compose down -v
  docker system prune -a --volumes -f
  if [ $? -eq 0 ]; then
    echo "\n✅ Remoção completa!"
  else
    echo "\n❌ Erro ao remover. Verifique os logs para mais detalhes."
  fi
}

function logs() {
  echo "========================================="
  echo " 📜 Exibindo logs do serviço: $1"
  echo "========================================="
  docker logs $1 --tail 50
}

function logs_separados() {
  echo "========================================="
  echo " 📜 Exibindo logs separados para cada serviço"
  echo "========================================="
  echo "1. Backend"
  echo "2. Frontend"
  echo "3. Proxy Server"
  read -p "Escolha o número do serviço: " servico_num

  case $servico_num in
    1) echo "\nLogs do Backend:"; docker logs backend --tail 50 ;;
    2) echo "\nLogs do Frontend:"; docker logs frontend --tail 50 ;;
    3) echo "\nLogs do Proxy Server:"; docker logs proxy-server --tail 50 ;;
    *) echo "Opção inválida!" ;;
  esac
}

function monitor_continuo() {
  echo "========================================="
  echo " 📊 Monitoramento contínuo dos containers... (CTRL+C para voltar ao menu principal)"
  echo "========================================="
  trap 'echo "\nVoltando ao menu principal..."; return' SIGINT
  while true; do
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    sleep 5
  done
}

function test_urls() {
  echo "========================================="
  echo " 🌐 Testando URLs configuradas..."
  echo "========================================="
  curl -I http://localhost:3000
  curl -I http://localhost:5001
  curl -I http://localhost:8080
}

# Menu interativo
while true; do
  echo "\n================================="
  echo " 🛠️ Gerenciamento do Docker"
  echo "================================="
  echo "1. Deploy"
  echo "2. Stop"
  echo "3. Remove"
  echo "4. Ver logs"
  echo "5. Ver logs separados"
  echo "6. Monitoramento contínuo"
  echo "7. Testar URLs"
  echo "8. Sair"
  echo "================================="
  read -p "Escolha uma opção: " opcao

  case $opcao in
    1) deploy ;;
    2) stop ;;
    3) remove ;;
    4) read -p "Digite o nome do serviço: " servico; logs $servico ;;
    5) logs_separados ;;
    6) monitor_continuo ;;
    7) test_urls ;;
    8) echo "Saindo..."; exit ;;
    *) echo "Opção inválida!" ;;
  esac

done