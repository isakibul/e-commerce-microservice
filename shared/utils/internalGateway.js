const DEFAULT_FALLBACK_SECRET = "local_internal_gateway_secret";

const createInternalOnlyMiddleware = ({
  secret,
  allowPaths = ["/health"],
  fallbackSecret = DEFAULT_FALLBACK_SECRET,
}) => {
  return (req, res, next) => {
    if (allowPaths.includes(req.path)) {
      return next();
    }

    if (process.env.NODE_ENV === "production" && secret === fallbackSecret) {
      return res
        .status(500)
        .json({ message: "Internal secret is not configured" });
    }

    if (req.headers["x-internal-gateway-secret"] !== secret) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  };
};

module.exports = { createInternalOnlyMiddleware };

