export type ErrorCode = 'not_found' | 'invalid' | 'conflict';
const STATUS = { not_found: 404, invalid: 400, conflict: 409 } as const;

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly issues?: unknown,
  ) {
    super(message);
  }
  get status() {
    return STATUS[this.code];
  }
}

export const notFound = (what: string) => new AppError('not_found', `${what} not found`);
