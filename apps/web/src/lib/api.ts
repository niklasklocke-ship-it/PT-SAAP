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

  // Manche Endpunkte (z.B. DELETE) antworten mit leerem Body auch bei
  // Status != 204 - res.json() würde dann mit einem Parse-Fehler
  // fehlschlagen, obwohl der Request erfolgreich war.
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
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

function authRequest<T>(token: string, path: string, options: RequestInit = {}): Promise<T> {
  return request<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  trainingGoalsSummary: string | null;
  trainingGoalsDetail: string | null;
  trainingPlan: string | null;
  createdAt: string;
}

export interface CustomerInput {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  trainingGoalsSummary?: string;
  trainingGoalsDetail?: string;
  trainingPlan?: string;
}

export function listCustomers(token: string) {
  return authRequest<Customer[]>(token, "/customers");
}

export function getCustomer(token: string, id: string) {
  return authRequest<Customer>(token, `/customers/${id}`);
}

export function createCustomer(token: string, data: CustomerInput) {
  return authRequest<Customer>(token, "/customers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCustomer(token: string, id: string, data: Partial<CustomerInput>) {
  return authRequest<Customer>(token, `/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteCustomer(token: string, id: string) {
  return authRequest<void>(token, `/customers/${id}`, { method: "DELETE" });
}

export interface ExerciseLog {
  id: string;
  customerId: string;
  category: string | null;
  exerciseName: string;
  weight: string | null;
  sets: number | null;
  reps: number | null;
  performedAt: string;
  notes: string | null;
  createdAt: string;
}

export interface ExerciseLogInput {
  customerId: string;
  category?: string;
  exerciseName: string;
  weight?: number;
  sets?: number;
  reps?: number;
  performedAt: string;
  notes?: string;
}

export function listExerciseLogs(token: string, customerId: string) {
  return authRequest<ExerciseLog[]>(token, `/exercise-logs/customer/${customerId}`);
}

export function createExerciseLog(token: string, data: ExerciseLogInput) {
  return authRequest<ExerciseLog>(token, "/exercise-logs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteExerciseLog(token: string, id: string) {
  return authRequest<void>(token, `/exercise-logs/${id}`, { method: "DELETE" });
}
