"use client";

import { useAuth } from "@/lib/auth-context";
import { InvoicesPanel } from "@/components/invoices-panel";

export default function InvoicesPage() {
  const { token } = useAuth();

  if (!token) return null;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
        Rechnungen
      </h1>
      <InvoicesPanel token={token} />
    </div>
  );
}
