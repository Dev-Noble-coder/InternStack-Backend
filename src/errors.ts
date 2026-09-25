export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "ERROR",
    public readonly details?: unknown,
  ) {
    super(message);
  }
}
export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, message, "VALIDATION_ERROR", details);
