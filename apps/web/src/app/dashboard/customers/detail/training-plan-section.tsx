"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  getOrCreateTrainingPlan,
  addTrainingDay,
  removeTrainingDay,
  renameTrainingDay,
  reorderTrainingDays,
  addTrainingSection,
  removeTrainingSection,
  updateTrainingSection,
  reorderTrainingSections,
  addTrainingExercise,
  updateTrainingExercise,
  removeTrainingExercise,
  reorderTrainingExercises,
  listExerciseLogs,
  ApiError,
  type TrainingPlan,
  type TrainingDay,
  type TrainingSection,
  type TrainingExercise,
  type ExerciseLog,
} from "@/lib/api";
import { getSuggestedExercises } from "@/lib/exercise-catalog";
import { SortableList, type DragHandleProps } from "@/components/sortable-list";
import { TrainingPlanImportReview } from "./training-plan-import-review";

function DragHandle({ dragHandle }: { dragHandle: DragHandleProps }) {
  return (
    <button
      type="button"
      {...dragHandle.attributes}
      {...dragHandle.listeners}
      className="cursor-grab touch-none px-1 text-zinc-400 active:cursor-grabbing"
      title="Ziehen zum Umsortieren"
    >
      ⠿
    </button>
  );
}

function InlineEditableText({
  value,
  onSave,
}: {
  value: string;
  onSave: (newValue: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const settledRef = useRef(false);

  function commit(shouldSave: boolean) {
    if (settledRef.current) return;
    settledRef.current = true;
    setIsEditing(false);
    const trimmed = draft.trim();
    if (shouldSave && trimmed && trimmed !== value) onSave(trimmed);
  }

  if (isEditing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          commit(true);
        }}
        className="inline-flex"
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") commit(false);
          }}
          className="rounded border border-black/20 bg-transparent px-2 py-0.5 text-sm dark:border-white/20"
        />
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        settledRef.current = false;
        setIsEditing(true);
      }}
      className="text-xs text-zinc-500 underline dark:text-zinc-400"
      title="Umbenennen"
    >
      umbenennen
    </button>
  );
}

