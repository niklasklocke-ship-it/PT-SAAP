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

export interface TrainingExercise {
  id: string;
  sectionId: string;
  name: string;
  sets: number | null;
  reps: number | null;
  weight: string | null;
  restSeconds: number | null;
  notes: string | null;
  order: number;
}

export interface TrainingSection {
  id: string;
  dayId: string;
  category: string;
  order: number;
  exercises: TrainingExercise[];
}

export interface TrainingDay {
  id: string;
  planId: string;
  name: string;
  order: number;
  sections: TrainingSection[];
}

export interface TrainingPlan {
  id: string;
  customerId: string;
  createdAt: string;
  updatedAt: string;
  days: TrainingDay[];
}

export interface TrainingExerciseInput {
  sectionId: string;
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  restSeconds?: number;
  notes?: string;
}

export function getOrCreateTrainingPlan(token: string, customerId: string) {
  return authRequest<TrainingPlan>(token, `/training-plans/customer/${customerId}`);
}

export function addTrainingDay(token: string, planId: string, name: string) {
  return authRequest<TrainingDay>(token, "/training-plans/days", {
    method: "POST",
    body: JSON.stringify({ planId, name }),
  });
}

export function renameTrainingDay(token: string, id: string, name: string) {
  return authRequest<TrainingDay>(token, `/training-plans/days/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function removeTrainingDay(token: string, id: string) {
  return authRequest<void>(token, `/training-plans/days/${id}`, { method: "DELETE" });
}

export function reorderTrainingDays(token: string, planId: string, ids: string[]) {
  return authRequest<void>(token, `/training-plans/days/${planId}/reorder`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export function addTrainingSection(token: string, dayId: string, category: string) {
  return authRequest<TrainingSection>(token, "/training-plans/sections", {
    method: "POST",
    body: JSON.stringify({ dayId, category }),
  });
}

export function updateTrainingSection(token: string, id: string, category: string) {
  return authRequest<TrainingSection>(token, `/training-plans/sections/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ category }),
  });
}

export function removeTrainingSection(token: string, id: string) {
  return authRequest<void>(token, `/training-plans/sections/${id}`, { method: "DELETE" });
}

export function reorderTrainingSections(token: string, dayId: string, ids: string[]) {
  return authRequest<void>(token, `/training-plans/sections/${dayId}/reorder`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export function addTrainingExercise(token: string, data: TrainingExerciseInput) {
  return authRequest<TrainingExercise>(token, "/training-plans/exercises", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTrainingExercise(
  token: string,
  id: string,
  data: Partial<TrainingExerciseInput>,
) {
  return authRequest<TrainingExercise>(token, `/training-plans/exercises/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function removeTrainingExercise(token: string, id: string) {
  return authRequest<void>(token, `/training-plans/exercises/${id}`, { method: "DELETE" });
}

export function reorderTrainingExercises(token: string, sectionId: string, ids: string[]) {
  return authRequest<void>(token, `/training-plans/exercises/${sectionId}/reorder`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export type InvoiceStatus = "OPEN" | "PAID" | "OVERDUE" | "CANCELLED";

export interface Invoice {
  id: string;
  tenantId: string;
  customerId: string;
  appointmentId: string | null;
  invoiceNumber: string;
  amount: string;
  taxRate: string;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string | null;
  customer: Customer;
}

export interface InvoiceInput {
  customerId: string;
  appointmentId?: string;
  amount: number;
  taxRate?: number;
  dueAt?: string;
}

export function listInvoices(token: string) {
  return authRequest<Invoice[]>(token, "/invoices");
}

export function createInvoice(token: string, data: InvoiceInput) {
  return authRequest<Invoice>(token, "/invoices", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function cancelInvoice(token: string, id: string) {
  return authRequest<Invoice>(token, `/invoices/${id}/cancel`, { method: "PATCH" });
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  price: string;
  durationMin: number;
  type: "SINGLE" | "PACKAGE" | "SUBSCRIPTION";
  createdAt: string;
}

export function listServices(token: string) {
  return authRequest<Service[]>(token, "/services");
}

export type AppointmentStatus = "BOOKED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export interface Appointment {
  id: string;
  tenantId: string;
  customerId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  createdAt: string;
  customer: Customer;
  service: Service;
}

export interface AppointmentInput {
  customerId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
}

export function listAppointments(token: string, from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return authRequest<Appointment[]>(token, `/appointments${query ? `?${query}` : ""}`);
}

export function createAppointment(token: string, data: AppointmentInput) {
  return authRequest<Appointment>(token, "/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAppointmentStatus(token: string, id: string, status: AppointmentStatus) {
  return authRequest<Appointment>(token, `/appointments/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteAppointment(token: string, id: string) {
  return authRequest<void>(token, `/appointments/${id}`, { method: "DELETE" });
}

export interface GoogleCalendarStatus {
  connected: boolean;
  connectedAt: string | null;
}

export function getGoogleCalendarStatus(token: string) {
  return authRequest<GoogleCalendarStatus>(token, "/google-calendar/status");
}

export function getGoogleCalendarConnectUrl(token: string) {
  return authRequest<{ url: string }>(token, "/google-calendar/connect");
}

export function disconnectGoogleCalendar(token: string) {
  return authRequest<{ connected: boolean }>(token, "/google-calendar/disconnect", {
    method: "POST",
  });
}

export function syncGoogleCalendar(token: string) {
  return authRequest<{ updated: number; cancelled: number }>(token, "/google-calendar/sync", {
    method: "POST",
  });
}
