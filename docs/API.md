# API Documentation

Public API base URL:

```txt
http://localhost:8000
```

Kong is the public gateway. App service ports are internal to the Docker network,
so client traffic should enter through Kong.

## Common Headers

For JSON requests:

```txt
Content-Type: application/json
```

For cart requests, keep the returned cart session header and send it back:

```txt
X-Cart-Session-Id: <cart-session-id>
```

For protected routes, send the access token returned by login:

```txt
Authorization: Bearer <access-token>
```

Every response includes a request ID for debugging:

```txt
X-Request-Id: <request-id>
```

Clients may also send `X-Request-Id` and the services will propagate it.

Kong validates the JWT, removes any spoofed `X-User-*` headers from the client,
and forwards trusted identity headers to the downstream services.

## Auth

### Register

```txt
POST /auth/register
```

Body:

```json
{
  "name": "Isakibul",
  "email": "isakibul@example.com",
  "password": "Pass1234"
}
```

Success:

```txt
201 Created
```

### Login

```txt
POST /auth/login
```

Body:

```json
{
  "email": "isakibul@example.com",
  "password": "Pass1234"
}
```

Success returns access and refresh tokens. The account must be verified and
active.

### Verify Email

```txt
POST /auth/verify-email
```

Body:

```json
{
  "email": "isakibul@example.com",
  "code": "123456"
}
```

### Resend Verification

```txt
POST /auth/resend-verification
```

Body:

```json
{
  "email": "isakibul@example.com"
}
```

### Refresh Token

```txt
POST /auth/refresh-token
```

Body:

```json
{
  "refreshToken": "<refresh-token>"
}
```

### Logout

```txt
POST /auth/logout
```

Body:

```json
{
  "refreshToken": "<refresh-token>"
}
```

### Verify Access Token

```txt
POST /auth/verify-token
```

Body:

```json
{
  "accessToken": "<access-token>"
}
```

## Products

### List Products

```txt
GET /products?page=1&limit=20&status=PUBLISHED&search=shirt
```

Query parameters:

```txt
page: positive number, default 1
limit: positive number up to 100, default 20
status: DRAFT | PUBLISHED | UNLISTED
search: optional text
```

### Get Product

```txt
GET /products/:id
```

### Create Product

Requires an admin bearer token.

```txt
POST /products
```

Body:

```json
{
  "sku": "SKU001",
  "name": "Demo Product",
  "description": "Optional description",
  "price": 29.99,
  "status": "PUBLISHED"
}
```

### Update Product

Requires an admin bearer token.

```txt
PUT /products/:id
```

Body:

```json
{
  "name": "Updated Product",
  "description": "Updated description",
  "price": 34.99,
  "status": "UNLISTED"
}
```

## Inventory

### Create Inventory

Requires an admin bearer token.

```txt
POST /inventories
```

Body:

```json
{
  "productId": "product-id",
  "sku": "SKU001",
  "quantity": 10
}
```

### Get Inventory

Requires a bearer token.

```txt
GET /inventories/:id
```

### Get Inventory Details

Requires a bearer token.

```txt
GET /inventories/:id/details?historyLimit=50
```

### Update Inventory

Requires an admin bearer token.

```txt
PUT /inventories/:id
```

Body:

```json
{
  "quantity": 2,
  "actionType": "In"
}
```

`actionType` can be:

```txt
In
Out
```

## Cart

### Add To Cart

```txt
POST /cart/add-to-cart
```

Body:

```json
{
  "productId": "product-id",
  "inventoryId": "inventory-id",
  "quantity": 1
}
```

If a new cart is created, the response includes:

```txt
X-Cart-Session-Id: <cart-session-id>
```

Use that header for future cart requests.

### Get My Cart

```txt
GET /cart/me
```

Headers:

```txt
X-Cart-Session-Id: <cart-session-id>
```

### Clear Cart

```txt
DELETE /cart
```

or legacy route:

```txt
GET /cart/clear
```

Headers:

```txt
X-Cart-Session-Id: <cart-session-id>
```

## Orders

### Checkout

Requires a bearer token.

```txt
POST /orders/checkout
```

Body:

```json
{
  "cartSessionId": "cart-session-id"
}
```

Checkout is idempotent by cart session. If the order already exists, the service
returns the existing order.

### List Orders

Requires a bearer token.

```txt
GET /orders?page=1&limit=20
```

Admins can see all orders. Normal users see their own orders.

### Get Order

Requires a bearer token.

```txt
GET /orders/:id
```

## Users

These routes are mainly used internally by auth and trusted clients.

### Create User Profile

This route is not exposed publicly through Kong.

```txt
POST /users
```

Body:

```json
{
  "authUserId": "auth-user-id",
  "name": "Isakibul",
  "email": "isakibul@example.com",
  "address": "Optional address",
  "phone": "Optional phone"
}
```

### Get User

Requires a bearer token.

```txt
GET /users/:id
```

Lookup by auth user id:

```txt
GET /users/:id?field=authUserId
```

### Update User

Requires a bearer token.

```txt
PUT /users/:id
```

Body:

```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "address": "Updated address",
  "phone": "01700000000"
}
```

## Emails

### Send Email

Requires a bearer token.

```txt
POST /emails/send
```

Body:

```json
{
  "recipient": "user@example.com",
  "subject": "Hello",
  "body": "Email body",
  "source": "manual",
  "sender": "admin@example.com"
}
```

### List Emails

Requires an admin bearer token.

```txt
GET /emails?page=1&limit=20&recipient=user@example.com&source=manual
```

## Health Checks

Public health endpoints through Kong:

```txt
GET http://localhost:8000/products/health     product
GET http://localhost:8000/inventories/health  inventory
GET http://localhost:8000/auth/health         auth
GET http://localhost:8000/users/health        user
GET http://localhost:8000/emails/health       email
GET http://localhost:8000/cart/health         cart
GET http://localhost:8000/orders/health       order
```

Internal service health checks are available only inside the Compose network:

```bash
docker compose exec product wget -qO- http://product:4001/health
```

Kong and local tools:

```txt
Kong Proxy:     http://localhost:8000
Kong Admin API: http://127.0.0.1:8001
Kong Manager:   http://127.0.0.1:8002
RabbitMQ UI:    http://localhost:15672
MailHog UI:     http://localhost:8025
PgAdmin:        http://localhost:5050
RedisInsight:   http://localhost:8011
```

## Kong Setup Command

After starting or rebuilding the Docker stack, apply Kong routes and plugins:

```bash
./infra/kong/setup.sh
```

The old wrapper command also works:

```bash
./scripts/setup-kong.sh
```
