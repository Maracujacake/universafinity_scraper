#!/bin/bash

cleanup() {
  echo "Encerrando backend e frontend..."
  kill $BACK_PID $FRONT_PID 2>/dev/null
  exit
}

trap cleanup SIGINT SIGTERM

echo "Iniciando backend..."
python -m web.back &
BACK_PID=$!

echo "Iniciando frontend..."
cd web/front || exit
npm start &
FRONT_PID=$!

echo "Backend e frontend estão sendo executados."

wait
