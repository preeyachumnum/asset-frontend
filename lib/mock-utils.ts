export function readLocalState<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
}

export function writeLocalState<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function inBrowser() {
  return typeof window !== "undefined";
}

export function nowIso() {
  return new Date().toISOString();
}

export function uid() {
  return crypto.randomUUID();
}
