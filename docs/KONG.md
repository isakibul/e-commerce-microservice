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
./scripts/setup-kong.sh
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

## Important Auth Note

The previous custom gateway also verified access tokens and injected `x-user-*`
headers for downstream services. Kong now handles routing and gateway concerns,
but full replacement of that custom auth behavior needs one more design step:

- align auth tokens with Kong's JWT plugin, or
- add a Kong-compatible external auth flow/plugin, or
- keep the old Node gateway only for auth enrichment behind Kong.

Until that is implemented, routes that require downstream `x-user-*` identity
headers may still need the old gateway behavior or a trusted test header setup
in local development.
