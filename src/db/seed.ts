import type { BodyPart, Exercise, ExerciseKind, Settings, TemplateItem, WorkoutTemplate } from './types';
import { DESCRIPTIONS } from './descriptions';

export const SEED_VERSION = 3;

/** v3: ćwiczenia, które nie pasowały, zamienione w planie na nowe (stare zostają w historii). */
export const REPLACED_IN_V3: Record<string, string> = {
  'bulgarian-split-squat': 'leg-press',
  'back-extension': 'hip-thrust',
};

export const emptyDescription = () => ({ muscles: '', setup: '', steps: [], mistakes: [], tips: [] });

function ex(
  id: string,
  name: string,
  bodyPart: BodyPart,
  kind: ExerciseKind,
  opts: { unilateral?: boolean; weightStep?: number; archived?: boolean } = {},
): Exercise {
  return {
    ...(opts.archived ? { archived: true } : {}),
    id,
    name,
    bodyPart,
    kind,
    unilateral: opts.unilateral ?? false,
    // Domyślnie: +2,5 kg góra, +5 kg nogi. Wyjątki (hantle przy nogach) ustawione niżej.
    weightStep: opts.weightStep ?? (bodyPart === 'upper' ? 2.5 : 5),
    description: DESCRIPTIONS[id] ?? emptyDescription(),
    userNotes: '',
  };
}

// Stałe identyfikatory – historia odwołuje się do nich, więc nie należy ich zmieniać.
export const SEED_EXERCISES: Exercise[] = [
  // Góra
  ex('hammer-chest-press', 'Wyciskanie na Hammerze', 'upper', 'compound'),
  ex('machine-row-neutral', 'Wiosłowanie na maszynie – chwyt neutralny', 'upper', 'compound'),
  ex('db-shoulder-press', 'Wyciskanie hantli nad głowę', 'upper', 'compound'),
  ex('pull-up', 'Podciąganie na drążku', 'upper', 'compound'),
  ex('lat-pulldown', 'Ściąganie drążka wyciągu górnego', 'upper', 'compound'),
  ex('db-curl', 'Uginanie ramion z hantlami', 'upper', 'isolation'),
  ex('triceps-pushdown-bar', 'Prostowanie ramion na wyciągu (drążek)', 'upper', 'isolation'),
  ex('incline-machine-press', 'Wyciskanie na maszynie na skosie', 'upper', 'compound'),
  ex('machine-row-wide', 'Wiosłowanie na maszynie – nachwyt szeroki', 'upper', 'compound'),
  ex('cable-fly', 'Rozpiętki na wyciągu', 'upper', 'isolation'),
  ex('reverse-fly', 'Odwrócony butterfly', 'upper', 'isolation'),
  ex('db-lateral-raise', 'Unoszenie hantli bokiem', 'upper', 'isolation'),
  ex('triceps-pushdown-rope', 'Prostowanie ramion na wyciągu (lina)', 'upper', 'isolation'),
  // Dół
  ex('leg-press', 'Suwnica (wypychanie nóg)', 'lower', 'compound'),
  ex('hip-thrust', 'Hip thrust', 'lower', 'compound'),
  // Zastąpione w v3 (nie pasowały) – zostają w bazie dla historii, ukryte w wyborze ćwiczeń.
  ex('bulgarian-split-squat', 'Przysiad bułgarski z hantlami', 'lower', 'compound', { unilateral: true, weightStep: 2.5, archived: true }),
  ex('walking-lunge', 'Wykroki chodzone z hantlami', 'lower', 'compound', { unilateral: true, weightStep: 2.5 }),
  ex('seated-leg-curl', 'Uginanie nóg siedząc', 'lower', 'isolation'),
  ex('leg-extension', 'Prostowanie nóg na maszynie', 'lower', 'isolation'),
  ex('back-extension', 'Ławka rzymska z obciążeniem', 'lower', 'isolation', { archived: true }),
  ex('hip-adduction', 'Przywodzenie na maszynie', 'lower', 'isolation'),
  ex('hip-abduction', 'Odwodzenie na maszynie', 'lower', 'isolation'),
  ex('standing-calf-raise', 'Wspięcia na palce stojąc', 'lower', 'isolation'),
  ex('seated-calf-raise', 'Wspięcia na palce siedząc', 'lower', 'isolation'),
];

