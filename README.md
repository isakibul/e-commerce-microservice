# E-Commerce Microservice

Dockerized e-commerce microservice portfolio project with Kong Gateway,
PostgreSQL, Redis, RabbitMQ, MailHog, and focused service tests.

## Highlights

- Seven bounded backend services: auth, user, product, inventory, cart, order,
  and email.
- Kong Gateway owns public routing, CORS, rate limiting, internal secret
  injection, and JWT identity validation.
- PostgreSQL, Redis, RabbitMQ, MailHog, PgAdmin, RedisInsight, and Kong Manager
  run through Docker Compose.
- Prisma migrations keep persistent service schemas versioned.
- RabbitMQ consumers use durable queues with retry and DLQ support.
- Structured JSON logs include request IDs and HTTP timing.
- Production mode rejects missing/default secrets.
- GitHub Actions CI builds services, runs tests, and validates Compose config.
- A manual Compose smoke workflow starts the stack and checks service health
  through Kong.
- Postman collection included for manual API review.

## Structure

```txt
docs/       Project documentation
gateway/    Legacy custom gateway kept for reference
infra/      Kong, Postgres, Redis, and RabbitMQ infrastructure files
scripts/    Developer scripts
shared/     Shared package for cross-service utilities and contracts
services/   Auth, user, product, inventory, cart, order, and email services
```

## Run Locally

```bash
docker compose up -d --build
./infra/kong/setup.sh
```

Public API:

```txt
http://localhost:8000
```

Useful local tools:

```txt
Kong Manager: http://127.0.0.1:8002
PgAdmin:      http://localhost:5050
RabbitMQ UI:  http://localhost:15672
MailHog:      http://localhost:8025
RedisInsight: http://localhost:8011
```

## Documentation

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
```

## API Collection

Import this collection into Postman:

```txt
docs/postman/ecommerce.postman_collection.json
```

Use `http://localhost:8000` as the public base URL after running Kong setup.

## Production Notes

Local Compose defaults to development mode. For production, set
`NODE_ENV=production` and provide real values for `JWT_SECRET`,
`INTERNAL_GATEWAY_SECRET`, database URLs, RabbitMQ, and SMTP settings from a
secret manager.
