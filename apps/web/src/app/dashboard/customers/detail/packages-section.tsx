"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  listCustomerPackages,
  createCustomerPackage,
  consumeCustomerPackageSession,
  listServices,
  ApiError,
  type CustomerPackage,
  type Service,
} from "@/lib/api";
import { SaveButton } from "@/components/save-button";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE");
}

export function PackagesSection({
  token,
  customerId,
}: {
  token: string;
  customerId: string;
}) {
  const [packages, setPackages] = useState<CustomerPackage[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    listCustomerPackages(token, customerId)
      .then(setPackages)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Fehler beim Laden"));
    listServices(token).then(setServices).catch(() => setServices([]));
  }, [token, customerId]);

  async function refresh() {
    setPackages(await listCustomerPackages(token, customerId));
  }

  async function handleConsume(id: string) {
    setError(null);
    try {
      await consumeCustomerPackageSession(token, id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verbrauchen fehlgeschlagen");
    }
  }

  return (
    <div className="rounded-lg border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Pakete & Abos</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          {showForm ? "Abbrechen" : "+ Paket verkaufen"}
        </button>
      </div>

      {showForm && (
        <NewPackageForm
          token={token}
          customerId={customerId}
          services={services.filter((s) => s.type === "PACKAGE" || s.type === "SUBSCRIPTION")}
          onCreated={async () => {
            await refresh();
            setShowForm(false);
          }}
        />
      )}

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!packages && !error && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
      )}

      {packages && packages.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Noch keine Pakete oder Abos verkauft.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {packages?.map((pkg) => (
          <div
            key={pkg.id}
            className="flex flex-wrap items-center gap-3 rounded border border-black/10 p-4 dark:border-white/10"
          >
            <div className="flex-1">
              <div className="font-medium text-black dark:text-zinc-50">
                {pkg.service.name}
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                {pkg.remainingSessions} Einheit(en) übrig
                {pkg.validUntil ? ` · gültig bis ${formatDate(pkg.validUntil)}` : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleConsume(pkg.id)}
              disabled={pkg.remainingSessions <= 0}
              className="rounded border border-black/15 px-3 py-1.5 text-sm font-medium text-black disabled:opacity-40 dark:border-white/15 dark:text-zinc-50"
            >
              Einheit verbrauchen
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewPackageForm({
  token,
  customerId,
  services,
  onCreated,
}: {
  token: string;
  customerId: string;
  services: Service[];
  onCreated: () => Promise<void>;
}) {
  const [serviceId, setServiceId] = useState("");
  const [remainingSessions, setRemainingSessions] = useState("10");
  const [validUntil, setValidUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!serviceId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await createCustomerPackage(token, {
        customerId,
        serviceId,
        remainingSessions: Number(remainingSessions),
        validUntil: validUntil || undefined,
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

  if (services.length === 0) {
    return (
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Keine Leistungen vom Typ &bdquo;Paket&ldquo; oder &bdquo;Abo&ldquo; angelegt. Lege zuerst
        eine passende Leistung unter &bdquo;Leistungen&ldquo; an.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-3">
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
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Einheiten
        </label>
        <input
          type="number"
          min="1"
          required
          value={remainingSessions}
          onChange={(e) => setRemainingSessions(e.target.value)}
          className="w-24 rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Gültig bis (optional)
        </label>
        <input
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          className="rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
        />
      </div>
      <SaveButton
        isSubmitting={isSubmitting}
        isSaved={isSaved}
        idleLabel="Verkaufen"
        savedLabel="Verkauft ✓"
      />
      {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
