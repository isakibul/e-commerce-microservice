# E-Commerce Microservice

Dockerized e-commerce microservice portfolio project with Kong Gateway,
PostgreSQL, Redis, RabbitMQ, MailHog, and focused service tests.

## Structure

```txt
docs/       Project documentation
gateway/    Legacy custom gateway kept for reference
infra/      Kong, Postgres, Redis, and RabbitMQ infrastructure files
scripts/    Developer scripts
shared/     Reserved shared modules
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
- [Architecture](docs/ARCHITECTURE.md)
- [Kong](docs/KONG.md)
- [UML](docs/UML.md)

