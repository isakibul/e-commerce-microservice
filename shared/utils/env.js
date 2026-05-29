const DEFAULT_LOCAL_SECRET_MARKERS = ["local_", "local-dev", "change_me"];

const parseInteger = (value, fallback) => {
  const parsed = value ? Number.parseInt(value, 10) : fallback;
  return Number.isFinite(parsed) ? parsed : fallback;
};

const assertRequiredEnv = (serviceName, names) => {
  const missing = names.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `${serviceName} is missing required environment variables: ${missing.join(", ")}`,
    );
  }
};

const assertProductionSecrets = (
  serviceName,
  names,
  localSecretMarkers = DEFAULT_LOCAL_SECRET_MARKERS,
) => {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const unsafe = names.filter((name) => {
    const value = process.env[name];

    return (
      !value ||
      localSecretMarkers.some((marker) => value.toLowerCase().includes(marker))
    );
  });

  if (unsafe.length > 0) {
    throw new Error(
      `${serviceName} has unsafe production secrets: ${unsafe.join(", ")}`,
    );
  }
};

module.exports = {
  assertProductionSecrets,
  assertRequiredEnv,
  parseInteger,
};
