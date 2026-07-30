"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  listAppointments,
  createAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  listCustomers,
  listServices,
  ApiError,
  type Appointment,
  type AppointmentStatus,
  type Customer,
  type Service,
} from "@/lib/api";
import { GoogleCalendarConnect } from "./google-calendar-connect";
import { SaveButton } from "@/components/save-button";

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  BOOKED: "Gebucht",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Storniert",
  NO_SHOW: "Nicht erschienen",
};

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function todayDateKey() {
  return toDateKey(new Date());
}

function buildMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = Montag
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { date: Date; isCurrentMonth: boolean }[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month, day), isCurrentMonth: true });
  }
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({ date: new Date(year, month + 1, nextDay), isCurrentMonth: false });
    nextDay += 1;
  }
  return cells;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export default function CalendarPage() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(todayDateKey);

  useEffect(() => {
    if (!token) return;
    listAppointments(token)
      .then(setAppointments)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Fehler beim Laden"));
    listCustomers(token).then(setCustomers).catch(() => setCustomers([]));
    listServices(token).then(setServices).catch(() => setServices([]));
  }, [token]);

  async function refresh() {
    if (!token) return;
    setAppointments(await listAppointments(token));
  }

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    if (!appointments) return map;
    for (const appt of appointments) {
      const key = toDateKey(new Date(appt.startTime));
      const list = map.get(key);
      if (list) list.push(appt);
      else map.set(key, [appt]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }
    return map;
  }, [appointments]);

  const monthCells = useMemo(
    () => buildMonthGrid(monthCursor.year, monthCursor.month),
    [monthCursor],
  );

  const monthLabel = new Date(monthCursor.year, monthCursor.month, 1).toLocaleDateString(
    "de-DE",
    { month: "long", year: "numeric" },
  );

  function goToPrevMonth() {
    setMonthCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  }
  function goToNextMonth() {
    setMonthCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
  }
  function goToToday() {
    const now = new Date();
    setMonthCursor({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDate(todayDateKey());
  }

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    try {
      await updateAppointmentStatus(token!, id, status);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Aktion fehlgeschlagen");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAppointment(token!, id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Löschen fehlgeschlagen");
    }
  }

  if (!token) return null;

  const selectedAppointments = appointmentsByDate.get(selectedDate) ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Kalender</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          {showForm ? "Abbrechen" : "+ Neuer Termin"}
        </button>
      </div>

      {showForm && (
        <NewAppointmentForm
          token={token}
          customers={customers}
          services={services}
          initialDate={selectedDate}
          onCreated={async () => {
            await refresh();
            setShowForm(false);
          }}
        />
      )}

      <GoogleCalendarConnect token={token} onSynced={refresh} />

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mb-6 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="rounded border border-black/15 px-2 py-1 text-sm dark:border-white/15"
              aria-label="Vorheriger Monat"
            >
              ‹
            </button>
            <h2 className="w-40 text-center text-base font-semibold capitalize text-black dark:text-zinc-50">
              {monthLabel}
            </h2>
            <button
              type="button"
              onClick={goToNextMonth}
              className="rounded border border-black/15 px-2 py-1 text-sm dark:border-white/15"
              aria-label="Nächster Monat"
            >
              ›
            </button>
          </div>
          <button
            type="button"
            onClick={goToToday}
            className="text-sm underline text-zinc-600 dark:text-zinc-400"
          >
            Heute
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded border border-black/10 bg-black/10 text-xs dark:border-white/10 dark:bg-white/10">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="bg-zinc-50 px-1 py-1 text-center font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
            >
              {label}
            </div>
          ))}
          {monthCells.map(({ date, isCurrentMonth }) => {
            const dateKey = toDateKey(date);
            const dayAppointments = appointmentsByDate.get(dateKey) ?? [];
            const isSelected = dateKey === selectedDate;
            const isToday = dateKey === todayDateKey();
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDate(dateKey)}
                className={`flex min-h-[72px] flex-col items-start gap-0.5 bg-white p-1 text-left align-top dark:bg-zinc-950 ${
                  isSelected ? "ring-2 ring-inset ring-black dark:ring-white" : ""
                } ${isCurrentMonth ? "" : "opacity-40"}`}
              >
                <span
                  className={
                    isToday
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black"
                      : "text-zinc-700 dark:text-zinc-300"
                  }
                >
                  {date.getDate()}
                </span>
                {dayAppointments.slice(0, 2).map((appt) => (
                  <span
                    key={appt.id}
                    className="w-full truncate rounded bg-zinc-100 px-1 text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {formatTime(appt.startTime)} {appt.customer.name}
                  </span>
                ))}
                {dayAppointments.length > 2 && (
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    +{dayAppointments.length - 2} mehr
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("de-DE", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </h2>

        {selectedAppointments.length === 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Keine Termine an diesem Tag.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {selectedAppointments.map((appt) => (
            <div
              key={appt.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
            >
              <span className="w-28 shrink-0 font-medium text-black dark:text-zinc-50">
                {formatTime(appt.startTime)}–{formatTime(appt.endTime)}
              </span>
              <span className="flex-1 text-black dark:text-zinc-50">
                {appt.customer.name}
                <span className="text-zinc-500 dark:text-zinc-400"> · {appt.service.name}</span>
              </span>
              <select
                value={appt.status}
                onChange={(e) => handleStatusChange(appt.id, e.target.value as AppointmentStatus)}
                className="rounded border border-black/15 bg-transparent px-2 py-1 text-sm text-black dark:border-white/15 dark:text-zinc-50"
              >
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value} className="text-black">
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      `Termin mit ${appt.customer.name} am ${formatTime(appt.startTime)} wirklich löschen?`,
                    )
                  ) {
                    handleDelete(appt.id);
                  }
                }}
                className="text-xs text-zinc-500 underline hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
              >
                löschen
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NewAppointmentForm({
  token,
  customers,
  services,
  initialDate,
  onCreated,
}: {
  token: string;
  customers: Customer[];
  services: Service[];
  initialDate: string;
  onCreated: () => Promise<void>;
}) {
  const [customerId, setCustomerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState("09:00");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const selectedService = services.find((s) => s.id === serviceId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!customerId || !serviceId || !selectedService) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const start = new Date(`${date}T${startTime}:00`);
      const end = new Date(start.getTime() + selectedService.durationMin * 60_000);
      await createAppointment(token, {
        customerId,
        serviceId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      setIsSubmitting(false);
      setIsSaved(true);
      await new Promise((resolve) => setTimeout(resolve, 700));
      await onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Anlegen fehlgeschlagen");
      setIsSubmitting(false);
    }
  }

  if (customers.length === 0) {
    return (
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Noch keine Kunden angelegt - lege zuerst einen Kunden an.
      </p>
    );
  }

  if (services.length === 0) {
    return (
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Noch keine Leistungen angelegt.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Kunde
        </label>
        <select
          required
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
        >
          <option value="" disabled>
            Kunde wählen...
          </option>
          {customers.map((c) => (
            <option key={c.id} value={c.id} className="text-black">
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Leistung
        </label>
        <select
          required
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
        >
          <option value="" disabled>
            Leistung wählen...
          </option>
          {services.map((s) => (
            <option key={s.id} value={s.id} className="text-black">
              {s.name} ({s.durationMin} Min.)
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Datum
        </label>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Uhrzeit
        </label>
        <input
          type="time"
          required
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
        />
      </div>
      <SaveButton
        isSubmitting={isSubmitting}
        isSaved={isSaved}
        idleLabel="Termin anlegen"
        submittingLabel="Wird angelegt..."
        savedLabel="Angelegt ✓"
      />
      {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
