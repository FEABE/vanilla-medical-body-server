#!/bin/bash
set -e
cd "$(dirname "$0")"

export ELECTRON_DISABLE_SECURITY_WARNINGS=true

ELECTRON_ARGS=("--no-sandbox")
if [ -z "$DISPLAY" ]; then
    ELECTRON_ARGS+=("--disable-gpu" "--headless")
fi

if [ -x "../vanilla-binary_linux_electron/electron" ]; then
    exec "../vanilla-binary_linux_electron/electron" "../vanilla-common/electron.js" "${ELECTRON_ARGS[@]}"
elif [ -x "../vanilla-src-nodemodules/node_modules/.bin/electron" ]; then
    exec "../vanilla-src-nodemodules/node_modules/.bin/electron" "../vanilla-common/electron.js" "${ELECTRON_ARGS[@]}"
else
    echo "Electron을 찾을 수 없습니다."
    echo "vanilla-binary_linux_electron/ 또는 vanilla-src-nodemodules/node_modules를 확인해주세요."
    echo "Node.js로 실행하려면: node nodejs.js"
    exit 1
fi
