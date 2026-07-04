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

ELECTRON_ARGS=("--no-sandbox")
if [ -z "$DISPLAY" ]; then
    ELECTRON_ARGS+=("--disable-gpu" "--headless")
fi

if [ -x "$VANILLA_ROOT_DIR/vanilla-binary_linux_electron/electron" ]; then
    exec "$VANILLA_ROOT_DIR/vanilla-binary_linux_electron/electron" "$VANILLA_ROOT_DIR/vanilla-common/electron.js" "${ELECTRON_ARGS[@]}"
elif [ -x "$VANILLA_ROOT_DIR/vanilla-src-nodemodules/node_modules/.bin/electron" ]; then
    exec "$VANILLA_ROOT_DIR/vanilla-src-nodemodules/node_modules/.bin/electron" "$VANILLA_ROOT_DIR/vanilla-common/electron.js" "${ELECTRON_ARGS[@]}"
else
    echo "Electron runtime not found."
    echo "Check vanilla-binary_linux_electron/electron or vanilla-src-nodemodules/node_modules."
    echo "Fallback: node nodejs.js"
    exit 1
fi
