#!/bin/bash

# Inicia o backend
if [ -f scraper.py ]; then
  echo "Iniciando o backend com Python..."
  python -m web.back &
else
  echo "Erro: Arquivo 'back.py' não encontrado no backend."
  exit 1
fi
# Volta para o diretório raiz

# Inicia o frontend
cd web/front
if [ -f package.json ]; then
  echo "Iniciando o frontend..."
  npm start &
else
  echo "Erro: Não foi encontrado o package.json no frontend."
  exit 1
fi

# Mensagem final
echo "Backend e frontend estão sendo executados."

