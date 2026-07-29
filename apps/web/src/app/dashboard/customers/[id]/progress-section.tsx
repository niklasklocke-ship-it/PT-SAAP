"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  listExerciseLogs,
  createExerciseLog,
  deleteExerciseLog,
  ApiError,
  type ExerciseLog,
} from "@/lib/api";

const UNCATEGORIZED = "Ohne Kategorie";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE");
}

export function ProgressSection({
  token,
  customerId,
}: {
  token: string;
  customerId: string;
}) {
  const [logs, setLogs] = useState<ExerciseLog[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [category, setCategory] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [weight, setWeight] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [performedAt, setPerformedAt] = useState(todayIsoDate);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    listExerciseLogs(token, customerId)
      .then(setLogs)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Fehler beim Laden"),
      );
  }, [token, customerId]);

  const categoryNames = useMemo(() => {
    if (!logs) return [];
    return Array.from(new Set(logs.map((log) => log.category).filter(Boolean))) as string[];
  }, [logs]);

  // Ohne eingegebene Kategorie werden alle bisherigen Übungen vorgeschlagen,
  // mit Kategorie nur die, die bisher unter dieser Kategorie geloggt wurden.
  const suggestedExerciseNames = useMemo(() => {
    if (!logs) return [];
    const trimmed = category.trim().toLowerCase();
    const relevant = trimmed
      ? logs.filter((log) => log.category?.trim().toLowerCase() === trimmed)
      : logs;
    return Array.from(new Set(relevant.map((log) => log.exerciseName)));
  }, [logs, category]);

  const groupedByCategory = useMemo(() => {
    if (!logs) return [];
    const categoryGroups = new Map<string, Map<string, ExerciseLog[]>>();
    for (const log of logs) {
      const categoryKey = log.category?.trim() || UNCATEGORIZED;
      let exerciseGroups = categoryGroups.get(categoryKey);
      if (!exerciseGroups) {
        exerciseGroups = new Map();
        categoryGroups.set(categoryKey, exerciseGroups);
      }
      const entries = exerciseGroups.get(log.exerciseName);
      if (entries) {
        entries.push(log);
      } else {
        exerciseGroups.set(log.exerciseName, [log]);
      }
    }
    return Array.from(categoryGroups.entries());
  }, [logs]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await createExerciseLog(token, {
        customerId,
        category: category || undefined,
        exerciseName,
        weight: weight ? Number(weight) : undefined,
        sets: sets ? Number(sets) : undefined,
        reps: reps ? Number(reps) : undefined,
        performedAt,
      });
      // Neu laden statt lokal anhängen, damit die Reihenfolge
      // (nach Übung + Datum sortiert, siehe Backend) korrekt bleibt.
      setLogs(await listExerciseLogs(token, customerId));
      setWeight("");
      setSets("");
      setReps("");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteExerciseLog(token, id);
      setLogs((prev) => (prev ? prev.filter((log) => log.id !== id) : prev));
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Löschen fehlgeschlagen");
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
      <h2 className="mb-4 text-lg font-semibold text-black dark:text-zinc-50">
        Fortschritt
      </h2>

      <form onSubmit={handleSubmit} className="mb-6 grid gap-3 sm:grid-cols-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Kategorie
          </label>
          <input
            type="text"
            list="category-names"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="z.B. Push"
            className="w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
          />
          <datalist id="category-names">
            {categoryNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Übung
          </label>
          <input
            type="text"
            list="exercise-names"
            required
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            placeholder="z.B. Bankdrücken"
            className="w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
          />
          <datalist id="exercise-names">
            {suggestedExerciseNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Gewicht (kg)
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Sätze
          </label>
          <input
            type="number"
            min="0"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            className="w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Wdh.
          </label>
          <input
            type="number"
            min="0"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Datum
          </label>
          <input
            type="date"
            required
            value={performedAt}
            onChange={(e) => setPerformedAt(e.target.value)}
            className="w-full rounded border border-black/15 bg-transparent px-3 py-2 text-black dark:border-white/15 dark:text-zinc-50"
          />
        </div>
        <div className="flex items-end sm:col-span-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {isSubmitting ? "Speichert..." : "Eintrag hinzufügen"}
          </button>
        </div>
      </form>

      {formError && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{formError}</p>
      )}
      {loadError && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{loadError}</p>
      )}

      {!logs && !loadError && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
      )}

      {logs && groupedByCategory.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Noch keine Einträge erfasst.
        </p>
      )}

      <div className="flex flex-col gap-8">
        {groupedByCategory.map(([categoryName, exerciseGroups]) => (
          <div key={categoryName}>
            <h3 className="mb-3 text-base font-semibold text-black dark:text-zinc-50">
              {categoryName}
            </h3>
            <div className="flex flex-col gap-4 border-l-2 border-black/10 pl-4 dark:border-white/10">
              {Array.from(exerciseGroups.entries()).map(([name, entries]) => (
                <div key={name}>
                  <h4 className="mb-2 font-medium text-black dark:text-zinc-50">
                    {name}
                  </h4>
                  <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-black/10 text-zinc-600 dark:border-white/10 dark:text-zinc-400">
                        <tr>
                          <th className="px-3 py-2 font-medium">Datum</th>
                          <th className="px-3 py-2 font-medium">Gewicht</th>
                          <th className="px-3 py-2 font-medium">Sätze</th>
                          <th className="px-3 py-2 font-medium">Wdh.</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry) => (
                          <tr
                            key={entry.id}
                            className="border-b border-black/5 last:border-0 dark:border-white/5"
                          >
                            <td className="px-3 py-2 text-black dark:text-zinc-50">
                              {formatDate(entry.performedAt)}
                            </td>
                            <td className="px-3 py-2 text-black dark:text-zinc-50">
                              {entry.weight ? `${entry.weight} kg` : "–"}
                            </td>
                            <td className="px-3 py-2 text-black dark:text-zinc-50">
                              {entry.sets ?? "–"}
                            </td>
                            <td className="px-3 py-2 text-black dark:text-zinc-50">
                              {entry.reps ?? "–"}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Eintrag vom ${formatDate(entry.performedAt)} wirklich löschen?`,
                                    )
                                  ) {
                                    handleDelete(entry.id);
                                  }
                                }}
                                className="text-xs text-zinc-500 underline hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                              >
                                löschen
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
