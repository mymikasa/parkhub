export interface ApiErrorBody {
  code: string;
  message: string;
}

export class ApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}
