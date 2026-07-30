"use client";

export function SaveButton({
  isSubmitting,
  isSaved,
  idleLabel = "Speichern",
  submittingLabel = "Speichert...",
  savedLabel = "Gespeichert ✓",
}: {
  isSubmitting: boolean;
  isSaved: boolean;
  idleLabel?: string;
  submittingLabel?: string;
  savedLabel?: string;
}) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
    >
      {isSubmitting ? submittingLabel : isSaved ? savedLabel : idleLabel}
    </button>
  );
}
