"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { listCustomers, createCustomer, ApiError, type Customer } from "@/lib/api";
import { SaveButton } from "@/components/save-button";

export default function CustomersPage() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!token) return;
    listCustomers(token)
      .then(setCustomers)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Fehler beim Laden"));
  }, [token]);

  function handleCreated(customer: Customer) {
    setCustomers((prev) => (prev ? [customer, ...prev] : [customer]));
    setShowForm(false);
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Kunden
        </h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          {showForm ? "Abbrechen" : "+ Neuer Kunde"}
        </button>
      </div>

      {showForm && token && (
        <NewCustomerForm token={token} onCreated={handleCreated} />
      )}

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!customers && !error && (
        <p className="text-zinc-600 dark:text-zinc-400">Lädt...</p>
      )}

      {customers && customers.length === 0 && (
        <p className="text-zinc-600 dark:text-zinc-400">Noch keine Kunden angelegt.</p>
      )}

      {customers && customers.length > 0 && (
        <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
          {customers.map((customer) => (
            <li key={customer.id}>
              <Link
                href={`/dashboard/customers/detail?id=${customer.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-black/[.03] dark:hover:bg-white/[.03]"
              >
                <span className="font-medium text-black dark:text-zinc-50">
                  {customer.name}
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {customer.email ?? "keine E-Mail"}
                  {customer.trainingGoalsSummary
                    ? ` · Ziel: ${customer.trainingGoalsSummary}`
                    : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewCustomerForm({
  token,
  onCreated,
}: {
  token: string;
  onCreated: (customer: Customer) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const customer = await createCustomer(token, {
        name,
        email: email || undefined,
        phone: phone || undefined,
      });
      setIsSubmitting(false);
      setIsSaved(true);
      await new Promise((resolve) => setTimeout(resolve, 700));
      onCreated(customer);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Anlegen fehlgeschlagen");
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-lg border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950"
    >
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            E-Mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Telefon
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
          />
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <SaveButton
        isSubmitting={isSubmitting}
        isSaved={isSaved}
        idleLabel="Kunde anlegen"
        submittingLabel="Wird angelegt..."
        savedLabel="Angelegt ✓"
      />
    </form>
  );
}
