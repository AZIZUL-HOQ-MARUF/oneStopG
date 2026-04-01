"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeCtx {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
  mounted: boolean;
}

const STORAGE_KEY = "theme";
const MEDIA = "(prefers-color-scheme: dark)";
const DEFAULT_THEME: Theme = "dark";
const DEFAULT_RESOLVED: ResolvedTheme = "dark";

const ThemeContext = createContext<ThemeCtx>({
  theme: DEFAULT_THEME,
  resolvedTheme: DEFAULT_RESOLVED,
  setTheme: () => {},
  mounted: false,
});

export const useTheme = () => useContext(ThemeContext);

// ── Helpers ────────────────────────────────────────────────
function readTheme(): Theme {
  try {
    return (localStorage.getItem(STORAGE_KEY) as Theme) || DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function readSystem(): ResolvedTheme {
  return window.matchMedia(MEDIA).matches ? "dark" : "light";
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
}

/** Compute resolved theme and apply DOM class */
function syncDom() {
  const theme = readTheme();
  const resolved: ResolvedTheme = theme === "system" ? readSystem() : theme;
  applyTheme(resolved);
}

// ── External store: localStorage theme ─────────────────────
const themeListeners = new Set<() => void>();
function emitThemeChange() {
  themeListeners.forEach((l) => l());
}

function subscribeTheme(cb: () => void) {
  themeListeners.add(cb);

  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      syncDom();
      emitThemeChange();
    }
  };
  window.addEventListener("storage", handler);

  // Apply on first subscription (mount)
  syncDom();

  return () => {
    themeListeners.delete(cb);
    window.removeEventListener("storage", handler);
  };
}

function getThemeSnapshot(): Theme {
  return readTheme();
}

function getThemeServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

// ── External store: system prefers-color-scheme ────────────
function subscribeSystemTheme(cb: () => void) {
  const mq = window.matchMedia(MEDIA);
  const handler = () => {
    syncDom();
    cb();
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

function getSystemSnapshot(): ResolvedTheme {
  return readSystem();
}

function getSystemServerSnapshot(): ResolvedTheme {
  return DEFAULT_RESOLVED;
}

// ── Mounted store (constant after hydration) ───────────────
const noopSubscribe = () => () => {};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  const systemTheme = useSyncExternalStore(subscribeSystemTheme, getSystemSnapshot, getSystemServerSnapshot);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const resolved: ResolvedTheme = theme === "system" ? systemTheme : theme;

  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {}
    syncDom();
    emitThemeChange();
  }, []);

  const ctx = useMemo(
    () => ({ theme, resolvedTheme: resolved, setTheme, mounted }),
    [theme, resolved, setTheme, mounted],
  );

  return (
    <ThemeContext.Provider value={ctx}>{children}</ThemeContext.Provider>
  );
}
