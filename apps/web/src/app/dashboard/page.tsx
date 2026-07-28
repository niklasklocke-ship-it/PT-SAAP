"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const router = useRouter();
  const { tenant, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Angemeldet als {tenant?.name}
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Kundenliste, Termine und Rechnungen folgen als Nächstes.
      </p>
      <button
        onClick={handleLogout}
        className="rounded border border-black/15 px-4 py-2 text-sm font-medium text-black dark:border-white/15 dark:text-zinc-50"
      >
        Abmelden
      </button>
    </div>
  );
}
