#!/bin/bash
set -e
cd "$(dirname "$0")"

export ELECTRON_DISABLE_SECURITY_WARNINGS=true

if [ -d "../vanilla-binary_darwin_electron/Electron.app" ]; then
    exec "../vanilla-binary_darwin_electron/Electron.app/Contents/MacOS/Electron" "../vanilla-common/electron.js"
elif [ -x "../vanilla-src-nodemodules/node_modules/.bin/electron" ]; then
    exec "../vanilla-src-nodemodules/node_modules/.bin/electron" "../vanilla-common/electron.js"
else
    echo "Electron을 찾을 수 없습니다."
    echo "vanilla-binary_darwin_electron/Electron.app 또는 vanilla-src-nodemodules/node_modules를 확인해주세요."
    echo "Node.js로 실행하려면: node nodejs.js"
    exit 1
fi
