local jwt_parser = require "kong.plugins.jwt.jwt_parser"

local jwt_secret = "__JWT_SECRET__"

local function starts_with(value, prefix)
  return value:sub(1, #prefix) == prefix
end

local function clear_identity_headers()
  kong.service.request.clear_header("X-User-Id")
  kong.service.request.clear_header("X-User-Email")
  kong.service.request.clear_header("X-User-Name")
  kong.service.request.clear_header("X-User-Role")
end

local function extract_bearer_token()
  local header = kong.request.get_header("Authorization")
  if not header then
    return nil
  end

  return header:match("^[Bb]earer%s+(.+)$")
end

local function authenticate()
  local token = extract_bearer_token()
  if not token then
    return nil, "missing_token"
  end

  local jwt, parse_error = jwt_parser:new(token)
  if not jwt then
    return nil, parse_error or "invalid_token"
  end

  if jwt.header.alg ~= "HS256" then
    return nil, "unsupported_algorithm"
  end

  if not jwt:verify_signature(jwt_secret) then
    return nil, "invalid_signature"
  end

  local claims_ok = jwt:verify_registered_claims({ "exp" })
  if not claims_ok then
    return nil, "invalid_claims"
  end

  local claims = jwt.claims or {}
  if not claims.userId or not claims.email or not claims.name or not claims.role then
    return nil, "missing_claims"
  end

  return {
    id = tostring(claims.userId),
    email = tostring(claims.email),
    name = tostring(claims.name),
    role = tostring(claims.role),
  }
end

local function is_public_route(method, path)
  if method == "GET" and (path == "/products" or starts_with(path, "/products/")) then
    return true
  end

  if method == "POST" and (
    path == "/auth/register" or
    path == "/auth/login" or
    path == "/auth/refresh-token" or
    path == "/auth/logout" or
    path == "/auth/verify-email" or
    path == "/auth/resend-verification"
  ) then
    return true
  end

  if starts_with(path, "/cart") then
    return true
  end

  return false
end

local function is_blocked_public_route(method, path)
  return method == "POST" and path == "/users"
end

local function requires_admin(method, path)
  if path == "/products" and method == "POST" then
    return true
  end

  if starts_with(path, "/products/") and method ~= "GET" then
    return true
  end

  if starts_with(path, "/inventories") and (method == "POST" or method == "PUT" or method == "DELETE") then
    return true
  end

  if path == "/emails" and method == "GET" then
    return true
  end

  return false
end

clear_identity_headers()

local method = kong.request.get_method()
local path = kong.request.get_path()

if is_blocked_public_route(method, path) then
  return kong.response.exit(404, { message = "Not Found" })
end

if is_public_route(method, path) then
  return
end

local user, auth_error = authenticate()
if not user then
  return kong.response.exit(401, {
    message = "Unauthorized",
    error = auth_error,
  })
end

if requires_admin(method, path) and user.role ~= "ADMIN" then
  return kong.response.exit(403, { message = "Forbidden" })
end

kong.service.request.set_header("X-User-Id", user.id)
kong.service.request.set_header("X-User-Email", user.email)
kong.service.request.set_header("X-User-Name", user.name)
kong.service.request.set_header("X-User-Role", user.role)
