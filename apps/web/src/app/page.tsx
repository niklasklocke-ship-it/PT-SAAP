import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-6 px-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          PT One
        </h1>
        <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
          Terminmanagement & Buchhaltung für Personal Trainer.
        </p>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded bg-black px-5 py-2 font-medium text-white dark:bg-white dark:text-black"
          >
            Anmelden
          </Link>
          <Link
            href="/register"
            className="rounded border border-black/15 px-5 py-2 font-medium text-black dark:border-white/15 dark:text-zinc-50"
          >
            Registrieren
          </Link>
        </div>
      </main>
    </div>
  );
}
