export type ApiError = {
  message: string;
  status: number;
  errors?: Array<{
    field: string;
    message: string;
  }>;
};

export type HealthResponse = {
  ok: boolean;
  service: string;
  database?: string;
};

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export function getApiBaseUrl() {
  return apiBaseUrl || "/api";
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Partial<ApiError> | null;

    throw {
      message: payload?.message ?? `Request failed with status ${response.status}`,
      status: response.status,
      errors: payload?.errors
    } satisfies ApiError;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getHealth() {
  return apiRequest<HealthResponse>("/api/health");
}
