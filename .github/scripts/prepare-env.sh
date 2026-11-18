#!/usr/bin/env bash
set -euo pipefail
umask 077

# Keep database credentials outside the checkout so subsequent jobs reuse them.
config_dir="${DEVOPS_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/devops_evaluation}"
mkdir -p "$config_dir"
chmod 700 "$config_dir"
config_file="$config_dir/.env"

if [[ -n "${API_ENV_FILE:-}" || ! -s "$config_file" ]]; then
  config_tmp=$(mktemp "$config_dir/.env.XXXXXX")
  trap 'rm -f "$config_tmp"' EXIT
  if [[ -n "${API_ENV_FILE:-}" ]]; then
    printf '%s\n' "$API_ENV_FILE" > "$config_tmp"
  else
    {
      printf 'DB_HOST=db\nDB_PORT=3306\nDB_NAME=app\nDB_USER=app\n'
      printf 'DB_PASSWORD=%s\n' "$(openssl rand -hex 32)"
      printf 'DB_ROOT_PASSWORD=%s\n' "$(openssl rand -hex 32)"
    } > "$config_tmp"
  fi
  mv "$config_tmp" "$config_file"
  trap - EXIT
fi

chmod 600 "$config_file"
cp "$config_file" .env
chmod 600 .env
