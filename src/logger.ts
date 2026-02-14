export type LogLevel = "ERROR" | "INFO" | "DEBUG";

export interface Logger {
  level: LogLevel;
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  ERROR: 0,
  INFO: 1,
  DEBUG: 2
};

function shouldLog(current: LogLevel, required: LogLevel): boolean {
  return LEVEL_ORDER[current] >= LEVEL_ORDER[required];
}

function formatMeta(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) return "";
  return ` ${JSON.stringify(meta)}`;
}

export function createLogger(level: LogLevel): Logger {
  return {
    level,
    debug(message, meta) {
      if (!shouldLog(level, "DEBUG")) return;
      console.log(`[DEBUG] ${message}${formatMeta(meta)}`);
    },
    info(message, meta) {
      if (!shouldLog(level, "INFO")) return;
      console.log(`[INFO] ${message}${formatMeta(meta)}`);
    },
    error(message, meta) {
      if (!shouldLog(level, "ERROR")) return;
      console.error(`[ERROR] ${message}${formatMeta(meta)}`);
    }
  };
}
