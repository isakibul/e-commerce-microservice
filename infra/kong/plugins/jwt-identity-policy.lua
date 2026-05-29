local function clear_identity_headers()
  kong.service.request.clear_header("X-User-Id")
  kong.service.request.clear_header("X-User-Email")
  kong.service.request.clear_header("X-User-Name")
  kong.service.request.clear_header("X-User-Role")
  kong.service.request.clear_header("X-Internal-Service")
end

local function is_blocked_public_route(method, path)
  return method == "POST" and path == "/users"
end

clear_identity_headers()

local method = kong.request.get_method()
local path = kong.request.get_path()

if is_blocked_public_route(method, path) then
  return kong.response.exit(404, { message = "Not Found" })
end
