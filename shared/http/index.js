const { randomUUID } = require("crypto");
const { HttpError } = require("../errors/httpError");

const requestIdHeader = "x-request-id";

const createRequestContext = ({ logger } = {}) => {
  return (req, res, next) => {
    const incomingRequestId = req.headers[requestIdHeader];
    const requestId =
      typeof incomingRequestId === "string" && incomingRequestId.trim()
        ? incomingRequestId
        : randomUUID();

    req.requestId = requestId;
    res.setHeader(requestIdHeader, requestId);

    if (logger) {
      req.log = logger;
    }

    next();
  };
};

const createHttpLogger = ({ logger }) => {
  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const level = res.statusCode >= 500 ? "error" : "info";

      logger[level]("http_request", {
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        requestId: req.requestId,
      });
    });

    next();
  };
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Not Found",
      requestId: req.requestId,
    },
  });
};

const createErrorHandler = ({ logger }) => {
  return (err, req, res, _next) => {
    const statusCode =
      err instanceof HttpError && Number.isInteger(err.statusCode)
        ? err.statusCode
        : 500;
    const exposeMessage = statusCode < 500;
    const message = exposeMessage ? err.message : "Internal Server Error";

    logger.error("request_error", {
      errorName: err.name,
      errorMessage: err.message,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode,
      requestId: req.requestId,
    });

    res.status(statusCode).json({
      error: {
        code: err.code || (statusCode === 500 ? "INTERNAL_ERROR" : "HTTP_ERROR"),
        message,
        details: exposeMessage ? err.details : undefined,
        requestId: req.requestId,
      },
    });
  };
};

module.exports = {
  createRequestContext,
  createHttpLogger,
  createErrorHandler,
  notFoundHandler,
  requestIdHeader,
};
