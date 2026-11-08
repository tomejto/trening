// Model danych aplikacji.
// Zasada: historia (Session) odwołuje się do ćwiczeń po `exerciseId` i przechowuje
// kopię celu (serie, zakres powtórzeń) z dnia treningu. Zmiana planu nie zmienia historii.

export type BodyPart = 'upper' | 'lower';
export type ExerciseKind = 'compound' | 'isolation';

export interface ExerciseDescription {
  muscles: string;
  setup: string;
  steps: string[];
  mistakes: string[];
  tips: string[];
}

export interface Exercise {
  id: string;
  name: string;
  bodyPart: BodyPart;
  kind: ExerciseKind;
  /** Ćwiczenie jednonóż / jednorącz – powtórzenia liczone "na nogę". */
  unilateral: boolean;
  /** Krok zwiększenia ciężaru przy progresji (kg). */
  weightStep: number;
  /** Własny czas przerwy (s). Brak = domyślny wg typu ćwiczenia. */
  restSec?: number;
  description: ExerciseDescription;
  userNotes: string;
  /** Ciężar roboczy wpisany ręcznie (kg) – start kolejnego treningu, jeśli jest nowszy niż ostatni wynik. */
  workingWeight?: number;
  /** Kiedy ciężar roboczy został ustawiony (ms). */
  workingWeightAt?: number;
  archived?: boolean;
}

export interface TemplateItem {
  id: string;
  exerciseId: string;
  /** Alternatywy do wyboru na treningu (np. podciąganie ↔ ściąganie drążka). */
  altExerciseIds: string[];
  sets: number;
  repMin: number;
  repMax: number;
  /** Ćwiczenie tworzy superserię z następnym na liście. */
  supersetWithNext?: boolean;
  note?: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  subtitle?: string;
  /** Dzień tygodnia jak w JS: 0 = niedziela, 1 = poniedziałek … 6 = sobota. null = bez dnia. */
  weekday: number | null;
  order: number;
  cardio: { enabled: boolean; minutes: number };
  items: TemplateItem[];
}

export interface SetLog {
  weight: number | null;
  reps: number | null;
  done: boolean;
}

export interface SessionEntry {
  id: string;
  exerciseId: string;
  altExerciseIds: string[];
  /** Kopia celu z planu w dniu treningu. */
  sets: number;
  repMin: number;
  repMax: number;
  supersetWithNext?: boolean;
  note?: string;
  setLogs: SetLog[];
}

export interface SessionCardio {
  planned: boolean;
  done: boolean;
  minutes?: number;
  type?: string;
}

export type SessionStatus = 'in_progress' | 'done';

export interface Session {
  id: string;
  /** Data lokalna YYYY-MM-DD. */
  date: string;
  startedAt: number;
  finishedAt?: number;
  templateId: string | null;
  /** Kopia nazwy treningu – zostaje nawet po usunięciu treningu z planu. */
  templateName: string;
  isDeload: boolean;
  note: string;
  cardio: SessionCardio;
  status: SessionStatus;
  entries: SessionEntry[];
  /** Szybki zapis: tylko ciężar każdego ćwiczenia, bez powtórzeń (serie mają reps = null). */
  quick?: boolean;
}

export interface BodyWeight {
  id: string;
  date: string;
  kg: number;
}

export interface Settings {
  id: 'settings';
  restCompoundSec: number;
  restIsolationSec: number;
  sound: boolean;
  vibration: boolean;
  /** Co ile tygodni treningowych przypominać o lżejszym tygodniu. */
  deloadEveryWeeks: number;
  /** Ile serii mniej w lżejszym tygodniu (min. 1 seria zostaje). */
  deloadSetDelta: number;
  /** Ciężar w lżejszym tygodniu jako % zwykłego. */
  deloadWeightPct: number;
  /** Poniedziałek tygodnia ostatniego lżejszego tygodnia (YYYY-MM-DD). */
  lastDeloadWeekStart?: string;
  /** Poniedziałek tygodnia, w którym odłożono przypomnienie. */
  deloadDismissedWeek?: string;
  /** Znacznik czasu ostatniego eksportu kopii zapasowej. */
  lastBackupAt?: number;
  seedVersion: number;
}
