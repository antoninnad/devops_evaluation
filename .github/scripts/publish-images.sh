#!/usr/bin/env bash
set -euo pipefail

tag="val-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
tmp_dir=$(mktemp -d)
export DOCKER_CONFIG="$tmp_dir/docker"
mkdir "$DOCKER_CONFIG"
trap 'rm -rf "$tmp_dir"' EXIT

printf '%s' "${DOCKERHUB_TOKEN:?}" |
  docker login --username "${DOCKERHUB_USERNAME:?}" --password-stdin
unset DOCKERHUB_TOKEN

publish() {
  local service=$1 context=$2 repo=$3 digest
  docker buildx build --push --provenance=false --tag "$repo:$tag" \
    --metadata-file "$tmp_dir/$service.json" "$context"
  digest=$(jq -er '."containerimage.digest" | select(test("^sha256:[0-9a-f]{64}$"))' "$tmp_dir/$service.json")
  printf '%s=%s@%s\n' "$service" "$repo" "$digest" >> images.txt
}

: > images.txt
publish frontend frontend kaneki599/devops_evaluation_ziyad_fares_antonin_younes
publish api api kaneki599/devops-api
publish db database kaneki599/devops-db
