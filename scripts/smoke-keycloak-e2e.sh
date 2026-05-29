#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="${KEYCLOAK_REALM:-ecommerce}"
CLIENT_ID="${KEYCLOAK_CLIENT_ID:-ecommerce-api}"
ADMIN_USERNAME="${KEYCLOAK_ADMIN_USERNAME:-admin@example.com}"
ADMIN_PASSWORD="${KEYCLOAK_ADMIN_USER_PASSWORD:-Admin123!}"
CUSTOMER_USERNAME="${KEYCLOAK_CUSTOMER_USERNAME:-customer@example.com}"
CUSTOMER_PASSWORD="${KEYCLOAK_CUSTOMER_PASSWORD:-Customer123!}"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

json_value() {
  node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); const path=process.argv[2].split('.'); let value=data; for (const key of path) value=value?.[key]; if (value === undefined || value === null) process.exit(1); process.stdout.write(String(value));" "$1" "$2"
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempts=0
  local max_attempts="${SMOKE_WAIT_ATTEMPTS:-60}"

  until curl -fsS "$url" >/dev/null; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge "$max_attempts" ]; then
      echo "$label did not become available at $url"
      exit 1
    fi

    echo "Waiting for $label..."
    sleep 2
  done
}

request_json() {
  local method="$1"
  local url="$2"
  local body="$3"
  local token="${4:-}"
  local output="$5"
  local status_file="$output.status"

  if [ -n "$token" ]; then
    curl -sS -o "$output" -w "%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      --data "$body" > "$status_file"
  else
    curl -sS -o "$output" -w "%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" \
      --data "$body" > "$status_file"
  fi
}

expect_status() {
  local output="$1"
  local expected="$2"
  local actual
  actual="$(cat "$output.status")"

  if [ "$actual" != "$expected" ]; then
    echo "Expected HTTP $expected but got HTTP $actual"
    cat "$output"
    exit 1
  fi
}

get_token() {
  local username="$1"
  local password="$2"
  local output="$tmp_dir/token-${username}.json"

  curl -fsS -X POST "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=password" \
    -d "client_id=$CLIENT_ID" \
    -d "username=$username" \
    -d "password=$password" > "$output"

  json_value "$output" access_token
}

wait_for_url "$KEYCLOAK_URL/realms/$REALM/.well-known/openid-configuration" "Keycloak realm"
wait_for_url "$BASE_URL/products" "Kong public API"

admin_token="$(get_token "$ADMIN_USERNAME" "$ADMIN_PASSWORD")"
customer_token="$(get_token "$CUSTOMER_USERNAME" "$CUSTOMER_PASSWORD")"

profile_response="$tmp_dir/profile.json"
request_json POST "$BASE_URL/users/me" '{"address":"Keycloak smoke test"}' "$customer_token" "$profile_response"
profile_status="$(cat "$profile_response.status")"
if [ "$profile_status" != "200" ] && [ "$profile_status" != "201" ]; then
  echo "Expected profile bootstrap to return HTTP 200 or 201 but got HTTP $profile_status"
  cat "$profile_response"
  exit 1
fi

sku="SMK$(date +%H%M%S)"
product_response="$tmp_dir/product.json"
request_json POST "$BASE_URL/products" "{\"sku\":\"$sku\",\"name\":\"Smoke Keyboard\",\"price\":99,\"status\":\"PUBLISHED\"}" "$admin_token" "$product_response"
expect_status "$product_response" 201

product_id="$(json_value "$product_response" id)"
inventory_id="$(json_value "$product_response" inventoryId)"

inventory_response="$tmp_dir/inventory.json"
request_json PUT "$BASE_URL/inventories/$inventory_id" '{"actionType":"In","quantity":5}' "$admin_token" "$inventory_response"
expect_status "$inventory_response" 200

cart_response="$tmp_dir/cart.json"
cart_headers="$tmp_dir/cart.headers"
cart_status="$tmp_dir/cart.status"
curl -sS -D "$cart_headers" -o "$cart_response" -w "%{http_code}" -X POST "$BASE_URL/cart/add-to-cart" \
  -H "Content-Type: application/json" \
  --data "{\"productId\":\"$product_id\",\"inventoryId\":\"$inventory_id\",\"quantity\":1}" > "$cart_status"

if [ "$(cat "$cart_status")" != "200" ]; then
  echo "Expected cart add to return HTTP 200 but got HTTP $(cat "$cart_status")"
  cat "$cart_response"
  exit 1
fi

cart_session_id="$(json_value "$cart_response" cartSessionId)"

checkout_response="$tmp_dir/checkout.json"
request_json POST "$BASE_URL/orders/checkout" "{\"cartSessionId\":\"$cart_session_id\"}" "$customer_token" "$checkout_response"
expect_status "$checkout_response" 201

order_id="$(json_value "$checkout_response" id)"

echo "Keycloak E2E smoke passed"
echo "Product: $product_id"
echo "Order: $order_id"
