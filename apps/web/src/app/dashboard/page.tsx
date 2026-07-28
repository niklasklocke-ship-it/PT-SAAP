"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  CustomersIcon,
  ServicesIcon,
  CalendarIcon,
  InvoicesIcon,
} from "@/components/dashboard-icons";

const TILES = [
  {
    href: "/dashboard/customers",
    Icon: CustomersIcon,
    label: "Kunden",
    description: "Kundenliste, Trainingsziele, Trainingsplan & Fortschritt",
  },
  {
    href: "/dashboard/services",
    Icon: ServicesIcon,
    label: "Leistungen",
    description: "Einzelstunden, 10er-Karten und Abos verwalten",
  },
  {
    href: "/dashboard/calendar",
    Icon: CalendarIcon,
    label: "Kalender",
    description: "Termine planen und mit Google Calendar synchronisieren",
  },
  {
    href: "/dashboard/invoices",
    Icon: InvoicesIcon,
    label: "Rechnungen",
    description: "Rechnungen erstellen, Status verwalten",
  },
];

export default function DashboardPage() {
  const { tenant } = useAuth();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold text-black dark:text-zinc-50">
        Willkommen, {tenant?.name}
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TILES.map(({ href, Icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col gap-2 rounded-lg border border-black/10 bg-white p-6 transition-colors hover:border-black/25 hover:bg-black/[.02] dark:border-white/10 dark:bg-zinc-950 dark:hover:border-white/25 dark:hover:bg-white/[.03]"
          >
            <Icon />
            <span className="text-lg font-semibold text-black dark:text-zinc-50">{label}</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
