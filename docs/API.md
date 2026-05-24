# API Reference

All client traffic should go through the API gateway.

Base URL:

```txt
http://localhost:8081/api
```

Internal service ports are not public API. Services reject non-health requests unless they include the internal gateway secret header.

## Common Headers

| Header | Required | Details |
| --- | --- | --- |
| `Authorization: Bearer <accessToken>` | Protected routes only | Returned by `POST /auth/login`. |
| `x-cart-session-id: <sessionId>` | Existing cart operations | Returned by `POST /cart/add-to-cart` for a new cart. |
| `Content-Type: application/json` | Requests with JSON body | Use for all `POST` and `PUT` requests. |

## Auth

### `POST /auth/register`

Creates a pending auth user, creates a user profile, and sends a 6-digit email verification code.

Body:

```json
{
  "email": "customer@example.com",
  "password": "password123",
  "name": "Customer Name"
}
```

Expects:
- `email`: valid email
- `password`: 8-128 characters
- `name`: 2-50 characters

### `POST /auth/login`

Logs in a verified active user and returns an access token.

Body:

```json
{
  "email": "customer@example.com",
  "password": "password123"
}
```

Response includes:

```json
{
  "accessToken": "jwt..."
}
```

### `POST /auth/verify-email`

Verifies a pending account using the email verification code.

Body:

```json
{
  "email": "customer@example.com",
  "code": "123456"
}
```

### `POST /auth/verify-token`

Validates an access token. Mostly used by the gateway.

Body:

```json
{
  "accessToken": "jwt..."
}
```

## Products

Product status values: `DRAFT`, `PUBLISHED`, `UNLISTED`.

### `GET /products`

Public product list.

Query params:

| Param | Details |
| --- | --- |
| `page` | Optional positive integer. Default `1`. |
| `limit` | Optional positive integer, max `100`. Default `20`. |
| `status` | Optional product status. |
| `search` | Optional search text for name/SKU. |

### `GET /products/:id`

Gets product details and inventory stock.

Protected: requires Bearer token.

### `POST /products`

Creates a product and its inventory record.

Protected: requires Bearer token. Product service allows admin users only.

Body:

```json
{
  "sku": "SKU123",
  "name": "Product name",
  "description": "Optional description",
  "price": 99.99,
  "status": "DRAFT"
}
```

Expects:
- `sku`: 3-10 characters, normalized to uppercase
- `name`: 3-255 characters
- `description`: optional, max 1000 characters
- `price`: optional nonnegative number, default `0`
- `status`: optional, default `DRAFT`

### `PUT /products/:id`

Updates product fields except SKU.

Protected: requires Bearer token. Product service allows admin users only.

Body can contain any of:

```json
{
  "name": "Updated product name",
  "description": "Updated description",
  "price": 89.99,
  "status": "PUBLISHED"
}
```

## Inventory

Inventory action values: `In`, `Out`.

### `POST /inventories`

Creates an inventory record. Normally called internally when a product is created.

Protected: requires Bearer token.

Body:

```json
{
  "productId": "product_id",
  "sku": "SKU123",
  "quantity": 0
}
```

Expects:
- `productId`: non-empty string
- `sku`: 3-10 characters, normalized to uppercase
- `quantity`: optional nonnegative integer, default `0`

### `GET /inventories/:id`

Returns current inventory quantity.

Protected: requires Bearer token.

### `GET /inventories/:id/details`

Returns inventory details with recent movement history.

Protected: requires Bearer token.

Query params:

| Param | Details |
| --- | --- |
| `historyLimit` | Optional integer from `1` to `200`. Default `50`. |

### `PUT /inventories/:id`

Moves stock in or out.

Protected: requires Bearer token.

Body:

```json
{
  "quantity": 5,
  "actionType": "In"
}
```

Expects:
- `quantity`: positive integer
- `actionType`: `In` or `Out`

## User Profiles

### `POST /users`

Creates a user profile. Normally called internally by auth registration.

