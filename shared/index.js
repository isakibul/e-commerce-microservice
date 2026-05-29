const { HttpError } = require("./errors/httpError");
const { createLogger } = require("./logger");
const {
  createErrorHandler,
  createHttpLogger,
  createRequestContext,
  notFoundHandler,
} = require("./http");
const {
  assertProductionSecrets,
  assertRequiredEnv,
  parseInteger,
} = require("./utils/env");
const { createInternalOnlyMiddleware } = require("./utils/internalGateway");

module.exports = {
  HttpError,
  createLogger,
  createErrorHandler,
  createHttpLogger,
  createRequestContext,
  createInternalOnlyMiddleware,
  notFoundHandler,
  assertProductionSecrets,
  assertRequiredEnv,
  parseInteger,
};
