"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/dashboard/customers", label: "Kunden" },
  { href: "/dashboard/services", label: "Leistungen" },
  { href: "/dashboard/calendar", label: "Kalender" },
  { href: "/dashboard/invoices", label: "Rechnungen" },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { tenant, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <nav className="border-b border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-black dark:text-zinc-50">
            PT One
          </Link>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "text-sm font-medium text-black underline dark:text-zinc-50"
                    : "text-sm font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">{tenant?.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-zinc-600 underline hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Abmelden
          </button>
        </div>
      </div>
    </nav>
  );
}
