#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${KONG_PROXY_URL:-http://localhost:8000}"

health_paths=(
  "/auth/health"
  "/users/health"
  "/products/health"
  "/inventories/health"
  "/cart/health"
  "/orders/health"
  "/emails/health"
)

for path in "${health_paths[@]}"; do
  url="${BASE_URL}${path}"
  echo "Checking ${url}"
  curl -fsS "${url}" >/dev/null
done

echo "All service health checks passed through Kong."
