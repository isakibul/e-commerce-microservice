# Kong Gateway

Kong runs in database-backed mode and is the public edge gateway for the
microservices. The existing `api-gateway` service is kept in the repository, but
Kong is the intended public entry point for the Docker environment.

## Local URLs

- Kong proxy: `http://localhost:8000`
- Kong Admin API: `http://localhost:8001`
- Kong Manager UI: `http://localhost:8002`
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

## Auth Policy

Kong validates bearer access tokens for protected routes using a sandboxed
`pre-function` plugin. The policy removes client-supplied `X-User-*` headers,
validates the JWT signed by the auth service, and forwards trusted identity
headers to downstream services.

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
