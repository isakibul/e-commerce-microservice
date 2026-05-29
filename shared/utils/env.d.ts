export declare const parseInteger: (
  value: string | undefined,
  fallback: number,
) => number;

export declare const assertRequiredEnv: (
  serviceName: string,
  names: string[],
) => void;

export declare const assertProductionSecrets: (
  serviceName: string,
  names: string[],
  localSecretMarkers?: string[],
) => void;
