import type { ApiErrorBody, HealthResponse, LandingSite, SiteListResponse } from '@/types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiError(0, 'network_error', 'Cannot reach the LUNAR SCOPE backend. Is it running on port 8000?');
  }

  if (!response.ok) {
    let body: Partial<ApiErrorBody> | undefined;
    try {
      body = (await response.json()) as Partial<ApiErrorBody>;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'http_error',
      body?.error?.message ?? `Request failed with status ${response.status}`,
      body?.error?.details,
    );
  }
  return (await response.json()) as T;
}

export const api = {
  health: () => request<HealthResponse>('/health'),
  listSites: () => request<SiteListResponse>('/sites'),
  getSite: (siteId: string) => request<LandingSite>(`/sites/${encodeURIComponent(siteId)}`),
};
