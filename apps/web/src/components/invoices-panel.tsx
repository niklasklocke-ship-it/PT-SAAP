"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  listInvoices,
  createInvoice,
  cancelInvoice,
  listCustomers,
  ApiError,
  type Invoice,
  type Customer,
} from "@/lib/api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE");
}

const STATUS_LABEL: Record<Invoice["status"], string> = {
  OPEN: "Offen",
  PAID: "Bezahlt",
  OVERDUE: "Überfällig",
  CANCELLED: "Storniert",
};

export function InvoicesPanel({
  token,
  customerId,
}: {
  token: string;
  customerId?: string;
}) {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    listInvoices(token)
      .then(setInvoices)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Fehler beim Laden"));
    if (!customerId) {
      listCustomers(token).then(setCustomers).catch(() => setCustomers([]));
    }
  }, [token, customerId]);

  async function refresh() {
    setInvoices(await listInvoices(token));
  }

  const visibleInvoices = useMemo(
    () => (customerId ? (invoices ?? []).filter((inv) => inv.customerId === customerId) : invoices ?? []),
    [invoices, customerId],
  );

  async function handleCancel(id: string) {
    try {
      await cancelInvoice(token, id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Stornieren fehlgeschlagen");
    }
  }

  return (
    <div className="rounded-lg border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Rechnungen</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          {showForm ? "Abbrechen" : "+ Neue Rechnung"}
        </button>
      </div>

      {showForm && (
        <NewInvoiceForm
          token={token}
          customerId={customerId}
          customers={customers}
          onCreated={async () => {
            await refresh();
            setShowForm(false);
          }}
        />
      )}

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!invoices && !error && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
      )}

      {invoices && visibleInvoices.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Noch keine Rechnungen.</p>
      )}

      {visibleInvoices.length > 0 && (
        <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 text-zinc-600 dark:border-white/10 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">Nr.</th>
                {!customerId && <th className="px-3 py-2 font-medium">Kunde</th>}
                <th className="px-3 py-2 font-medium">Datum</th>
                <th className="px-3 py-2 font-medium">Betrag</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {visibleInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-black/5 last:border-0 dark:border-white/5"
                >
                  <td className="px-3 py-2 text-black dark:text-zinc-50">
                    {invoice.invoiceNumber}
                  </td>
                  {!customerId && (
                    <td className="px-3 py-2 text-black dark:text-zinc-50">
                      {invoice.customer.name}
                    </td>
                  )}
                  <td className="px-3 py-2 text-black dark:text-zinc-50">
                    {formatDate(invoice.issuedAt)}
                  </td>
                  <td className="px-3 py-2 text-black dark:text-zinc-50">
                    {invoice.amount} €
                  </td>
                  <td className="px-3 py-2 text-black dark:text-zinc-50">
                    {STATUS_LABEL[invoice.status]}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {invoice.status !== "CANCELLED" && (
                      <button
                        type="button"
                        onClick={() => handleCancel(invoice.id)}
                        className="text-xs text-zinc-500 underline hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                      >
                        stornieren
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NewInvoiceForm({
  token,
  customerId,
  customers,
  onCreated,
}: {
  token: string;
  customerId?: string;
  customers: Customer[] | null;
  onCreated: () => Promise<void>;
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId ?? "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedCustomerId || !amount) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await createInvoice(token, {
        customerId: selectedCustomerId,
        amount: Number(amount),
      });
      setAmount("");
      await onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Anlegen fehlgeschlagen");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-3">
      {!customerId && (
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Kunde
          </label>
          <select
            required
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
          >
            <option value="" disabled>
              Kunde wählen...
            </option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id} className="text-black">
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Betrag (€)
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32 rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {isSubmitting ? "Wird angelegt..." : "Anlegen"}
      </button>
      {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
