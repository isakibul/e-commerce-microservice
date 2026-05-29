# Operations Runbook

## Health Checks

All services expose `/health`. Through Kong:

```txt
GET /auth/health
GET /users/health
GET /products/health
GET /inventories/health
GET /cart/health
GET /orders/health
GET /emails/health
```

After Kong is configured, run the health smoke script:

```bash
./scripts/smoke-health.sh
```

Healthy services return `200`. Dependency failures return `503` with a `checks`
object naming the degraded dependency.

## Logs

Services emit structured JSON logs with:

```txt
timestamp
level
serviceName
message
meta.requestId
meta.method
meta.path
meta.statusCode
meta.durationMs
```

Every HTTP response includes:

```txt
X-Request-Id
```

Pass the same request ID through client calls to trace a request across the
system.

## Common Incidents

### Kong Returns 404

Run:

```bash
./infra/kong/setup.sh
```

Confirm Kong Admin API is reachable:

```bash
curl http://127.0.0.1:8001/status
```

### Service Returns 403

The request is missing Kong's internal gateway secret. Client traffic should go
through Kong at `http://localhost:8000`, not directly to service containers.

### RabbitMQ Messages Stop Processing

Check RabbitMQ UI:

```txt
http://localhost:15672
```

Inspect retry and DLQ queues:

```txt
*.retry
*.dlq
```

Repeated failures usually mean a malformed payload, unavailable dependency, or
consumer bug.

### Production Service Fails On Startup

If `NODE_ENV=production`, check that secret values are not local placeholders:

```txt
JWT_SECRET
INTERNAL_GATEWAY_SECRET
```

The services intentionally fail fast when production secrets are missing or
unsafe.
