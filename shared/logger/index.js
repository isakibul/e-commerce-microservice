const writeLog = (level, serviceName, message, meta) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    serviceName,
    message,
    ...(meta ? { meta } : {}),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
};

const createLogger = (serviceName) => ({
  info: (message, meta) => writeLog("info", serviceName, message, meta),
  warn: (message, meta) => writeLog("warn", serviceName, message, meta),
  error: (message, meta) => writeLog("error", serviceName, message, meta),
});

module.exports = { createLogger };
