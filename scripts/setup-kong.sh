#!/usr/bin/env bash
set -euo pipefail

KONG_ADMIN_URL="${KONG_ADMIN_URL:-http://localhost:8001}"
INTERNAL_GATEWAY_SECRET="${INTERNAL_GATEWAY_SECRET:-local_dev_internal_gateway_secret}"

wait_for_kong() {
  until curl -fsS "$KONG_ADMIN_URL/status" >/dev/null; do
    echo "Waiting for Kong Admin API at $KONG_ADMIN_URL..."
    sleep 2
  done
}

upsert_service() {
  local name="$1"
  local url="$2"

  curl -fsS -X PUT "$KONG_ADMIN_URL/services/$name" \
    --data "name=$name" \
    --data "url=$url" >/dev/null
}

upsert_route() {
  local service="$1"
  local name="$2"
  local path="$3"

  curl -fsS -X PUT "$KONG_ADMIN_URL/services/$service/routes/$name" \
    --data "name=$name" \
    --data "paths[]=$path" \
    --data "strip_path=false" >/dev/null
}

upsert_cors_plugin() {
  curl -fsS -X PUT "$KONG_ADMIN_URL/plugins/00000000-0000-0000-0000-000000000001" \
    --data "name=cors" \
    --data "config.origins[]=*" \
    --data "config.methods[]=GET" \
    --data "config.methods[]=POST" \
    --data "config.methods[]=PUT" \
    --data "config.methods[]=PATCH" \
    --data "config.methods[]=DELETE" \
    --data "config.methods[]=OPTIONS" \
    --data "config.headers[]=Accept" \
    --data "config.headers[]=Authorization" \
    --data "config.headers[]=Content-Type" \
    --data "config.headers[]=X-Cart-Session-Id" \
    --data "config.exposed_headers[]=X-Cart-Session-Id" \
    --data "config.credentials=false" >/dev/null
}

upsert_rate_limit_plugin() {
  curl -fsS -X PUT "$KONG_ADMIN_URL/plugins/00000000-0000-0000-0000-000000000002" \
    --data "name=rate-limiting" \
    --data "config.minute=100" \
    --data "config.policy=local" >/dev/null
}

upsert_internal_gateway_plugin() {
  curl -fsS -X PUT "$KONG_ADMIN_URL/plugins/00000000-0000-0000-0000-000000000003" \
    --data "name=request-transformer" \
    --data "config.remove.headers[]=X-Internal-Gateway-Secret" \
    --data "config.add.headers[]=X-Internal-Gateway-Secret:$INTERNAL_GATEWAY_SECRET" >/dev/null
}

wait_for_kong

upsert_service auth-service http://auth:4003
upsert_route auth-service auth-routes /auth

upsert_service user-service http://user:4004
upsert_route user-service user-routes /users

upsert_service product-service http://product:4001
upsert_route product-service product-routes /products

upsert_service inventory-service http://inventory:4002
upsert_route inventory-service inventory-routes /inventories

upsert_service cart-service http://cart:4006
upsert_route cart-service cart-routes /cart

upsert_service order-service http://order:4007
upsert_route order-service order-routes /orders

upsert_service email-service http://email:4005
upsert_route email-service email-routes /emails

upsert_cors_plugin
upsert_rate_limit_plugin
upsert_internal_gateway_plugin

echo "Kong services, routes, and global plugins are configured."
