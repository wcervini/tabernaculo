#!/usr/bin/env bash
# install.sh — compila tabernaculo (TypeScript/Bun) y lo instala en ~/.local/bin
# Uso: ./install.sh
#   INSTALL_DIR=/otro/dir ./install.sh   (destino alternativo)
#   SKIP_DEPS=1 ./install.sh             (omite bun install)
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v bun >/dev/null 2>&1; then
  echo "error: bun no está instalado o no está en PATH" >&2
  echo "  instálalo: curl -fsSL https://bun.sh/install | bash" >&2
  exit 1
fi

if [[ "${SKIP_DEPS:-0}" != "1" ]]; then
  echo "==> deps..."
  bun install
fi

echo "==> typecheck..."
bun run typecheck

echo "==> build..."
bun build --compile --outfile tabernaculo src/main.ts

DEST="${INSTALL_DIR:-$HOME/.local/bin}"
mkdir -p "$DEST"
install -m755 tabernaculo "$DEST/tabernaculo"
echo "ok: $DEST/tabernaculo"

if ! command -v tabernaculo >/dev/null 2>&1; then
  echo "aviso: $DEST no está en tu PATH." >&2
  echo "  bash: export PATH=\"\$HOME/.local/bin:\$PATH\" >> ~/.bashrc" >&2
  echo "  fish: fish_add_path \$HOME/.local/bin" >&2
  echo "  zsh:  export PATH=\"\$HOME/.local/bin:\$PATH\" >> ~/.zshrc" >&2
else
  echo "PATH ok: $(command -v tabernaculo)"
fi

tabernaculo clis >/dev/null && echo "smoke test ok (clis responde)"
