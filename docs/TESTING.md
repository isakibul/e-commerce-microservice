# Testing Strategy

The project uses service-level Vitest suites plus root orchestration scripts.

## Commands

```bash
npm run build
npm test
npm run compose:config
```

CI runs the same checks on pull requests and pushes to `main` or `master`.

There is also a manually triggered GitHub Actions workflow named
`Compose Smoke`. It starts Docker Compose, configures Kong, and verifies service
health endpoints through the public gateway.

## Current Coverage Shape

- Controller tests verify HTTP status mapping and request validation.
- Service tests verify business rules and persistence/client interactions with
  mocks.
- Schema tests verify Zod request contracts.
- Shared tests verify request IDs, error responses, and production env guards.
- Compose validation catches invalid local infrastructure configuration.

## Critical Flows To Protect

The most important regression targets are:

```txt
register -> verify email -> login
admin create product -> inventory created
add to cart -> checkout -> order persisted -> cart clear event -> email event
refresh token -> logout -> revoked token rejected
RabbitMQ consumer failure -> retry queue -> DLQ after max retries
```

## Recommended Next E2E Layer

Use the Postman collection in `docs/postman/ecommerce.postman_collection.json`
or a dedicated test runner to execute a full checkout flow against Docker
Compose:

```bash
docker compose up -d --build
./infra/kong/setup.sh
```

Then run the flow through Kong at:

```txt
http://localhost:8000
```

For CI, keep the current fast unit/build job as the default and add a separate
nightly or manually triggered Docker E2E job. That keeps normal pull requests
fast while still proving the whole system works together.
