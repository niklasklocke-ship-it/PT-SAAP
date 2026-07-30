"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { getProfile, updateProfile, ApiError, type TenantProfile } from "@/lib/api";
import { SaveButton } from "@/components/save-button";

const PLAN_LABEL: Record<string, string> = {
  trial: "Testphase",
};

export default function ProfilePage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [paymentMethodLabel, setPaymentMethodLabel] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!token) return;
    getProfile(token)
      .then((p) => {
        setProfile(p);
        setName(p.name);
        setTaxId(p.taxId ?? "");
        setPaymentMethodLabel(p.paymentMethodLabel ?? "");
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Fehler beim Laden"));
  }, [token]);

  async function saveProfile() {
    if (!token) return;
    setError(null);
    setIsSubmitting(true);
    setIsSaved(false);
    try {
      const updated = await updateProfile(token, {
        name,
        taxId: taxId || undefined,
        paymentMethodLabel: paymentMethodLabel || undefined,
      });
      setProfile(updated);
      setIsSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await saveProfile();
  }

  if (!token) return null;

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">Profil</h1>

      <form
        onSubmit={handleSubmit}
        className="mb-6 rounded-lg border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950"
      >
        <h2 className="mb-4 text-lg font-semibold text-black dark:text-zinc-50">
          Stammdaten
        </h2>

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-3 w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
        />

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          E-Mail
        </label>
        <input
          type="email"
          disabled
          value={profile.email}
          className="mb-3 w-full rounded border border-black/15 bg-transparent px-3 py-2 text-zinc-500 dark:border-white/15 dark:text-zinc-400"
        />

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Steuernummer
        </label>
        <input
          type="text"
          value={taxId}
          onChange={(e) => setTaxId(e.target.value)}
          placeholder="z.B. DE123456789"
          className="mb-3 w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
        />

        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <SaveButton isSubmitting={isSubmitting} isSaved={isSaved} />
      </form>

      <div className="rounded-lg border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="mb-4 text-lg font-semibold text-black dark:text-zinc-50">
          Abo &amp; Zahlung
        </h2>

        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Plan: {PLAN_LABEL[profile.subscriptionPlan] ?? profile.subscriptionPlan}
        </p>

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Zahlungsart
        </label>
        <input
          type="text"
          value={paymentMethodLabel}
          onChange={(e) => setPaymentMethodLabel(e.target.value)}
          onBlur={saveProfile}
          placeholder="z.B. Kreditkarte endet auf 4242"
          className="w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
        />
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Nur ein Hinweistext für dich - keine echte Zahlungsabwicklung.
        </p>
      </div>
    </div>
  );
}
