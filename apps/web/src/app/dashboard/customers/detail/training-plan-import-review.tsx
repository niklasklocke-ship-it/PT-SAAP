"use client";

import { useRef, useState } from "react";
import {
  uploadTrainingPlanFile,
  commitImportedTrainingPlan,
  ApiError,
  type ParsedTrainingPlan,
  type ParsedTrainingDay,
  type ParsedTrainingSection,
  type ParsedTrainingExercise,
} from "@/lib/api";
import { getSuggestedExercises } from "@/lib/exercise-catalog";

type Phase = "closed" | "uploading" | "review" | "submitting";

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function TrainingPlanImportReview({
  token,
  customerId,
  hasExistingPlan,
  onImported,
}: {
  token: string;
  customerId: string;
  hasExistingPlan: boolean;
  onImported: () => Promise<void>;
}) {
  const [phase, setPhase] = useState<Phase>("closed");
  const [draft, setDraft] = useState<ParsedTrainingPlan | null>(null);
  const [mode, setMode] = useState<"REPLACE" | "APPEND" | null>(hasExistingPlan ? null : "APPEND");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setPhase("closed");
    setDraft(null);
    setMode(hasExistingPlan ? null : "APPEND");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileSelected(file: File) {
    setError(null);
    setPhase("uploading");
    try {
      const parsed = await uploadTrainingPlanFile(token, customerId, file);
      setDraft(parsed);
      setPhase("review");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload fehlgeschlagen");
      setPhase("closed");
    }
  }

  function updateDay(dayIndex: number, updater: (day: ParsedTrainingDay) => ParsedTrainingDay) {
    setDraft((prev) => {
      if (!prev) return prev;
      const days = prev.days.map((d, i) => (i === dayIndex ? updater(d) : d));
      return { days };
    });
  }

  function updateSection(
    dayIndex: number,
    sectionIndex: number,
    updater: (section: ParsedTrainingSection) => ParsedTrainingSection,
  ) {
    updateDay(dayIndex, (day) => ({
      ...day,
      sections: day.sections.map((s, i) => (i === sectionIndex ? updater(s) : s)),
    }));
  }

  function updateExercise(
    dayIndex: number,
    sectionIndex: number,
    exerciseIndex: number,
    updater: (exercise: ParsedTrainingExercise) => ParsedTrainingExercise,
  ) {
    updateSection(dayIndex, sectionIndex, (section) => ({
      ...section,
      exercises: section.exercises.map((e, i) => (i === exerciseIndex ? updater(e) : e)),
    }));
  }

  function removeDay(dayIndex: number) {
    setDraft((prev) => (prev ? { days: prev.days.filter((_, i) => i !== dayIndex) } : prev));
  }

  function removeSection(dayIndex: number, sectionIndex: number) {
    updateDay(dayIndex, (day) => ({
      ...day,
      sections: day.sections.filter((_, i) => i !== sectionIndex),
    }));
  }

  function removeExercise(dayIndex: number, sectionIndex: number, exerciseIndex: number) {
    updateSection(dayIndex, sectionIndex, (section) => ({
      ...section,
      exercises: section.exercises.filter((_, i) => i !== exerciseIndex),
    }));
  }

  function addSuggestedExercise(dayIndex: number, sectionIndex: number, name: string) {
    updateSection(dayIndex, sectionIndex, (section) => ({
      ...section,
      exercises: [
        ...section.exercises,
        { name, sets: null, reps: null, weight: null, restSeconds: null, notes: null },
      ],
    }));
  }

  async function handleCommit() {
    if (!draft || !mode) return;
    setError(null);
    setPhase("submitting");
    try {
      await commitImportedTrainingPlan(token, customerId, { ...draft, mode });
      await onImported();
      reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Übernehmen fehlgeschlagen");
      setPhase("review");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="rounded border border-black/15 px-4 py-2 text-sm font-medium text-black dark:border-white/15 dark:text-zinc-50"
      >
        Plan hochladen (PDF)
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFileSelected(file);
        }}
      />

      {error && phase === "closed" && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {phase === "uploading" && (
        <ModalShell onClose={reset} title="Plan wird analysiert...">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Die PDF wird gelesen und der Trainingsplan erkannt. Das kann einen Moment dauern.
          </p>
        </ModalShell>
      )}

      {(phase === "review" || phase === "submitting") && draft && (
        <ModalShell onClose={reset} title="Erkannten Trainingsplan prüfen">
          {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

          {hasExistingPlan && (
            <div className="mb-4 rounded border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                Dieser Kunde hat bereits einen Trainingsplan. Was soll passieren?
              </p>
              <label className="mb-1 flex items-center gap-2 text-sm text-black dark:text-zinc-50">
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === "REPLACE"}
                  onChange={() => setMode("REPLACE")}
                />
                Bestehenden Plan ersetzen
              </label>
              <label className="flex items-center gap-2 text-sm text-black dark:text-zinc-50">
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === "APPEND"}
                  onChange={() => setMode("APPEND")}
                />
                Neue Tage anhängen
              </label>
              {mode === "REPLACE" && (
                <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                  Achtung: der bestehende Plan wird dabei unwiderruflich überschrieben.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {draft.days.map((day, dayIndex) => (
              <div key={dayIndex} className="rounded border border-black/10 p-3 dark:border-white/10">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={day.name}
                    onChange={(e) =>
                      updateDay(dayIndex, (d) => ({ ...d, name: e.target.value }))
                    }
                    className="flex-1 rounded border border-black/15 bg-transparent px-2 py-1 text-sm font-medium text-black dark:border-white/15 dark:text-zinc-50"
                  />
                  <button
                    type="button"
                    onClick={() => removeDay(dayIndex)}
                    className="text-xs text-zinc-500 underline hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                  >
                    Tag löschen
                  </button>
                </div>

                <div className="flex flex-col gap-3 pl-3">
                  {day.sections.map((section, sectionIndex) => {
                    const suggestions = getSuggestedExercises(section.category).filter(
                      (name) => !section.exercises.some((ex) => ex.name === name),
                    );
                    return (
                      <div
                        key={sectionIndex}
                        className="rounded border border-black/10 p-2 dark:border-white/10"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <input
                            type="text"
                            value={section.category}
                            onChange={(e) =>
                              updateSection(dayIndex, sectionIndex, (s) => ({
                                ...s,
                                category: e.target.value,
                              }))
                            }
                            className="flex-1 rounded border border-black/15 bg-transparent px-2 py-1 text-sm text-black dark:border-white/15 dark:text-zinc-50"
                          />
                          <button
                            type="button"
                            onClick={() => removeSection(dayIndex, sectionIndex)}
                            className="text-xs text-zinc-500 underline hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                          >
                            Abschnitt löschen
                          </button>
                        </div>

                        <div className="flex flex-col gap-2">
                          {section.exercises.map((exercise, exerciseIndex) => (
                            <div
                              key={exerciseIndex}
                              className="flex flex-wrap items-center gap-2 rounded border border-black/10 px-2 py-1.5 dark:border-white/10"
                            >
                              <input
                                type="text"
                                value={exercise.name}
                                onChange={(e) =>
                                  updateExercise(dayIndex, sectionIndex, exerciseIndex, (ex) => ({
                                    ...ex,
                                    name: e.target.value,
                                  }))
                                }
                                className="min-w-[8rem] flex-1 rounded border border-black/15 bg-transparent px-2 py-1 text-sm text-black dark:border-white/15 dark:text-zinc-50"
                              />
                              <NumberField
                                label="Sätze"
                                value={exercise.sets}
                                onChange={(v) =>
                                  updateExercise(dayIndex, sectionIndex, exerciseIndex, (ex) => ({
                                    ...ex,
                                    sets: v,
                                  }))
                                }
                              />
                              <NumberField
                                label="Wdh."
                                value={exercise.reps}
                                onChange={(v) =>
                                  updateExercise(dayIndex, sectionIndex, exerciseIndex, (ex) => ({
                                    ...ex,
                                    reps: v,
                                  }))
                                }
                              />
                              <NumberField
                                label="kg"
                                value={exercise.weight}
                                onChange={(v) =>
                                  updateExercise(dayIndex, sectionIndex, exerciseIndex, (ex) => ({
                                    ...ex,
                                    weight: v,
                                  }))
                                }
                              />
                              <button
                                type="button"
                                onClick={() => removeExercise(dayIndex, sectionIndex, exerciseIndex)}
                                className="text-xs text-zinc-500 underline hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                              >
                                löschen
                              </button>
                            </div>
                          ))}
                        </div>

                        {suggestions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {suggestions.map((name) => (
                              <button
                                key={name}
                                type="button"
                                onClick={() => addSuggestedExercise(dayIndex, sectionIndex, name)}
                                className="rounded-full border border-black/15 px-3 py-1 text-xs text-zinc-700 hover:bg-black/[.03] dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/[.05]"
                              >
                                + {name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded border border-black/15 px-4 py-2 text-sm font-medium text-black dark:border-white/15 dark:text-zinc-50"
            >
              Abbrechen
            </button>
            <button
              type="button"
              disabled={phase === "submitting" || !mode || draft.days.length === 0}
              onClick={handleCommit}
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {phase === "submitting" ? "Wird übernommen..." : "Übernehmen"}
            </button>
          </div>
        </ModalShell>
      )}
    </>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
      {label}
      <input
        type="number"
        min="0"
        value={value ?? ""}
        onChange={(e) => onChange(numberOrNull(e.target.value))}
        className="w-14 rounded border border-black/15 bg-transparent px-2 py-1 text-black dark:border-white/15 dark:text-zinc-50"
      />
    </label>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-black dark:text-zinc-50">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
