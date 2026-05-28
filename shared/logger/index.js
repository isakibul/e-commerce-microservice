const createLogger = (serviceName) => ({
  info: (message, meta) =>
    console.log(JSON.stringify({ level: "info", serviceName, message, meta })),
  warn: (message, meta) =>
    console.warn(JSON.stringify({ level: "warn", serviceName, message, meta })),
  error: (message, meta) =>
    console.error(JSON.stringify({ level: "error", serviceName, message, meta })),
});

module.exports = { createLogger };

