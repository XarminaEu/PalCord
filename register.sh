#!/usr/bin/env bash
# PalCord Slash-Commands Registration Script
set -e

if [ -d "$PWD/.node/bin" ]; then
  export PATH="$PWD/.node/bin:$PATH"
fi

npm run register
