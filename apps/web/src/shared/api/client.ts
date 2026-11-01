import type { ErrorResponse } from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details: NonNullable<ErrorResponse['error']['details']> = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      headers: {
        ...(init?.body instanceof Blob ? {} : { 'Content-Type': 'application/json' }),
        ...init?.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Не удалось связаться с API. Проверьте, запущен ли сервер.', 0);
  }
  if (!response.ok) {
    const body: ErrorResponse | null = await response.json().catch(() => null);
    const details = body?.error?.details
      ?.map((detail) => (typeof detail.msg === 'string' ? detail.msg : ''))
      .filter(Boolean)
      .join(' ');
    throw new ApiError(
      details || body?.error?.message || 'Не удалось выполнить запрос.',
      response.status,
      body?.error?.details ?? [],
    );
  }
  return response.json() as Promise<T>;
}
