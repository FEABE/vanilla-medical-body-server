#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VANILLA_ROOT_DIR="${VANILLA_ROOT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
VANILLA_DATA_DIR="${VANILLA_DATA_DIR:-$VANILLA_ROOT_DIR/.data}"
VANILLA_ELECTRON_SERVICE_NAME="${VANILLA_ELECTRON_SERVICE_NAME:-$(basename "$SCRIPT_DIR")}"

export VANILLA_ROOT_DIR
export VANILLA_DATA_DIR
export VANILLA_ELECTRON_SERVICE_NAME
export ELECTRON_DISABLE_SECURITY_WARNINGS=true

cd "$SCRIPT_DIR"

if [ -x "$VANILLA_ROOT_DIR/vanilla-binary_darwin_electron/Electron.app/Contents/MacOS/Electron" ]; then
    exec "$VANILLA_ROOT_DIR/vanilla-binary_darwin_electron/Electron.app/Contents/MacOS/Electron" "$VANILLA_ROOT_DIR/vanilla-common/electron.js"
elif [ -x "$VANILLA_ROOT_DIR/vanilla-src-nodemodules/node_modules/.bin/electron" ]; then
    exec "$VANILLA_ROOT_DIR/vanilla-src-nodemodules/node_modules/.bin/electron" "$VANILLA_ROOT_DIR/vanilla-common/electron.js"
else
    echo "Electron runtime not found."
    echo "Check vanilla-binary_darwin_electron/Electron.app or vanilla-src-nodemodules/node_modules."
    echo "Fallback: node nodejs.js"
    exit 1
fi
