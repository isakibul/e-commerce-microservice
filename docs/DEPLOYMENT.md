# Deployment Guide

This project is designed to run locally with Docker Compose and to be portable
to container platforms such as Kubernetes, ECS, or Nomad.

## Local Development

```bash
npm run start:local
npm test
```

Local Compose defaults service containers to `NODE_ENV=development` so fallback
development secrets can be used safely on a workstation.

## Production Requirements

Production deployments must provide these values from a secret manager, not from
the fallback values in `docker-compose.yaml`:

```txt
INTERNAL_GATEWAY_SECRET
KEYCLOAK_ADMIN
KEYCLOAK_ADMIN_PASSWORD
KEYCLOAK_ISSUER
KEYCLOAK_JWKS_URI
KEYCLOAK_AUDIENCE
KEYCLOAK_CLIENT_ID
DATABASE_URL for each persistent service
QUEUE_URL
SMTP_HOST
SMTP_PORT
DEFAULT_EMAIL_SENDER
```

When `NODE_ENV=production`, services reject missing or local-looking secrets such
as values containing `local_` or `change_me`.

## Migration Flow

Run database migrations before rolling out each service version:

```bash
npm --prefix services/auth run migrate:prod
npm --prefix services/user run migrate:prod
npm --prefix services/product run migrate:prod
npm --prefix services/inventory run migrate:prod
npm --prefix services/order run migrate:prod
npm --prefix services/email run migrate:prod
```

For container platforms, run migrations as one-off jobs using the same image and
environment variables as the target service.

## Startup Order

Core infrastructure should be healthy before services start:

```txt
Postgres -> persistent services
Redis    -> cart/email
RabbitMQ -> auth/cart/order/email
Keycloak DB -> Keycloak
Kong DB  -> Kong migrations -> Kong
```

Kong routes and plugins are configured with:

```bash
./infra/kong/setup.sh
```

In production, prefer declarative or GitOps-managed Kong configuration instead
of manually running the setup script.

## Scaling Notes

- Auth, user, product, inventory, order, and email HTTP services are stateless
  aside from their backing stores and can be horizontally scaled.
- Cart depends on Redis and can also scale horizontally.
- RabbitMQ consumers should use durable queues, acknowledgements, retry queues,
  and DLQs. This project includes retry/DLQ handling for cart and email
  consumers.
- Use one database per service in production, even if local Compose shares one
  Postgres container.

## Production Hardening Checklist

- Use managed Postgres, Redis, RabbitMQ, and SMTP where possible.
- Run Keycloak with a managed database, TLS, a fixed public hostname, and
  imported realm/client configuration.
- Keep Kong Admin API private.
- Rotate `INTERNAL_GATEWAY_SECRET` and Keycloak credentials.
- Validate tokens with issuer, audience, expiry, and RS256 signatures.
- Enable centralized JSON log collection.
- Monitor `/health`, RabbitMQ queue depth, DLQ depth, HTTP error rate, and
  database connection saturation.
- Run CI before every deploy.
