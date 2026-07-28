// Fest hinterlegte Übungsvorschläge je Trainings-Kategorie. Kategorie ist
// im Backend freier Text - hier nur ein paar gängige Split-Bezeichnungen
// vordefiniert. Bei unbekannter Kategorie einfach keine Vorschläge (der
// Trainer kann trotzdem jede beliebige Übung frei eintippen).
const EXERCISE_CATALOG: Record<string, string[]> = {
  push: [
    "Bankdrücken",
    "Schrägbankdrücken",
    "Schulterdrücken",
    "Dips",
    "Seitheben",
    "Trizepsdrücken",
  ],
  pull: [
    "Klimmzüge",
    "Latzug",
    "Rudern vorgebeugt",
    "Kabelrudern",
    "Bizepscurls",
    "Face Pulls",
  ],
  beine: [
    "Kniebeuge",
    "Beinpresse",
    "Ausfallschritte",
    "Beinstrecker",
    "Beinbeuger",
    "Wadenheben",
  ],
  oberkörper: [
    "Bankdrücken",
    "Klimmzüge",
    "Schulterdrücken",
    "Rudern vorgebeugt",
    "Bizepscurls",
    "Trizepsdrücken",
  ],
  unterkörper: ["Kniebeuge", "Kreuzheben", "Ausfallschritte", "Beinpresse", "Wadenheben"],
};

export function getSuggestedExercises(category: string): string[] {
  const key = category.trim().toLowerCase();
  return EXERCISE_CATALOG[key] ?? [];
}
