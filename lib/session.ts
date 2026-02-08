import type { SessionPayload } from "@/lib/types";

const SESSION_KEY = "asset_frontend_session";

export function readSession(): SessionPayload | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionPayload;
  } catch {
    return null;
  }
}

export function saveSession(session: SessionPayload) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}
