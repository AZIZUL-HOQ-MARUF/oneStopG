"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeCtx {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
}

const STORAGE_KEY = "theme";
const MEDIA = "(prefers-color-scheme: dark)";

const ThemeContext = createContext<ThemeCtx>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia(MEDIA).matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    return (localStorage.getItem(STORAGE_KEY) as Theme) || "dark";
  } catch {
    return "dark";
  }
}

function resolve(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolve(theme)
  );

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {}
    const r = resolve(t);
    setResolved(r);
    applyTheme(r);
  }, []);

  // Apply on mount
  useEffect(() => {
    applyTheme(resolved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia(MEDIA);
    const handler = () => {
      const r = getSystemTheme();
      setResolved(r);
      applyTheme(r);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const t = e.newValue as Theme;
        setThemeState(t);
        const r = resolve(t);
        setResolved(r);
        applyTheme(r);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const ctx = useMemo(
    () => ({ theme, resolvedTheme: resolved, setTheme }),
    [theme, resolved, setTheme]
  );

  return (
    <ThemeContext.Provider value={ctx}>{children}</ThemeContext.Provider>
  );
}
