"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { tenant } = useAuth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Willkommen, {tenant?.name}
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Termine folgen als Nächstes.
      </p>
      <Link
        href="/dashboard/customers"
        className="rounded bg-black px-5 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        Zu den Kunden
      </Link>
    </div>
  );
}
