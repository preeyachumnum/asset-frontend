import type { SessionPayload } from "@/lib/types";
import { useSyncExternalStore } from "react";

const SESSION_KEY = "asset_frontend_session";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedSnapshot: SessionPayload | null = null;

function emitSessionChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === SESSION_KEY) listener();
  };

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getServerSnapshot() {
  return null;
}

function getClientSnapshot(): SessionPayload | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (raw === cachedRaw) return cachedSnapshot;

  cachedRaw = raw;
  if (!raw) {
    cachedSnapshot = null;
    return cachedSnapshot;
  }

  try {
    cachedSnapshot = JSON.parse(raw) as SessionPayload;
  } catch {
    cachedSnapshot = null;
  }

  return cachedSnapshot;
}

export function readSession(): SessionPayload | null {
  return getClientSnapshot();
}

export function saveSession(session: SessionPayload) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(session);
  window.localStorage.setItem(SESSION_KEY, raw);
  cachedRaw = raw;
  cachedSnapshot = session;
  emitSessionChange();
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  cachedRaw = null;
  cachedSnapshot = null;
  emitSessionChange();
}

export function useSession() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
