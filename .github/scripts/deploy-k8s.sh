#!/usr/bin/env bash
set -euo pipefail

namespace=$1
images=$2
case "$namespace" in
  devops-val|devops-prod) ;;
  *) echo "Namespace de déploiement inconnu : $namespace" >&2; exit 1 ;;
esac

image_ref() {
  local service=$1 repo=$2 ref digest
  ref=$(sed -n "s/^$service=//p" "$images")
  digest=${ref#"$repo@"}
  if [[ "$ref" != "$repo@$digest" || ! "$digest" =~ ^sha256:[0-9a-f]{64}$ ]]; then
    echo "Référence d’image invalide pour $service." >&2
    return 1
  fi
  printf '%s\n' "$ref"
}

frontend=$(image_ref frontend kaneki599/devops_evaluation_ziyad_fares_antonin_younes)
api=$(image_ref api kaneki599/devops-api)
db=$(image_ref db kaneki599/devops-db)

kubectl -n "$namespace" apply -f k8s/services.yaml
sed -e "s|example.invalid/devops-frontend|$frontend|" \
    -e "s|example.invalid/devops-api|$api|" \
    -e "s|example.invalid/devops-db|$db|" k8s/workloads.yaml |
  kubectl -n "$namespace" apply -f -

for workload in statefulset/db deployment/api deployment/frontend; do
  kubectl -n "$namespace" rollout status "$workload" --timeout=5m
done

log=$(mktemp)
kubectl -n "$namespace" port-forward --address 127.0.0.1 service/frontend :80 > "$log" 2>&1 &
forward_pid=$!
trap 'kill "$forward_pid" 2>/dev/null || true; rm -f "$log"' EXIT

port=
for ((attempt = 0; attempt < 30; attempt++)); do
  port=$(sed -n 's/^Forwarding from 127\.0\.0\.1:\([0-9]*\) -> 80$/\1/p' "$log")
  if [[ -n "$port" ]] || ! kill -0 "$forward_pid" 2>/dev/null; then break; fi
  sleep 1
done
if [[ -z "$port" ]]; then
  cat "$log" >&2
  exit 1
fi

url="http://127.0.0.1:$port"
curl --fail --silent --show-error --max-time 15 "$url/" > /dev/null
curl --fail --silent --show-error --max-time 15 "$url/api/health" | jq -e '.db == "up"'
curl --fail --silent --show-error --max-time 15 "$url/api/tasks" | jq -e 'type == "array"'
