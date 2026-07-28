"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  listServices,
  createService,
  updateService,
  deleteService,
  ApiError,
  type Service,
  type ServiceInput,
} from "@/lib/api";

const TYPE_LABEL: Record<ServiceInput["type"], string> = {
  SINGLE: "Einzelstunde",
  PACKAGE: "Paket (10er-Karte)",
  SUBSCRIPTION: "Abo",
};

export default function ServicesPage() {
  const { token } = useAuth();
  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    listServices(token)
      .then(setServices)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Fehler beim Laden"));
  }, [token]);

  async function refresh() {
    if (!token) return;
    setServices(await listServices(token));
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteService(token!, id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Löschen fehlgeschlagen");
    }
  }

  if (!token) return null;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Leistungen</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          {showForm ? "Abbrechen" : "+ Neue Leistung"}
        </button>
      </div>

      {showForm && (
        <ServiceForm
          token={token}
          onSaved={async () => {
            await refresh();
            setShowForm(false);
          }}
        />
      )}

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!services && !error && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
      )}

      {services && services.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Noch keine Leistungen angelegt.</p>
      )}

      <div className="flex flex-col gap-3">
        {services?.map((service) =>
          editingId === service.id ? (
            <ServiceForm
              key={service.id}
              token={token}
              service={service}
              onSaved={async () => {
                await refresh();
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div
              key={service.id}
              className="flex items-center gap-4 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
            >
              <div className="flex-1">
                <div className="font-medium text-black dark:text-zinc-50">{service.name}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  {service.price} € · {service.durationMin} Min. · {TYPE_LABEL[service.type]}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingId(service.id)}
                className="text-xs text-zinc-500 underline hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                bearbeiten
              </button>
              <button
                type="button"
                onClick={() => handleDelete(service.id)}
                className="text-xs text-zinc-500 underline hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
              >
                löschen
              </button>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function ServiceForm({
  token,
  service,
  onSaved,
  onCancel,
}: {
  token: string;
  service?: Service;
  onSaved: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [price, setPrice] = useState(service?.price ?? "");
  const [durationMin, setDurationMin] = useState(service?.durationMin.toString() ?? "60");
  const [type, setType] = useState<ServiceInput["type"]>(service?.type ?? "SINGLE");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const data: ServiceInput = {
        name,
        price: Number(price),
        durationMin: Number(durationMin),
        type,
      };
      if (service) {
        await updateService(token, service.id, data);
      } else {
        await createService(token, data);
        setName("");
        setPrice("");
        setDurationMin("60");
        setType("SINGLE");
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Personal Training Einzelstunde"
          className="w-56 rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Preis (€)
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-28 rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Dauer (Min.)
        </label>
        <input
          type="number"
          min="5"
          required
          value={durationMin}
          onChange={(e) => setDurationMin(e.target.value)}
          className="w-24 rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Typ
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ServiceInput["type"])}
          className="rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
        >
          {Object.entries(TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value} className="text-black">
              {label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {isSubmitting ? "Speichert..." : "Speichern"}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-black/15 px-4 py-2 text-sm font-medium text-black dark:border-white/15 dark:text-zinc-50"
        >
          Abbrechen
        </button>
      )}
      {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
