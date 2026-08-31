const PROTOCOL = "dynamik.workspace.app" as const;
const VERSION = 1 as const;
const SAFE_CSS_VALUE = /^[^{};<>]{1,240}$/u;

const THEME_TOKENS = new Set([
  "--surface-base", "--surface-hover", "--surface-panel", "--surface-elevated",
  "--surface-overlay", "--text-primary", "--text-secondary", "--text-muted",
  "--text-dim", "--border-default", "--border-strong", "--border-bright",
  "--status-ok", "--status-ok-bg", "--status-warn", "--status-warn-bg",
  "--status-error", "--status-error-bg", "--status-info", "--status-info-bg",
  "--accent", "--accent-fg", "--accent-soft", "--accent-strong", "--agent",
  "--agent-fg", "--agent-soft", "--agent-strong", "--agent-border", "--focus-ring",
]);

const SHADCN_TOKEN_MAP: Record<string, string[]> = {
  "--surface-base": ["--background"],
  "--text-primary": ["--foreground", "--card-foreground", "--popover-foreground"],
  "--surface-panel": ["--card"],
  "--surface-elevated": ["--popover"],
  "--surface-hover": ["--secondary", "--muted"],
  "--text-secondary": ["--secondary-foreground"],
  "--text-muted": ["--muted-foreground"],
  "--surface-overlay": ["--accent"],
  "--border-default": ["--border"],
  "--border-strong": ["--input"],
  "--accent": ["--primary"],
  "--accent-fg": ["--primary-foreground", "--accent-foreground"],
  "--focus-ring": ["--ring"],
};

interface ThemeSnapshot {
  requestId: string;
  colorScheme: "light" | "dark";
  preset: string;
  tokens: Record<string, string>;
}

function isThemeMessage(value: unknown): value is {
  source: typeof PROTOCOL;
  version: typeof VERSION;
  type: "theme.changed";
  payload: ThemeSnapshot;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const message = value as Record<string, unknown>;
  if (message.source !== PROTOCOL || message.version !== VERSION || message.type !== "theme.changed") return false;
  const payload = message.payload as Partial<ThemeSnapshot> | undefined;
  return typeof payload?.requestId === "string"
    && (payload.colorScheme === "light" || payload.colorScheme === "dark")
    && typeof payload.preset === "string"
    && Boolean(payload.tokens)
    && typeof payload.tokens === "object";
}

function cssColorToHslChannels(value: string): string | null {
  const probe = document.createElement("span");
  probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none";
  probe.style.color = value;
  document.body.append(probe);
  const numbers = getComputedStyle(probe).color.match(/[\d.]+/gu)?.map(Number) ?? [];
  probe.remove();
  if (numbers.length < 3 || numbers.slice(0, 3).some((part) => !Number.isFinite(part))) return null;
  const [red = 0, green = 0, blue = 0] = numbers.slice(0, 3).map((part) => part / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return `${hue.toFixed(1)} ${(saturation * 100).toFixed(1)}% ${(lightness * 100).toFixed(1)}%`;
}

function applyTheme(snapshot: ThemeSnapshot): number {
  const root = document.documentElement;
  let tokenCount = 0;
  for (const [token, value] of Object.entries(snapshot.tokens)) {
    if (!THEME_TOKENS.has(token) || !SAFE_CSS_VALUE.test(value.trim())) continue;
    root.style.setProperty(token, value);
    tokenCount += 1;
    const mappedTokens = SHADCN_TOKEN_MAP[token];
    const hsl = mappedTokens ? cssColorToHslChannels(value) : null;
    if (hsl && mappedTokens) for (const target of mappedTokens) root.style.setProperty(target, hsl);
  }
  root.classList.toggle("dark", snapshot.colorScheme === "dark");
  root.style.colorScheme = snapshot.colorScheme;
  root.dataset.theme = snapshot.preset;
  root.dataset.themeMode = snapshot.colorScheme;
  root.dataset.workspaceShell = "dynamik.workspace.app-frame.v1";
  root.dataset.dynamikWorkspace = "true";
  window.dispatchEvent(new CustomEvent("dynamik-workspace-theme", { detail: snapshot }));
  return tokenCount;
}

export function resolveDynamikWorkspaceOrigin(
  configuredOrigin: string | undefined,
  referrer: string,
): string | null {
  const candidate = configuredOrigin?.trim() || referrer;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return (url.protocol === "https:" || url.protocol === "http:")
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

export function installDynamikWorkspaceAppBridge(options: { workspaceOrigin: string }): () => void {
  const receive = (event: MessageEvent) => {
    if (event.origin !== options.workspaceOrigin || event.source !== window.parent || !isThemeMessage(event.data)) return;
    const tokenCount = applyTheme(event.data.payload);
    window.parent.postMessage({
      source: PROTOCOL,
      version: VERSION,
      type: "theme.applied",
      payload: {
        requestId: event.data.payload.requestId,
        colorScheme: event.data.payload.colorScheme,
        preset: event.data.payload.preset,
        tokenCount,
      },
    }, options.workspaceOrigin);
  };
  window.addEventListener("message", receive);
  window.parent.postMessage({
    source: PROTOCOL,
    version: VERSION,
    type: "application.ready",
    capabilities: { theme: true, themeAcknowledgement: true },
  }, options.workspaceOrigin);
  return () => window.removeEventListener("message", receive);
}
