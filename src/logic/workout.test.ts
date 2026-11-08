import { describe, expect, it } from 'vitest';
import type { Session, SessionEntry, SetLog } from '../db/types';
import {
  createSessionFromTemplate,
  findPrevious,
  groupBySuperset,
  prefillSets,
  progressionSuggestion,
  restAfterSet,
  startingWeight,
  templateForWeekday,
  workingWeightOverride,
} from './workout';
import { SEED_TEMPLATES } from '../db/seed';

const set = (weight: number | null, reps: number | null, done = true): SetLog => ({ weight, reps, done });

function entry(exerciseId: string, setLogs: SetLog[], target = { sets: 3, repMin: 6, repMax: 8 }): SessionEntry {
  return { id: `e-${exerciseId}`, exerciseId, altExerciseIds: [], ...target, setLogs };
}

function session(id: string, date: string, templateId: string | null, entries: SessionEntry[], extra: Partial<Session> = {}): Session {
  return {
    id,
    date,
    startedAt: new Date(date).getTime(),
    templateId,
    templateName: templateId ?? 'x',
    isDeload: false,
    note: '',
    cardio: { planned: false, done: false },
    status: 'done',
    entries,
    ...extra,
  };
}

describe('progressionSuggestion (podwójna progresja)', () => {
  const target = { sets: 3, repMax: 8 };

  it('podpowiada +krok, gdy wszystkie serie osiągnęły górną granicę', () => {
    const prev = entry('a', [set(60, 8), set(60, 8), set(60, 8)]);
    expect(progressionSuggestion(prev, target, 2.5)).toBe(62.5);
  });

  it('akceptuje więcej powtórzeń niż górna granica', () => {
    const prev = entry('a', [set(60, 9), set(60, 8), set(60, 10)]);
    expect(progressionSuggestion(prev, target, 5)).toBe(65);
  });

  it('nie podpowiada, gdy choć jedna seria jest poniżej górnej granicy', () => {
    const prev = entry('a', [set(60, 8), set(60, 8), set(60, 7)]);
    expect(progressionSuggestion(prev, target, 2.5)).toBeNull();
  });

  it('nie podpowiada, gdy zrobiono mniej serii niż w planie', () => {
    const prev = entry('a', [set(60, 8), set(60, 8)]);
    expect(progressionSuggestion(prev, target, 2.5)).toBeNull();
  });

  it('ignoruje niezatwierdzone serie', () => {
    const prev = entry('a', [set(60, 8), set(60, 8), set(60, 8, false)]);
    expect(progressionSuggestion(prev, target, 2.5)).toBeNull();
  });

  it('bez poprzedniego wyniku zwraca null', () => {
    expect(progressionSuggestion(undefined, target, 2.5)).toBeNull();
  });

  it('bazuje na najwyższym ciężarze i zaokrągla wynik', () => {
    const prev = entry('a', [set(20.1, 8), set(20.2, 8), set(20.2, 8)]);
    expect(progressionSuggestion(prev, target, 0.1)).toBe(20.3);
  });

  it('działa dla asysty (ciężar ujemny) – mniejsza asysta', () => {
    const prev = entry('a', [set(-20, 10), set(-20, 10), set(-20, 10)]);
    expect(progressionSuggestion(prev, { sets: 3, repMax: 10 }, 2.5)).toBe(-17.5);
  });

  it('używa aktualnego celu z planu, nie starego', () => {
    // Poprzednio zakres był 6–8, teraz plan mówi 8–10.
    const prev = entry('a', [set(60, 8), set(60, 8), set(60, 8)], { sets: 3, repMin: 6, repMax: 8 });
    expect(progressionSuggestion(prev, { sets: 3, repMax: 10 }, 2.5)).toBeNull();
  });
});

