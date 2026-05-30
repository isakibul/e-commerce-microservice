# E-Commerce Microservice

Dockerized e-commerce microservice portfolio project with Kong Gateway,
Keycloak, PostgreSQL, Redis, RabbitMQ, MailHog, and focused service tests.

## Highlights

- Dockerized e-commerce microservice system with seven backend services: auth,
  user, product, inventory, cart, order, and email.
- Kong API Gateway handles public routing, CORS, rate limiting, internal secret
  injection, and identity-header spoofing protection.
- Keycloak-based authentication uses OpenID Connect access tokens and JWKS
  validation for protected API routes.
- RabbitMQ powers async messaging with durable queues, retry, and DLQ support.
- Redis supports cart and service workflows.
- PostgreSQL stores persistent service data with versioned Prisma migrations.
- One-command local startup with Docker Compose.
- Postman collection and smoke tests are included for manual and automated API
  review.
- Local developer tools include MailHog, PgAdmin, RedisInsight, RabbitMQ UI, and
  Kong Manager.
- Structured JSON logs include request IDs and HTTP timing.
- Production mode rejects missing/default secrets.
- GitHub Actions CI builds services, runs tests, and validates Compose config.
- A manual Compose smoke workflow starts the stack and checks service health
  through Kong, then exercises the Keycloak-protected API flow.

## Demo Flow

1. Start the stack with `npm run start:local`.
2. Sign in through the imported Keycloak realm.
3. Browse products through the public Kong API.
4. Add items to the cart.
5. Place an order.
6. Review the order email in MailHog.

## Structure

```txt
docs/       Project documentation
gateway/    Archived legacy Express gateway, not active runtime
infra/      Kong, Postgres, Redis, and RabbitMQ infrastructure files
scripts/    Developer scripts
shared/     Shared package for cross-service utilities and contracts
services/   Auth, user, product, inventory, cart, order, and email services
```

Kong is the active public gateway. The `gateway/` folder is kept only as
archived migration/reference material and is intentionally excluded from the
root verify pipeline.

## Run Locally

```bash
npm run start:local
```

Public API:

```txt
http://localhost:8000
```

Useful local tools:

```txt
Kong Manager: http://127.0.0.1:8002
Keycloak:     http://localhost:8080
PgAdmin:      http://localhost:5050
RabbitMQ UI:  http://localhost:15672
MailHog:      http://localhost:8025
RedisInsight: http://localhost:8011
```

Local Keycloak realm import creates:

```txt
Realm:          ecommerce
Client:         ecommerce-api
Admin user:     admin@example.com / Admin123!
Customer user:  customer@example.com / Customer123!
```

## Documentation

- [Project Overview](docs/PROJECT_OVERVIEW.md)
- [API](docs/API.md)
- [Architecture and complete system diagram](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Operations](docs/OPERATIONS.md)
- [Testing](docs/TESTING.md)
- [Kong](docs/KONG.md)
- [UML](docs/UML.md)

## Verify

```bash
npm run verify
```

This runs:

```txt
npm run build
npm test
npm run compose:config
```

For full-stack local smoke checks after starting Docker Compose and configuring
Kong:

```bash
./scripts/smoke-health.sh
npm run smoke:keycloak
```

The same full-stack flow is available in GitHub Actions as the manually
triggered `Compose Smoke` workflow. It starts Docker Compose, configures Kong,
checks health through the public gateway, obtains Keycloak tokens, and runs a
protected profile/product/cart/checkout smoke path.

Last local portfolio verification: `npm run verify`, `./scripts/smoke-health.sh`,
and `npm run smoke:keycloak` passed on 2026-05-30.

## API Collection

Import this collection into Postman:

```txt
docs/postman/ecommerce.postman_collection.json
```

Use `http://localhost:8000` as the public base URL after running Kong setup.

## Production Notes

Local Compose defaults to development mode. For production, set
`NODE_ENV=production` and provide real values for Keycloak admin credentials,
`INTERNAL_GATEWAY_SECRET`, database URLs, RabbitMQ, and SMTP settings from a
secret manager.
