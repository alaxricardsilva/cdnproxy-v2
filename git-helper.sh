#!/bin/bash
# Script interativo para operações comuns com Git
# Uso: ./git-helper.sh

set -e

function show_menu() {
  echo "\nEscolha uma opção:"
  echo "1) Inicializar repositório Git local"
  echo "2) Adicionar repositório remoto"
  echo "3) Fazer commit"
  echo "4) Fazer push"
  echo "5) Fazer pull"
  echo "6) Atualizar repositório remoto (push force)"
  echo "7) Excluir repositório remoto"
  echo "8) Configurar remoto HTTPS padrão (GitHub)"
  echo "9) Configurar cache de credenciais (evita digitar token toda vez)"
  echo "10) Configurar armazenamento permanente de credenciais (menos seguro)"
  echo "11) Atualizar remoto com token do GitHub"
  echo "0) Sair"
}

function choose_remote() {
  remotes=$(git remote)
  if [ -z "$remotes" ]; then
    echo "Nenhum repositório remoto encontrado."
    exit 1
  fi
  echo "\nRemotos disponíveis:"
  select remote in $remotes; do
    if [ -n "$remote" ]; then
      echo "$remote"
      break
    fi
  done
}

show_remote_url() {
    echo "\n[INFO] URL do repositório remoto atual:" >&2
    git remote -v | grep '(push)' | awk '{print $2}' >&2
}

while true; do
  show_menu
  read -p "Opção: " opt
  case $opt in
    1)
      git init
      echo "Repositório Git inicializado."
      ;;
    2)
      read -p "URL do repositório remoto: " url
      read -p "Nome do remoto (ex: origin): " name
      git remote add "$name" "$url"
      echo "Remoto '$name' adicionado."
      ;;
    3)
      read -p "Mensagem do commit: " msg
      git add .
      git commit -m "$msg"
      echo "Commit realizado."
      ;;
    4)
      remote=$(choose_remote)
      git push "$remote" HEAD
      echo "Push realizado para '$remote'."
      ;;
    5)
      remote=$(choose_remote)
      git pull "$remote" HEAD
      echo "Pull realizado de '$remote'."
      ;;
    6)
      remote=$(choose_remote)
      git push "$remote" HEAD --force
      echo "Push forçado realizado para '$remote'."
      ;;
    7)
      remote=$(choose_remote)
      git remote remove "$remote"
      echo "Remoto '$remote' removido."
      ;;
    8)
      echo "Configurando remoto HTTPS padrão para GitHub..."
      git remote set-url origin "https://github.com/alaxricardsilva/cdnproxy_v2.git"
      echo "Remoto origin configurado para: https://github.com/alaxricardsilva/cdnproxy_v2.git"
      ;;
    9)
      echo "Configurando cache de credenciais do Git (evita digitar token toda vez)..."
      git config --global credential.helper cache
      echo "Cache de credenciais ativado. O Git irá lembrar sua senha por um tempo."
      ;;
    10)
      echo "Configurando armazenamento permanente de credenciais do Git (menos seguro)..."
      git config --global credential.helper store
      echo "Armazenamento permanente de credenciais ativado. O Git irá lembrar sua senha/token indefinidamente."
      ;;
    0)
      echo "Saindo..."
      exit 0
      ;;
    11)
      read -p "Digite o token do GitHub (ghp_...): " token
      read -p "Nome do remoto (ex: origin): " name
      read -p "Usuário do GitHub: " usuario
      read -p "Repositório (ex: cdnproxy_v2): " repo
      url="https://$token@github.com/$usuario/$repo.git"
      git remote set-url "$name" "$url"
      echo "Remoto '$name' atualizado com token."
      ;;
    *)
      echo "Opção inválida. Tente novamente."
      ;;
  esac
  echo "--------------------------------------"
done