# Kong Gateway

Kong runs in database-backed mode and is the public edge gateway for the
microservices. The legacy custom gateway is kept in `gateway/`, but
Kong is the intended public entry point for the Docker environment.

## Local URLs

- Kong proxy: `http://localhost:8000`
- Kong Admin API: `http://127.0.0.1:8001`
- Kong Manager UI: `http://127.0.0.1:8002`
- Keycloak: `http://localhost:8080`
- RedisInsight: `http://localhost:8011`
- RabbitMQ UI: `http://localhost:15672`
- MailHog UI: `http://localhost:8025`

## Start

```bash
docker compose up -d --build
./infra/kong/setup.sh
```

The setup script creates Kong services, routes, and global plugins for:

- `/auth` -> `auth:4003`
- `/users` -> `user:4004`
- `/products` -> `product:4001`
- `/inventories` -> `inventory:4002`
- `/cart` -> `cart:4006`
- `/orders` -> `order:4007`
- `/emails` -> `email:4005`

## Plugins

The local Kong bootstrap enables:

- `cors`
- `rate-limiting`
- `request-transformer`

The request transformer injects `X-Internal-Gateway-Secret` before forwarding
requests to services. This keeps each service protected from direct public
traffic while allowing Kong to be the trusted edge.

App services use Docker `expose` instead of host `ports`, so they are reachable
by Kong and sibling services on the Compose network but are not published on the
host machine. Kong Admin API and Manager are bound to `127.0.0.1` for local
administration only.

## Auth Policy

Kong does not terminate OpenID Connect in this local open-source setup.
Protected services validate Keycloak-issued RS256 bearer tokens against the
realm JWKS.

Kong still runs a small sandboxed `pre-function` plugin that removes
client-supplied `X-User-*` headers before forwarding. This prevents identity
header spoofing while the services derive authenticated identity directly from
the `Authorization: Bearer <token>` header.

The policy also blocks public access to internal-only profile creation:

```txt
POST /users
```

After changing gateway configuration or rebuilding app containers, run:

```bash
docker compose up -d --build
docker compose restart kong
./infra/kong/setup.sh
```

The legacy command still works as a wrapper:

```bash
./scripts/setup-kong.sh
```
