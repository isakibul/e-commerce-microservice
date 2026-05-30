# Project Overview

## What This Project Is

This is a Dockerized e-commerce microservice system built as a backend portfolio
project. It uses Kong as the public API gateway, Keycloak for OpenID Connect
authentication, PostgreSQL for persistent service data, Redis for cart and fast
state workflows, RabbitMQ for asynchronous events, and MailHog for local email
delivery testing.

The application is split into seven backend services: auth, user, product,
inventory, cart, order, and email. Services run privately inside the Docker
Compose network, and client traffic enters through Kong at
`http://localhost:8000`.

## Why I Built It

The goal of this project is to demonstrate practical backend engineering beyond
a single CRUD API. It shows how independent services, gateway routing,
authentication, messaging, persistence, local infrastructure, tests, and
developer documentation can work together in one reviewable system.

## System Highlights

- Seven bounded backend services for common e-commerce domains.
- Kong API Gateway handles public routing, CORS, rate limiting, internal secret
  injection, and identity-header spoofing protection.
- Keycloak issues OpenID Connect access tokens; protected services validate
  RS256 JWTs through the realm JWKS.
- PostgreSQL stores persistent service data with Prisma migrations.
- Redis supports cart and service workflows.
- RabbitMQ supports async events with durable queues, retry behavior, and DLQs.
- MailHog captures local email delivery for demo and testing.
- Docker Compose starts the full local environment with one command.
- GitHub Actions builds services, runs tests, and validates Docker Compose
  configuration.
- Postman collection and smoke scripts are included for manual and automated
  review.

## Main Demo Flow

1. Start the stack with `npm run start:local`.
2. Sign in through the imported Keycloak realm.
3. Browse products through the public Kong API.
4. Add items to the cart.
5. Place an order.
6. Review the order email in MailHog.

## Architecture Summary

Kong is the public entry point for API traffic and forwards requests to private
services inside the Compose network:

```txt
/auth        -> auth:4003
/users       -> user:4004
/products    -> product:4001
/inventories -> inventory:4002
/cart        -> cart:4006
/orders      -> order:4007
/emails      -> email:4005
```

Keycloak provides local identity through the `ecommerce` realm. Services that
protect business routes validate Keycloak-issued access tokens instead of
trusting client-provided identity headers.

RabbitMQ connects async workflows such as email jobs, cart lifecycle events, and
order-related events. Redis is used for cart state, while PostgreSQL stores
service-owned persistent data.

## How To Run Locally

```bash
npm run start:local
```

Useful local URLs:

```txt
Public API:    http://localhost:8000
Keycloak:      http://localhost:8080
Kong Manager:  http://127.0.0.1:8002
PgAdmin:       http://localhost:5050
RabbitMQ UI:   http://localhost:15672
MailHog:       http://localhost:8025
RedisInsight:  http://localhost:8011
```

## How To Verify

Run the core project checks:

```bash
npm run verify
```

After starting the local stack, run full-stack smoke checks:

```bash
./scripts/smoke-health.sh
npm run smoke:keycloak
```

## Portfolio Review Notes

This project is designed to be reviewed through the GitHub repository,
documentation, Postman collection, and local demo flow. A hosted deployment is
intentionally not required because the system depends on multiple infrastructure
components: Kong, Keycloak, PostgreSQL, Redis, RabbitMQ, and several app
services.

For resume or portfolio review, a short demo video can show the architecture,
local startup, Postman flow, MailHog email capture, and verification commands
without requiring reviewers to deploy the whole stack themselves.

## What I Would Improve For Production

- Use managed PostgreSQL, Redis, RabbitMQ, and SMTP services.
- Store secrets in a real secret manager instead of local defaults.
- Add TLS, production domains, and locked-down public ingress.
- Run Keycloak with a fixed public hostname and production database settings.
- Move Kong configuration to a declarative or GitOps-managed workflow.
- Add centralized logs, metrics, tracing, alerting, and dashboards.
- Add database backup and restore procedures.
- Deploy services with Kubernetes or another production orchestrator.
