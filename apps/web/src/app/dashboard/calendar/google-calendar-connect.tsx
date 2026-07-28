"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getGoogleCalendarStatus,
  getGoogleCalendarConnectUrl,
  disconnectGoogleCalendar,
  syncGoogleCalendar,
  ApiError,
} from "@/lib/api";

export function GoogleCalendarConnect({
  token,
  onSynced,
}: {
  token: string;
  onSynced: () => Promise<void>;
}) {
  const searchParams = useSearchParams();
  const googleParam = searchParams.get("google");

  const [connected, setConnected] = useState<boolean | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    getGoogleCalendarStatus(token)
      .then((status) => setConnected(status.connected))
      .catch(() => setConnected(false));
  }, [token]);

  const notice =
    actionNotice ?? (googleParam === "connected" ? "Google Calendar erfolgreich verbunden." : null);
  const error =
    actionError ??
    (googleParam === "error"
      ? "Verbindung mit Google Calendar fehlgeschlagen. Bitte erneut versuchen."
      : null);
  const isConnected = connected || googleParam === "connected";

  async function handleConnect() {
    setActionError(null);
    try {
      const { url } = await getGoogleCalendarConnectUrl(token);
      window.location.href = url;
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Verbinden fehlgeschlagen");
    }
  }

  async function handleDisconnect() {
    setActionError(null);
    try {
      await disconnectGoogleCalendar(token);
      setConnected(false);
      setActionNotice(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Trennen fehlgeschlagen");
    }
  }

  async function handleSync() {
    setActionError(null);
    setIsSyncing(true);
    try {
      const result = await syncGoogleCalendar(token);
      setActionNotice(
        `Synchronisiert: ${result.updated} aktualisiert, ${result.cancelled} storniert.`,
      );
      await onSynced();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Synchronisieren fehlgeschlagen");
    } finally {
      setIsSyncing(false);
    }
  }

  if (connected === null) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
      {isConnected ? (
        <>
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            ✓ Mit Google Calendar verbunden
          </span>
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="rounded border border-black/15 px-3 py-1.5 text-sm font-medium text-black disabled:opacity-50 dark:border-white/15 dark:text-zinc-50"
          >
            {isSyncing ? "Synchronisiert..." : "Jetzt synchronisieren"}
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            className="text-sm text-zinc-500 underline hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
          >
            Trennen
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={handleConnect}
          className="rounded border border-black/15 px-3 py-1.5 text-sm font-medium text-black dark:border-white/15 dark:text-zinc-50"
        >
          Google Calendar verbinden
        </button>
      )}
      {notice && <span className="text-sm text-green-700 dark:text-green-400">{notice}</span>}
      {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