Protected: requires Bearer token.

Body:

```json
{
  "authUserId": "auth_user_id",
  "name": "Customer Name",
  "email": "customer@example.com",
  "address": "Optional address",
  "phone": "Optional phone"
}
```

### `GET /users/:id`

Gets a user profile by profile ID.

Protected: requires Bearer token. Users can read their own profile; admins can read any profile.

Query params:

| Param | Details |
| --- | --- |
| `field=authUserId` | Optional. Look up by auth user ID instead of profile ID. `filed=authUserId` is also accepted for backward compatibility. |

### `PUT /users/:id`

Updates a user profile.

Protected: requires Bearer token. Users can update their own profile; admins can update any profile.

Body can contain any of:

```json
{
  "name": "Updated Name",
  "email": "new-email@example.com",
  "address": "Updated address",
  "phone": "Updated phone"
}
```

## Email

### `POST /emails/send`

Sends and records an email.

Protected: requires Bearer token through the gateway. Internal services also call this endpoint directly with the internal gateway secret.

Body:

```json
{
  "recipient": "customer@example.com",
  "subject": "Subject",
  "body": "Email body",
  "source": "source-name",
  "sender": "optional-sender@example.com"
}
```

Expects:
- `recipient`: valid email
- `subject`: 1-255 characters
- `body`: 1-10000 characters
- `source`: 1-100 characters
- `sender`: optional valid email; non-admin authenticated callers use the default sender

### `GET /emails`

Lists sent email records.

Protected: requires Bearer token. Email service allows admin users only.

Query params:

| Param | Details |
| --- | --- |
| `page` | Optional positive integer. Default `1`. |
| `limit` | Optional positive integer, max `100`. Default `20`. |
| `recipient` | Optional recipient email filter. |
| `source` | Optional source filter. |

## Cart

Cart is session based. Save the `x-cart-session-id` response header after adding the first item and send it on later cart requests.

### `POST /cart/add-to-cart`

Adds, updates, or removes a cart item. Increasing quantity reserves inventory. Decreasing quantity releases inventory. Set quantity to `0` to remove the item.

Body:

```json
{
  "productId": "product_id",
  "inventoryId": "inventory_id",
  "quantity": 2
}
```

Expects:
- `productId`: non-empty string
- `inventoryId`: non-empty string
- `quantity`: nonnegative integer

Headers:
- `x-cart-session-id`: optional. If omitted or expired, a new session is created.

### `GET /cart/me`

Returns cart items for the current cart session.

Headers:
- `x-cart-session-id`: optional. Missing or expired session returns an empty cart.

### `GET /cart/clear`

Clears the current cart and releases reserved inventory.

Headers:
- `x-cart-session-id`: optional. Missing session is treated as empty cart.

## Orders

### `POST /orders/checkout`

Creates an order from the current cart. User identity is taken from the Bearer token, not the request body.

Protected: requires Bearer token.

Body:

```json
{
  "cartSessionId": "cart_session_id"
}
```

Expects:
- `cartSessionId`: non-empty string

Notes:
- Checkout is idempotent by cart session ID.
- On success, the cart is finalized without releasing reserved inventory.

### `GET /orders`

Lists orders for the authenticated user. Admin users can list all orders.

Protected: requires Bearer token.

Query params:

| Param | Details |
| --- | --- |
| `page` | Optional positive integer. Default `1`. |
| `limit` | Optional positive integer, max `100`. Default `20`. |

### `GET /orders/:id`

Gets one order with its order items.

Protected: requires Bearer token. Users can read their own orders; admins can read any order.

## Health Checks

Gateway health:

```txt
GET /health
```

Internal service health endpoints are also available directly on each service for orchestration:

```txt
GET /health
```

## Internal Isolation

The gateway and services must share the same environment value:

```txt
INTERNAL_GATEWAY_SECRET=<strong-secret>
```

Clients should never send this header. It is for gateway and service-to-service traffic only.