export function TrainingPlanSection({
  token,
  customerId,
}: {
  token: string;
  customerId: string;
}) {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [newDayName, setNewDayName] = useState("");

  const refresh = useCallback(async () => {
    const [planResult, logsResult] = await Promise.all([
      getOrCreateTrainingPlan(token, customerId),
      listExerciseLogs(token, customerId),
    ]);
    setPlan(planResult);
    setLogs(logsResult);
  }, [token, customerId]);

  // Initiales Laden bewusst nicht über refresh(), sondern direkt als
  // Promise-Kette im Effekt - vermeidet die react-hooks/set-state-in-effect
  // Warnung für den (hier unschädlichen) Aufruf einer Funktion, die selbst
  // setState ausführt.
  useEffect(() => {
    Promise.all([getOrCreateTrainingPlan(token, customerId), listExerciseLogs(token, customerId)])
      .then(([planResult, logsResult]) => {
        setPlan(planResult);
        setLogs(logsResult);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Fehler beim Laden"));
  }, [token, customerId]);

  async function runAction(action: () => Promise<void>) {
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Aktion fehlgeschlagen");
    }
  }

  const lastByExercise = useMemo(() => {
    const map = new Map<string, ExerciseLog>();
    for (const log of logs) {
      const existing = map.get(log.exerciseName);
      if (!existing || new Date(log.performedAt) > new Date(existing.performedAt)) {
        map.set(log.exerciseName, log);
      }
    }
    return map;
  }, [logs]);

  function toggleDay(dayId: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  }

  async function handleAddDay(e: FormEvent) {
    e.preventDefault();
    if (!plan || !newDayName.trim()) return;
    await runAction(async () => {
      await addTrainingDay(token, plan.id, newDayName.trim());
      setNewDayName("");
      await refresh();
    });
  }

  if (error) {
    return (
      <div className="mb-6 rounded-lg border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mb-6 rounded-lg border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Trainingsplan</h2>
        <TrainingPlanImportReview
          token={token}
          customerId={customerId}
          hasExistingPlan={plan.days.length > 0}
          onImported={refresh}
        />
      </div>

      {plan.days.length === 0 && (
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Noch keine Trainingstage angelegt.
        </p>
      )}

      <div className="mb-4 flex flex-col gap-2">
        <SortableList
          items={plan.days}
          onReorder={(ids) =>
            runAction(async () => {
              await reorderTrainingDays(token, plan.id, ids);
              await refresh();
            })
          }
          renderItem={(day, dragHandle) => (
            <DayBlock
              token={token}
              day={day}
              isExpanded={expandedDays.has(day.id)}
              onToggle={() => toggleDay(day.id)}
              onChanged={refresh}
              runAction={runAction}
              dragHandle={dragHandle}
              lastByExercise={lastByExercise}
            />
          )}
        />
      </div>

      <form onSubmit={handleAddDay} className="flex gap-2">
        <input
          type="text"
          value={newDayName}
          onChange={(e) => setNewDayName(e.target.value)}
          placeholder="z.B. Tag 1"
          className="flex-1 rounded border border-black/15 bg-transparent px-3 py-2 text-sm text-black dark:border-white/15 dark:text-zinc-50"
        />
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          + Trainingstag
        </button>
      </form>
    </div>
  );
}

function DayBlock({
  token,
  day,
  isExpanded,
  onToggle,
  onChanged,
  dragHandle,
  lastByExercise,
  runAction,
}: {
  token: string;
  day: TrainingDay;
  isExpanded: boolean;
  onToggle: () => void;
  onChanged: () => Promise<void>;
  dragHandle: DragHandleProps;
  lastByExercise: Map<string, ExerciseLog>;
  runAction: (action: () => Promise<void>) => Promise<void>;
}) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [newCategory, setNewCategory] = useState("");

  function toggleSection(sectionId: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  async function handleAddSection(e: FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await runAction(async () => {
      await addTrainingSection(token, day.id, newCategory.trim());
      setNewCategory("");
      await onChanged();
    });
  }

  return (
    <div className="rounded border border-black/10 dark:border-white/10">
      <div className="flex items-center gap-2 px-3 py-2">
        <DragHandle dragHandle={dragHandle} />
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left font-medium text-black dark:text-zinc-50"
        >
          <span className="text-xs">{isExpanded ? "▼" : "▶"}</span>
          {day.name}
        </button>
        <InlineEditableText
          value={day.name}
          onSave={(name) =>
            runAction(async () => {
              await renameTrainingDay(token, day.id, name);
              await onChanged();
            })
          }
        />
        <button
          type="button"
          onClick={() => {
            if (
              !confirm(
                `Tag "${day.name}" mit allen Abschnitten und Übungen wirklich löschen?`,
              )
            ) {
              return;
            }
            runAction(async () => {
              await removeTrainingDay(token, day.id);
              await onChanged();
            });
          }}
          className="text-xs text-zinc-500 underline hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
        >
          löschen
        </button>
      </div>

      {isExpanded && (
        <div className="flex flex-col gap-2 border-t border-black/10 p-3 pl-8 dark:border-white/10">
          <SortableList
            items={day.sections}
            onReorder={(ids) =>
              runAction(async () => {
                await reorderTrainingSections(token, day.id, ids);
                await onChanged();
              })
            }
            renderItem={(section, sectionDragHandle) => (
              <SectionBlock
                token={token}
                section={section}
                isExpanded={expandedSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
                onChanged={onChanged}
                runAction={runAction}
                dragHandle={sectionDragHandle}
                lastByExercise={lastByExercise}
              />
            )}
          />

          <form onSubmit={handleAddSection} className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="z.B. Push"
              className="flex-1 rounded border border-black/15 bg-transparent px-3 py-1.5 text-sm text-black dark:border-white/15 dark:text-zinc-50"
            />
            <button
              type="submit"
              className="rounded border border-black/15 px-3 py-1.5 text-sm font-medium text-black dark:border-white/15 dark:text-zinc-50"
            >
              + Abschnitt
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function SectionBlock({
  token,
  section,
  isExpanded,
  onToggle,
  onChanged,
  dragHandle,
  lastByExercise,
  runAction,
}: {
  token: string;
  section: TrainingSection;
  isExpanded: boolean;
  onToggle: () => void;
  onChanged: () => Promise<void>;
  dragHandle: DragHandleProps;
  lastByExercise: Map<string, ExerciseLog>;
  runAction: (action: () => Promise<void>) => Promise<void>;
}) {
  const suggestions = useMemo(
    () =>
      getSuggestedExercises(section.category).filter(
        (name) => !section.exercises.some((ex) => ex.name === name),
      ),
    [section.category, section.exercises],
  );

  function handleAddExercise(name: string) {
    return runAction(async () => {
      const last = lastByExercise.get(name);
      await addTrainingExercise(token, {
        sectionId: section.id,
        name,
        weight: last?.weight ? Number(last.weight) : undefined,
        reps: last?.reps ?? undefined,
        sets: last?.sets ?? undefined,
      });
      await onChanged();
    });
  }

  return (
    <div className="rounded border border-black/10 dark:border-white/10">
      <div className="flex items-center gap-2 px-3 py-2">
        <DragHandle dragHandle={dragHandle} />
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left font-medium text-black dark:text-zinc-50"
        >
          <span className="text-xs">{isExpanded ? "▼" : "▶"}</span>
          {section.category}
        </button>
        <InlineEditableText
          value={section.category}
          onSave={(category) =>
            runAction(async () => {
              await updateTrainingSection(token, section.id, category);
              await onChanged();
            })
          }
        />
        <button
          type="button"
          onClick={() => {
            if (
              !confirm(
                `Abschnitt "${section.category}" mit allen Übungen wirklich löschen?`,
              )
            ) {
              return;
            }
            runAction(async () => {
              await removeTrainingSection(token, section.id);
              await onChanged();
            });
          }}
          className="text-xs text-zinc-500 underline hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
        >
          löschen
        </button>
      </div>

      {isExpanded && (
        <div className="flex flex-col gap-3 border-t border-black/10 p-3 dark:border-white/10">
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleAddExercise(name)}
                  className="rounded-full border border-black/15 px-3 py-1 text-xs text-zinc-700 hover:bg-black/[.03] dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/[.05]"
                >
                  + {name}
                </button>
              ))}
            </div>
          )}

          <SortableList
            items={section.exercises}
            onReorder={(ids) =>
              runAction(async () => {
                await reorderTrainingExercises(token, section.id, ids);
                await onChanged();
              })
            }
            renderItem={(exercise, exerciseDragHandle) => (
              <ExerciseRow
                token={token}
                exercise={exercise}
                onChanged={onChanged}
                runAction={runAction}
                dragHandle={exerciseDragHandle}
              />
            )}
          />

          <AddExerciseForm sectionCategory={section.category} onAdd={handleAddExercise} />
        </div>
      )}
    </div>
  );
}

function AddExerciseForm({
  sectionCategory,
  onAdd,
}: {
  sectionCategory: string;
  onAdd: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const listId = `exercise-suggestions-${sectionCategory}`;
  const suggestions = useMemo(() => getSuggestedExercises(sectionCategory), [sectionCategory]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await onAdd(name.trim());
    setName("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        list={listId}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Eigene Übung hinzufügen..."
        className="flex-1 rounded border border-black/15 bg-transparent px-3 py-1.5 text-sm text-black dark:border-white/15 dark:text-zinc-50"
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <button
        type="submit"
        className="rounded border border-black/15 px-3 py-1.5 text-sm font-medium text-black dark:border-white/15 dark:text-zinc-50"
      >
        + Übung
      </button>
    </form>
  );
}

function ExerciseRow({
  token,
  exercise,
  onChanged,
  runAction,
  dragHandle,
}: {
  token: string;
  exercise: TrainingExercise;
  onChanged: () => Promise<void>;
  runAction: (action: () => Promise<void>) => Promise<void>;
  dragHandle: DragHandleProps;
}) {
  const [sets, setSets] = useState(exercise.sets?.toString() ?? "");
  const [reps, setReps] = useState(exercise.reps?.toString() ?? "");
  const [weight, setWeight] = useState(exercise.weight ?? "");
  const [restSeconds, setRestSeconds] = useState(exercise.restSeconds?.toString() ?? "");
  const [notes, setNotes] = useState(exercise.notes ?? "");

  function persist(
    fields: Partial<Record<"sets" | "reps" | "weight" | "restSeconds" | "notes", string>>,
  ) {
    return runAction(async () => {
      await updateTrainingExercise(token, exercise.id, {
        name: exercise.name,
        sets: (fields.sets ?? sets) ? Number(fields.sets ?? sets) : undefined,
        reps: (fields.reps ?? reps) ? Number(fields.reps ?? reps) : undefined,
        weight: (fields.weight ?? weight) ? Number(fields.weight ?? weight) : undefined,
        restSeconds: (fields.restSeconds ?? restSeconds)
          ? Number(fields.restSeconds ?? restSeconds)
          : undefined,
        notes: (fields.notes ?? notes) || undefined,
      });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-black/10 px-3 py-2 dark:border-white/10">
      <DragHandle dragHandle={dragHandle} />
      <span className="min-w-[8rem] flex-1 font-medium text-black dark:text-zinc-50">
        {exercise.name}
      </span>

      <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        Sätze
        <input
          type="number"
          min="0"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          onBlur={() => persist({ sets })}
          className="w-14 rounded border border-black/15 bg-transparent px-2 py-1 text-black dark:border-white/15 dark:text-zinc-50"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        Wdh.
        <input
          type="number"
          min="0"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onBlur={() => persist({ reps })}
          className="w-14 rounded border border-black/15 bg-transparent px-2 py-1 text-black dark:border-white/15 dark:text-zinc-50"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        kg
        <input
          type="number"
          min="0"
          step="0.5"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={() => persist({ weight })}
          className="w-16 rounded border border-black/15 bg-transparent px-2 py-1 text-black dark:border-white/15 dark:text-zinc-50"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        Pause (s)
        <input
          type="number"
          min="0"
          value={restSeconds}
          onChange={(e) => setRestSeconds(e.target.value)}
          onBlur={() => persist({ restSeconds })}
          className="w-16 rounded border border-black/15 bg-transparent px-2 py-1 text-black dark:border-white/15 dark:text-zinc-50"
        />
      </label>
      <label className="flex flex-1 items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        Notiz
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => persist({ notes })}
          className="flex-1 rounded border border-black/15 bg-transparent px-2 py-1 text-black dark:border-white/15 dark:text-zinc-50"
        />
      </label>

      <button
        type="button"
        onClick={() => {
          if (!confirm(`Übung "${exercise.name}" wirklich löschen?`)) return;
          runAction(async () => {
            await removeTrainingExercise(token, exercise.id);
            await onChanged();
          });
        }}
        className="text-xs text-zinc-500 underline hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
      >
        löschen
      </button>
    </div>
  );
}
