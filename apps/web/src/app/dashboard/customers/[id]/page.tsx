"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getCustomer, updateCustomer, ApiError, type Customer } from "@/lib/api";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const { token } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getCustomer(token, params.id)
      .then(setCustomer)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Fehler beim Laden"),
      );
  }, [token, params.id]);

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
        <Link href="/dashboard/customers" className="mt-4 inline-block underline">
          Zurück zur Kundenliste
        </Link>
      </div>
    );
  }

  if (!customer || !token) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <p className="text-zinc-600 dark:text-zinc-400">Lädt...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link
        href="/dashboard/customers"
        className="mb-6 inline-block text-sm underline text-zinc-600 dark:text-zinc-400"
      >
        ← Zurück zur Kundenliste
      </Link>

      <h1 className="mb-1 text-2xl font-semibold text-black dark:text-zinc-50">
        {customer.name}
      </h1>
      <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        {customer.email ?? "keine E-Mail"}
        {customer.phone ? ` · ${customer.phone}` : ""}
      </p>

      <TrainingGoalsSection token={token} customer={customer} onSaved={setCustomer} />
      <TrainingPlanSection token={token} customer={customer} onSaved={setCustomer} />
    </div>
  );
}

function SaveButton({
  isSubmitting,
  isSaved,
}: {
  isSubmitting: boolean;
  isSaved: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
    >
      {isSubmitting ? "Speichert..." : isSaved ? "Gespeichert ✓" : "Speichern"}
    </button>
  );
}

function TrainingGoalsSection({
  token,
  customer,
  onSaved,
}: {
  token: string;
  customer: Customer;
  onSaved: (customer: Customer) => void;
}) {
  const [summary, setSummary] = useState(customer.trainingGoalsSummary ?? "");
  const [detail, setDetail] = useState(customer.trainingGoalsDetail ?? "");
  const [showDetail, setShowDetail] = useState(Boolean(customer.trainingGoalsDetail));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    setIsSaved(false);
    try {
      const updated = await updateCustomer(token, customer.id, {
        trainingGoalsSummary: summary || undefined,
        trainingGoalsDetail: detail || undefined,
      });
      onSaved(updated);
      setIsSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-lg border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950"
    >
      <h2 className="mb-4 text-lg font-semibold text-black dark:text-zinc-50">
        Trainingsziele
      </h2>

      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Kurzübersicht
      </label>
      <input
        type="text"
        placeholder="z.B. 5kg abnehmen, Rücken stärken"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        className="mb-3 w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
      />

      {!showDetail && (
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="mb-3 text-sm underline text-zinc-600 dark:text-zinc-400"
        >
          + Detaillierteres Ziel hinzufügen
        </button>
      )}

      {showDetail && (
        <>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Details
          </label>
          <textarea
            rows={4}
            placeholder="Ausführlichere Beschreibung der Trainingsziele..."
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className="mb-3 w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
          />
        </>
      )}

      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <SaveButton isSubmitting={isSubmitting} isSaved={isSaved} />
    </form>
  );
}

function TrainingPlanSection({
  token,
  customer,
  onSaved,
}: {
  token: string;
  customer: Customer;
  onSaved: (customer: Customer) => void;
}) {
  const [plan, setPlan] = useState(customer.trainingPlan ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    setIsSaved(false);
    try {
      const updated = await updateCustomer(token, customer.id, {
        trainingPlan: plan || undefined,
      });
      onSaved(updated);
      setIsSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-lg border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950"
    >
      <h2 className="mb-4 text-lg font-semibold text-black dark:text-zinc-50">
        Trainingsplan
      </h2>

      <textarea
        rows={6}
        placeholder="z.B. Mo: Ganzkörper, Mi: Cardio, Fr: Oberkörper..."
        value={plan}
        onChange={(e) => setPlan(e.target.value)}
        className="mb-3 w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
      />

      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <SaveButton isSubmitting={isSubmitting} isSaved={isSaved} />
    </form>
  );
}
