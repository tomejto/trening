/** Identyfikator działający także poza bezpiecznym kontekstem (np. http po IP w sieci lokalnej). */
export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
