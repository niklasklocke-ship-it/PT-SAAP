// Schlichte, einfarbige Strich-Icons (kein Icon-Paket nötig für vier Symbole).
// currentColor, damit sie sich automatisch an Light/Dark-Mode anpassen.
import type { ReactNode } from "react";

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7 text-black dark:text-zinc-50"
    >
      {children}
    </svg>
  );
}

export function CustomersIcon() {
  return (
    <IconBase>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M15.5 6.5a2.5 2.5 0 0 1 0 5" />
      <path d="M17 14.2c1.7.5 3 2 3 3.8" />
    </IconBase>
  );
}

export function ServicesIcon() {
  return (
    <IconBase>
      <path d="M12.5 3.5 20 11l-9 9-7.5-7.5V4h8.5Z" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function CalendarIcon() {
  return (
    <IconBase>
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3.5" />
      <path d="M16 3v3.5" />
    </IconBase>
  );
}

export function InvoicesIcon() {
  return (
    <IconBase>
      <path d="M6 3.5h12v17l-2.5-1.5L13 20l-2.5-1.5L8 20l-2-1.5V3.5Z" />
      <path d="M9 8h6" />
      <path d="M9 11.5h6" />
      <path d="M9 15h4" />
    </IconBase>
  );
}
