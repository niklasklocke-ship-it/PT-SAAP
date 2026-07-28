"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Tenant } from "./api";

interface StoredAuth {
  token: string;
  tenant: Tenant;
}

const STORAGE_KEY = "pt-saas-auth";
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

function parseStored(raw: string | null): StoredAuth | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

interface AuthContextValue {
  token: string | null;
  tenant: Tenant | null;
  setAuth: (token: string, tenant: Tenant) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const stored = parseStored(raw);

  const setAuth = useCallback((token: string, tenant: Tenant) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, tenant } satisfies StoredAuth));
    emitChange();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    emitChange();
  }, []);

  return (
    <AuthContext.Provider
      value={{ token: stored?.token ?? null, tenant: stored?.tenant ?? null, setAuth, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth muss innerhalb von AuthProvider verwendet werden");
  }
  return ctx;
}