function item(
  id: string,
  exerciseId: string,
  sets: number,
  repMin: number,
  repMax: number,
  opts: Partial<TemplateItem> = {},
): TemplateItem {
  return { id, exerciseId, altExerciseIds: [], sets, repMin, repMax, ...opts };
}

export const SEED_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'upper-a',
    name: 'Góra A',
    subtitle: 'siłowo',
    weekday: 1,
    order: 0,
    cardio: { enabled: true, minutes: 20 },
    items: [
      item('ua-1', 'hammer-chest-press', 3, 6, 8),
      item('ua-2', 'machine-row-neutral', 3, 6, 8),
      item('ua-3', 'db-shoulder-press', 3, 8, 10),
      item('ua-4', 'pull-up', 3, 8, 10, { altExerciseIds: ['lat-pulldown'] }),
      item('ua-5', 'db-curl', 3, 10, 12, { note: 'Opcjonalnie w superserii z prostowaniem na wyciągu' }),
      item('ua-6', 'triceps-pushdown-bar', 3, 10, 12),
    ],
  },
  {
    id: 'lower-a',
    name: 'Dół A',
    subtitle: 'siłowo',
    weekday: 2,
    order: 1,
    cardio: { enabled: false, minutes: 20 },
    items: [
      item('la-1', 'leg-press', 3, 8, 10),
      item('la-2', 'seated-leg-curl', 3, 8, 10),
      item('la-3', 'leg-extension', 3, 10, 12),
      item('la-4', 'hip-thrust', 3, 8, 10),
      item('la-5', 'hip-adduction', 3, 12, 15),
      item('la-6', 'standing-calf-raise', 3, 12, 15),
    ],
  },
  {
    id: 'upper-b',
    name: 'Góra B',
    subtitle: 'objętościowo',
    weekday: 4,
    order: 2,
    cardio: { enabled: true, minutes: 20 },
    items: [
      item('ub-1', 'incline-machine-press', 3, 8, 12),
      item('ub-2', 'machine-row-wide', 3, 10, 12),
      item('ub-3', 'cable-fly', 3, 12, 15, { supersetWithNext: true }),
      item('ub-4', 'reverse-fly', 3, 12, 15),
      item('ub-5', 'db-lateral-raise', 3, 12, 15),
      item('ub-6', 'db-curl', 3, 10, 12),
      item('ub-7', 'triceps-pushdown-rope', 3, 10, 12),
    ],
  },
  {
    id: 'lower-b',
    name: 'Dół B',
    subtitle: 'objętościowo',
    weekday: 5,
    order: 3,
    cardio: { enabled: false, minutes: 20 },
    items: [
      item('lb-1', 'walking-lunge', 3, 10, 12),
      item('lb-2', 'seated-leg-curl', 3, 12, 15),
      item('lb-3', 'leg-extension', 3, 12, 15),
      item('lb-4', 'hip-thrust', 3, 12, 15, { note: 'Lżej niż we wtorek' }),
      item('lb-5', 'hip-adduction', 3, 12, 15, { supersetWithNext: true }),
      item('lb-6', 'hip-abduction', 3, 12, 15),
      item('lb-7', 'seated-calf-raise', 3, 15, 15),
    ],
  },
];

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  restCompoundSec: 150,
  restIsolationSec: 75,
  sound: true,
  vibration: true,
  deloadEveryWeeks: 7,
  deloadSetDelta: 1,
  deloadWeightPct: 90,
  seedVersion: SEED_VERSION,
};
