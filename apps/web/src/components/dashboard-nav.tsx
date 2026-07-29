"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/dashboard/customers", label: "Kunden" },
  { href: "/dashboard/services", label: "Leistungen" },
  { href: "/dashboard/calendar", label: "Kalender" },
  { href: "/dashboard/invoices", label: "Rechnungen" },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { tenant, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen && !isMobileNavOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setIsMobileNavOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        setIsMobileNavOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen, isMobileNavOpen]);

  function handleLogout() {
    setIsMenuOpen(false);
    logout();
    router.push("/login");
  }

  return (
    <nav
      ref={navRef}
      className="border-b border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950"
    >
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              setIsMobileNavOpen((open) => !open);
            }}
            aria-expanded={isMobileNavOpen}
            aria-label={isMobileNavOpen ? "Menü schließen" : "Menü öffnen"}
            className="-ml-1 rounded p-1 text-zinc-600 hover:bg-black/5 hover:text-black dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-50 sm:hidden"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              {isMobileNavOpen ? (
                <path d="M6 6l8 8m0-8l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M3 5.5A.75.75 0 013.75 4.75h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 5.5zM3 10a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 10zm0 4.5a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z"
                  clipRule="evenodd"
                />
              )}
            </svg>
          </button>
          <Link href="/dashboard" className="font-semibold text-black dark:text-zinc-50">
            PT One
          </Link>
          <div className="hidden items-center gap-6 sm:flex">
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
        </div>
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            className={
              "flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium transition-colors " +
              (isMenuOpen || pathname?.startsWith("/dashboard/profile")
                ? "bg-black/5 text-black dark:bg-white/10 dark:text-zinc-50"
                : "text-zinc-600 hover:bg-black/5 hover:text-black dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-50")
            }
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-xs font-semibold text-white dark:bg-white dark:text-black">
              {initials(tenant?.name ?? "")}
            </span>
            <span className="hidden sm:inline">{tenant?.name}</span>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className={"h-4 w-4 transition-transform " + (isMenuOpen ? "rotate-180" : "")}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-10 mt-2 w-56 rounded-lg border border-black/10 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-zinc-950"
            >
              <div className="border-b border-black/10 px-4 py-3 dark:border-white/10">
                <p className="truncate text-sm font-medium text-black dark:text-zinc-50">
                  {tenant?.name}
                </p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{tenant?.email}</p>
              </div>
              <Link
                href="/dashboard/profile"
                role="menuitem"
                className="block px-4 py-2 text-sm text-zinc-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                Profil
              </Link>
              <button
                role="menuitem"
                onClick={handleLogout}
                className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                Abmelden
              </button>
            </div>
          )}
        </div>
      </div>

      {isMobileNavOpen && (
        <div className="border-t border-black/10 px-6 py-2 dark:border-white/10 sm:hidden">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "block py-2 text-sm font-medium text-black dark:text-zinc-50"
                    : "block py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
