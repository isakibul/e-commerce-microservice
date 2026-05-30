#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

export COMPOSE_PARALLEL_LIMIT="${COMPOSE_PARALLEL_LIMIT:-1}"

echo "Starting local e-commerce microservice stack..."
docker compose up -d --build

echo "Configuring Kong..."
"$ROOT_DIR/infra/kong/setup.sh"

cat <<'EOF'

Local stack is ready.

Public API:    http://localhost:8000
Keycloak:      http://localhost:8080
Kong Manager:  http://127.0.0.1:8002
PgAdmin:       http://localhost:5050
RabbitMQ UI:   http://localhost:15672
MailHog:       http://localhost:8025
RedisInsight:  http://localhost:8011

Smoke checks:
  ./scripts/smoke-health.sh
  npm run smoke:keycloak
EOF
