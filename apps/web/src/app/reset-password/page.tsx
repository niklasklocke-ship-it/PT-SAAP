"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPassword, ApiError } from "@/lib/api";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (newPassword !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      setIsDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Zurücksetzen fehlgeschlagen");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm rounded-lg border border-black/10 bg-white p-8 dark:border-white/10 dark:bg-zinc-950">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Neues Passwort
        </h1>

        {!token ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            Der Link ist ungültig. Bitte fordere einen neuen Link an.
          </p>
        ) : isDone ? (
          <>
            <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
              Dein Passwort wurde erfolgreich zurückgesetzt.
            </p>
            <Link
              href="/login"
              className="block w-full rounded bg-black px-4 py-2 text-center font-medium text-white dark:bg-white dark:text-black"
            >
              Zum Login
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Neues Passwort
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mb-4 w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
            />

            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Passwort bestätigen
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mb-6 w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
            />

            {error && (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded bg-black px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {isSubmitting ? "Wird gespeichert..." : "Passwort speichern"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
