#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

required_vars=(
  "SEPOLIA_RPC_URL"
  "MUMBAI_RPC_URL"
  "PRIVATE_KEY"
  "ETHERSCAN_API_KEY"
  "POLYGONSCAN_API_KEY"
  "CONTRACT_ADDRESS"
  "NEW_ADDRESS"
  "TOKEN_ADDRESS"
)

for var in "${required_vars[@]}"; do
  value="${!var-}"
  if [[ -z "${value}" ]]; then
    echo "Erro: defina ${var} no ambiente antes de executar este script." >&2
    exit 1
  fi
done

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

{
  for var in "${required_vars[@]}"; do
    printf '%s=%s\n' "$var" "${!var}"
  done
} >"$tmp_file"

mv "$tmp_file" "$REPO_ROOT/.env"
chmod 600 "$REPO_ROOT/.env"
trap - EXIT

echo ".env criado com sucesso em $REPO_ROOT/.env"
