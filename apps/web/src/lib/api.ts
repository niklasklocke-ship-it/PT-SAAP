const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.message ?? res.statusText;
    throw new ApiError(res.status, Array.isArray(message) ? message.join(", ") : message);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  publicApiKey: string;
}

export interface AuthResponse {
  accessToken: string;
  tenant: Tenant;
}

export function registerTenant(data: { name: string; email: string; password: string }) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function login(data: { email: string; password: string }) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