describe('findPrevious', () => {
  const legCurlA = session('s1', '2026-11-03', 'lower-a', [entry('leg-curl', [set(40, 10)])]);
  const legCurlB = session('s2', '2026-11-06', 'lower-b', [entry('leg-curl', [set(30, 15)])]);

  it('preferuje ten sam trening z planu', () => {
    expect(findPrevious([legCurlA, legCurlB], 'leg-curl', 'lower-a')?.session.id).toBe('s1');
    expect(findPrevious([legCurlA, legCurlB], 'leg-curl', 'lower-b')?.session.id).toBe('s2');
  });

  it('gdy brak tego samego treningu, bierze najnowszy dowolny', () => {
    expect(findPrevious([legCurlA, legCurlB], 'leg-curl', 'other')?.session.id).toBe('s2');
    expect(findPrevious([legCurlA, legCurlB], 'leg-curl', null)?.session.id).toBe('s2');
  });

  it('wybiera najnowszy trening', () => {
    const older = session('s0', '2026-10-27', 'lower-a', [entry('leg-curl', [set(35, 10)])]);
    expect(findPrevious([older, legCurlA], 'leg-curl', 'lower-a')?.session.id).toBe('s1');
  });

  it('pomija lżejsze tygodnie, treningi w toku i wskazaną sesję', () => {
    const deload = session('d', '2026-11-10', 'lower-a', [entry('leg-curl', [set(30, 8)])], { isDeload: true });
    const inProgress = session('p', '2026-11-11', 'lower-a', [entry('leg-curl', [set(30, 8)])], { status: 'in_progress' });
    expect(findPrevious([legCurlA, deload, inProgress], 'leg-curl', 'lower-a')?.session.id).toBe('s1');
    expect(findPrevious([legCurlA], 'leg-curl', 'lower-a', 's1')).toBeUndefined();
  });

  it('pomija wpisy bez żadnej zatwierdzonej serii', () => {
    const skipped = session('s3', '2026-11-08', 'lower-a', [entry('leg-curl', [set(40, 10, false)])]);
    expect(findPrevious([legCurlA, skipped], 'leg-curl', 'lower-a')?.session.id).toBe('s1');
  });

  it('odnosi się do ćwiczenia po identyfikatorze, niezależnie od pozycji', () => {
    const reordered = session('s4', '2026-11-09', 'lower-a', [entry('other', [set(1, 1)]), entry('leg-curl', [set(45, 9)])]);
    expect(findPrevious([legCurlA, reordered], 'leg-curl', 'lower-a')?.entry.setLogs[0].weight).toBe(45);
  });
});

describe('prefillSets', () => {
  it('kopiuje serie z poprzedniego razu jako niezatwierdzone', () => {
    const prev = entry('a', [set(60, 8), set(60, 7), set(57.5, 8)]);
    expect(prefillSets(3, prev)).toEqual([set(60, 8, false), set(60, 7, false), set(57.5, 8, false)]);
  });

  it('dopełnia brakujące serie ostatnią serią', () => {
    const prev = entry('a', [set(60, 8), set(60, 7)]);
    expect(prefillSets(4, prev).map((s) => s.reps)).toEqual([8, 7, 7, 7]);
  });

  it('bez historii zostawia puste pola', () => {
    expect(prefillSets(2, undefined)).toEqual([set(null, null, false), set(null, null, false)]);
  });
});

describe('createSessionFromTemplate', () => {
  it('tworzy wpisy z kopią celu i wartościami z poprzedniego razu', () => {
    const tpl = SEED_TEMPLATES[0];
    const prev = session('s1', '2026-11-02', tpl.id, [entry('hammer-chest-press', [set(80, 8), set(80, 7), set(80, 6)])]);
    const s = createSessionFromTemplate(tpl, [prev], '2026-11-09');
    expect(s.status).toBe('in_progress');
    expect(s.templateName).toBe('Góra A');
    expect(s.cardio).toMatchObject({ planned: true, done: false, minutes: 20 });
    expect(s.entries).toHaveLength(tpl.items.length);
    expect(s.entries[0]).toMatchObject({ exerciseId: 'hammer-chest-press', sets: 3, repMin: 6, repMax: 8 });
    expect(s.entries[0].setLogs.map((x) => x.weight)).toEqual([80, 80, 80]);
    expect(s.entries[1].setLogs[0].weight).toBeNull();
  });

  it('bez historii startuje od ciężaru roboczego z karty ćwiczenia', () => {
    const tpl = SEED_TEMPLATES[0];
    const exercises = new Map([['hammer-chest-press', { workingWeight: 70, workingWeightAt: 1 }]]);
    const s = createSessionFromTemplate(tpl, [], '2026-11-09', Date.now(), exercises);
    expect(s.entries[0].setLogs).toEqual([set(70, null, false), set(70, null, false), set(70, null, false)]);
    expect(s.entries[1].setLogs[0].weight).toBeNull();
  });
});

