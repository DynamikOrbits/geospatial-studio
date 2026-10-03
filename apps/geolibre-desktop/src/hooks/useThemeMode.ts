import { useCallback, useEffect, useLayoutEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

export function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  // An explicit `?theme=dark` / `?theme=light` overrides the OS preference on
  // load (handy for embeds); the in-app toggle still works afterwards.
  const themeParam = new URLSearchParams(window.location.search).get("theme")?.trim().toLowerCase();
  if (themeParam === "dark" || themeParam === "light") {
    return themeParam;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function isWorkspaceThemed(): boolean {
  return typeof document !== "undefined"
    && document.documentElement.dataset.dynamikWorkspace === "true";
}

/**
 * True once the Dynamik Workspace has pushed a theme: light/dark then follows
 * the Workspace, so the app's own scheme pickers render disabled.
 */
export function useWorkspaceThemeLocked(): boolean {
  const [locked, setLocked] = useState(isWorkspaceThemed);
  useEffect(() => {
    const update = () => setLocked(isWorkspaceThemed());
    update();
    window.addEventListener("dynamik-workspace-theme", update);
    return () => window.removeEventListener("dynamik-workspace-theme", update);
  }, []);
  return locked;
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);

  useLayoutEffect(() => {
    const isDark = themeMode === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode]);

  useLayoutEffect(() => {
    const receiveWorkspaceTheme = (event: Event) => {
      const detail = (event as CustomEvent<{ colorScheme?: unknown }>).detail;
      if (detail?.colorScheme === "light" || detail?.colorScheme === "dark") {
        setThemeMode(detail.colorScheme);
      }
    };
    window.addEventListener("dynamik-workspace-theme", receiveWorkspaceTheme);
    return () => window.removeEventListener("dynamik-workspace-theme", receiveWorkspaceTheme);
  }, []);

  const toggleThemeMode = useCallback(() => {
    if (isWorkspaceThemed()) return;
    setThemeMode((currentThemeMode) => (currentThemeMode === "dark" ? "light" : "dark"));
  }, []);

  return { themeMode, toggleThemeMode };
}
