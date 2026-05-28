# Architecture

This project is a Dockerized e-commerce microservice system. Kong is the public
edge gateway, while individual services stay private inside the Compose network.

## Top-Level Layout

```txt
docs/       API, architecture, Kong, and UML documentation
gateway/    Legacy custom Express gateway kept for reference
infra/      Infrastructure configuration and bootstrap scripts
scripts/    Compatibility and developer automation scripts
shared/     Shared package for cross-service code
services/   Business microservices
```

## Runtime Flow

```txt
Client
  |
  v
Kong Gateway
  |
  +--> Auth Service
  +--> User Service
  +--> Product Service
  +--> Inventory Service
  +--> Cart Service
  +--> Order Service
  +--> Email Service
```

Kong handles edge concerns such as routing, CORS, rate limiting, internal gateway
secret injection, and JWT identity validation. Downstream services receive only
trusted identity headers from Kong. Services share common cross-cutting logic
through the local `@ecommerce/shared` package.

## Service Responsibilities

- Auth: registration, login, verification, refresh tokens, logout, JWT issuing.
- User: user profile storage and internal profile creation.
- Product: catalog CRUD and product listing.
- Inventory: stock records and availability changes.
- Cart: Redis-backed cart operations and cart events.
- Order: checkout flow, order persistence, and order events.
- Email: email event processing and delivery through MailHog locally.

## Infrastructure

- PostgreSQL stores persistent service data.
- Redis supports cart/session-like fast data.
- RabbitMQ moves asynchronous events between services.
- Kong runs in database-backed mode using its own Postgres instance.
- MailHog captures local emails.

## Shared Code

The `shared/` package contains cross-service building blocks that should behave
the same everywhere:

- gateway-only request protection middleware factory
- shared error primitives
- structured logger factory
- event payload type contracts

Service-specific business logic stays inside each service. Shared code is used
only for cross-cutting concerns and contracts.

## Boundaries

Only Kong publishes the public API ports. App service ports use Docker `expose`,
which keeps them reachable from Kong and sibling containers but hidden from the
host machine.
