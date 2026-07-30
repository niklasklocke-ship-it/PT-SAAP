"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getSubscriptionStatus,
  createSubscription,
  cancelSubscription,
  ApiError,
  type SubscriptionStatus,
} from "@/lib/api";

const STATUS_LABEL: Record<SubscriptionStatus["subscriptionStatus"], string> = {
  NONE: "Kein Abo",
  PENDING: "Genehmigung ausstehend",
  ACTIVE: "Aktiv",
  SUSPENDED: "Pausiert",
  CANCELLED: "Gekündigt",
  EXPIRED: "Abgelaufen",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE");
}

export function PaypalSubscription({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const paypalParam = searchParams.get("paypal");

  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    getSubscriptionStatus(token)
      .then(setStatus)
      .catch((err) => setActionError(err instanceof ApiError ? err.message : "Fehler beim Laden"));
  }, [token]);

  const notice = paypalParam === "connected" ? "PayPal-Genehmigung abgeschlossen." : null;
  const redirectError =
    paypalParam === "error"
      ? "PayPal-Verbindung fehlgeschlagen. Bitte erneut versuchen."
      : paypalParam === "cancelled"
        ? "Vorgang bei PayPal abgebrochen."
        : null;

  async function handleStart() {
    setActionError(null);
    setIsStarting(true);
    try {
      const { approveUrl } = await createSubscription(token);
      window.location.href = approveUrl;
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Verbinden fehlgeschlagen");
      setIsStarting(false);
    }
  }

  async function handleCancel() {
    setActionError(null);
    setIsCancelling(true);
    try {
      await cancelSubscription(token);
      setStatus(await getSubscriptionStatus(token));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Kündigen fehlgeschlagen");
    } finally {
      setIsCancelling(false);
    }
  }

  if (!status) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded border border-black/10 p-4 dark:border-white/10">
      <span className="text-sm text-zinc-700 dark:text-zinc-300">
        PayPal-Abo: {STATUS_LABEL[status.subscriptionStatus]}
        {status.subscriptionStatus === "ACTIVE" && status.subscriptionCurrentPeriodEnd
          ? ` · verlängert sich am ${formatDate(status.subscriptionCurrentPeriodEnd)}`
          : ""}
      </span>

      {status.subscriptionStatus === "ACTIVE" ? (
        <button
          type="button"
          onClick={handleCancel}
          disabled={isCancelling}
          className="text-sm text-zinc-500 underline hover:text-red-600 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-red-400"
        >
          {isCancelling ? "Kündigt..." : "Kündigen"}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleStart}
          disabled={isStarting}
          className="rounded border border-black/15 px-3 py-1.5 text-sm font-medium text-black disabled:opacity-50 dark:border-white/15 dark:text-zinc-50"
        >
          {isStarting ? "Wird weitergeleitet..." : "Mit PayPal bezahlen"}
        </button>
      )}

      {notice && <span className="text-sm text-green-700 dark:text-green-400">{notice}</span>}
      {(actionError || redirectError) && (
        <span className="text-sm text-red-600 dark:text-red-400">
          {actionError ?? redirectError}
        </span>
      )}
    </div>
  );
}
