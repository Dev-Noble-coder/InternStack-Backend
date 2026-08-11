export class AppError extends Error {
  constructor(public readonly status: number, message: string, public readonly code = 'ERROR') { super(message); }
}
export const badRequest = (message: string) => new AppError(400, message, 'VALIDATION_ERROR');