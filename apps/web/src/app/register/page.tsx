"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerTenant, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await registerTenant({ name, email, password });
      setAuth(res.accessToken, res.tenant);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registrierung fehlgeschlagen");
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
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Registrieren
        </h1>

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
        />

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

        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Passwort
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          {isSubmitting ? "Wird registriert..." : "Registrieren"}
        </button>

        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Schon ein Konto?{" "}
          <Link href="/login" className="font-medium underline">
            Anmelden
          </Link>
        </p>
      </form>
    </div>
  );
}
