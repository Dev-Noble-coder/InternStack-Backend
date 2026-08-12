import { Log, LogLevel } from "../models/log";

export type LogRequest = {
  method?: string;
  path?: string;
  statusCode?: number;
  ip?: string;
  userAgent?: string;
  durationMs?: number;
};

export type LogInput = {
  level: LogLevel;
  message: string;
  error?: unknown;
  request?: LogRequest;
  context?: Record<string, unknown>;
};

const errorDetails = (error: unknown) => {
  if (error instanceof Error) {
    const candidate = error as Error & { code?: string };
    return {
      errorName: error.name,
      errorCode: candidate.code,
      stack: error.stack,
    };
  }
  return { context: { error: String(error) } };
};

export const logger = {
  write(input: LogInput): void {
    const details = errorDetails(input.error);
    const document = {
      level: input.level,
      message: input.message,
      errorName: details.errorName,
      errorCode: details.errorCode,
      stack: details.stack,
      request: input.request,
      context: {
        ...input.context,
        ...details.context,
      },
    };

    const output = input.error ?? input.message;
    if (input.level === "error") {
      console.error(input.message, output);
    } else if (input.level === "warn") {
      console.warn(input.message, output);
    } else {
      console.info(input.message, output);
    }

    if (Log.db.readyState !== 1) {
      return;
    }

    void Log.create(document).catch((persistError) => {
      console.error("Failed to persist application log", persistError);
    });
  },
  info(message: string, context?: Record<string, unknown>): void {
    this.write({ level: "info", message, context });
  },
  warn(message: string, context?: Record<string, unknown>): void {
    this.write({ level: "warn", message, context });
  },
  error(
    message: string,
    error?: unknown,
    request?: LogRequest,
    context?: Record<string, unknown>,
  ): void {
    this.write({ level: "error", message, error, request, context });
  },
};
