"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { forgotPassword, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await forgotPassword(email);
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Anfrage fehlgeschlagen");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-black/10 bg-white p-8 dark:border-white/10 dark:bg-zinc-950"
      >
        <h1 className="mb-2 text-2xl font-semibold text-black dark:text-zinc-50">
          Passwort vergessen
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Gib deine E-Mail-Adresse ein, wir senden dir einen Link zum Zurücksetzen.
        </p>

        {message ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{message}</p>
        ) : (
          <>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              E-Mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
            />

            {error && (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded bg-black px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {isSubmitting ? "Wird gesendet..." : "Link senden"}
            </button>
          </>
        )}

        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/login" className="font-medium underline">
            Zurück zum Login
          </Link>
        </p>
      </form>
    </div>
  );
}
