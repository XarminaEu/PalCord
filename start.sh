#!/usr/bin/env bash
# PalCord Start Script
set -e

if [ -d "$PWD/.node/bin" ]; then
  export PATH="$PWD/.node/bin:$PATH"
fi

export NODE_ENV=production
nohup npm start > "$PWD/palcord.log" 2>&1 &
echo "PalCord started. PID: $!"
echo "Logs: $PWD/palcord.log"