describe('ciężar roboczy', () => {
  const prev = { session: session('s1', '2026-11-02', 'upper-a', [], { finishedAt: new Date('2026-11-02T19:00:00').getTime() }), entry: entry('a', [set(80, 8), set(82.5, 6)]) };
  const before = new Date('2026-11-01').getTime();
  const after = new Date('2026-11-03').getTime();

  it('ma pierwszeństwo, gdy nie ma historii albo ustawiono go po ostatnim treningu', () => {
    expect(workingWeightOverride({ workingWeight: 70, workingWeightAt: before }, undefined)).toBe(70);
    expect(workingWeightOverride({ workingWeight: 85, workingWeightAt: after }, prev)).toBe(85);
  });

  it('ustępuje nowszemu wynikowi z treningu', () => {
    expect(workingWeightOverride({ workingWeight: 70, workingWeightAt: before }, prev)).toBeNull();
    expect(workingWeightOverride({}, prev)).toBeNull();
    expect(workingWeightOverride(undefined, undefined)).toBeNull();
  });

  it('zastępuje ciężar we wszystkich seriach, powtórzenia zostają z poprzedniego razu', () => {
    expect(prefillSets(3, prev.entry, 85)).toEqual([set(85, 8, false), set(85, 6, false), set(85, 6, false)]);
  });

  it('startingWeight: ciężar roboczy albo najwyższy ciężar z ostatniego treningu', () => {
    expect(startingWeight({ workingWeight: 85, workingWeightAt: after }, prev)).toBe(85);
    expect(startingWeight({ workingWeight: 70, workingWeightAt: before }, prev)).toBe(82.5);
    expect(startingWeight(undefined, undefined)).toBeNull();
  });
});

describe('groupBySuperset', () => {
  it('łączy kolejne ćwiczenia w superserie', () => {
    const items = [{ id: 1 }, { id: 2, supersetWithNext: true }, { id: 3 }, { id: 4 }];
    expect(groupBySuperset(items).map((g) => g.map((x) => x.id))).toEqual([[1], [2, 3], [4]]);
  });

  it('flaga na ostatnim elemencie niczego nie psuje', () => {
    expect(groupBySuperset([{ id: 1, supersetWithNext: true }]).length).toBe(1);
  });
});

describe('restAfterSet (timer przerwy)', () => {
  const settings = { restCompoundSec: 150, restIsolationSec: 75 };
  const exercises = new Map([
    ['press', { kind: 'compound' as const }],
    ['fly', { kind: 'isolation' as const }],
    ['rear', { kind: 'isolation' as const, restSec: 90 }],
    ['curl', { kind: 'isolation' as const }],
  ]);
  const entries: SessionEntry[] = [
    { ...entry('press', []), id: 'p' },
    { ...entry('fly', []), id: 'f', supersetWithNext: true },
    { ...entry('rear', []), id: 'r' },
    { ...entry('curl', []), id: 'c' },
  ];

  it('wielostawowe: domyślna przerwa dla wielostawowych', () => {
    expect(restAfterSet(entries, 'p', exercises, settings)).toBe(150);
  });

  it('izolacja: domyślna przerwa dla izolacji', () => {
    expect(restAfterSet(entries, 'c', exercises, settings)).toBe(75);
  });

  it('superseria: brak timera po pierwszym ćwiczeniu z pary', () => {
    expect(restAfterSet(entries, 'f', exercises, settings)).toBeNull();
  });

  it('superseria: po drugim ćwiczeniu – najdłuższa przerwa z pary', () => {
    expect(restAfterSet(entries, 'r', exercises, settings)).toBe(90);
  });

  it('własna przerwa ćwiczenia ma pierwszeństwo', () => {
    const ex = new Map([['press', { kind: 'compound' as const, restSec: 200 }]]);
    expect(restAfterSet([{ ...entry('press', []), id: 'p' }], 'p', ex, settings)).toBe(200);
  });
});

describe('templateForWeekday', () => {
  it('przypisuje treningi do dni tygodnia', () => {
    expect(templateForWeekday(SEED_TEMPLATES, 1)?.name).toBe('Góra A');
    expect(templateForWeekday(SEED_TEMPLATES, 2)?.name).toBe('Dół A');
    expect(templateForWeekday(SEED_TEMPLATES, 3)).toBeUndefined();
    expect(templateForWeekday(SEED_TEMPLATES, 4)?.name).toBe('Góra B');
    expect(templateForWeekday(SEED_TEMPLATES, 5)?.name).toBe('Dół B');
  });
});
