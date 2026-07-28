import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

// Liefert erst nach der Hydration `true`. Verhindert, dass Komponenten
// (z.B. ein Auth-Redirect) mit dem Server-Platzhalterwert von
// useSyncExternalStore (z.B. "kein Token") vorschnell handeln, bevor der
// echte Client-Wert (localStorage) übernommen wurde.
export function useHydrated() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
