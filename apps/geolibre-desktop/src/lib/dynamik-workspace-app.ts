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
  "--text-primary": ["--foreground", "--card-foreground", "--popover-foreground", "--accent-foreground"],
  "--surface-panel": ["--card"],
  "--surface-elevated": ["--popover"],
  // shadcn --accent is the hover/selected surface, not the DS brand accent or a scrim.
  "--surface-hover": ["--secondary", "--muted", "--accent"],
  "--text-secondary": ["--secondary-foreground"],
  "--text-muted": ["--muted-foreground"],
  "--border-default": ["--border"],
  "--border-strong": ["--input"],
  "--accent": ["--primary"],
  "--accent-fg": ["--primary-foreground"],
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

/** Shadcn variables written as HSL channels; the raw DS token of the same name must not overwrite them. */
const SHADCN_TARGETS = new Set(Object.values(SHADCN_TOKEN_MAP).flat());

export type Rgba = [number, number, number, number];

/**
 * Parse a computed CSS colour. Browsers serialise `rgb()`/`rgba()` with
 * 0-255 channels but `color(srgb …)` (from color-mix, which the Workspace
 * surfaces use) with 0-1 channels; reading both as 0-255 turned light panels black.
 */
export function parseComputedColor(computed: string): Rgba | null {
  const text = computed.trim();
  const srgb = /^color\(srgb\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)(?:\s*\/\s*([\d.e+-]+%?))?\s*\)$/u.exec(text);
  if (srgb) {
    const channels = srgb.slice(1, 4).map((part) => Number(part) * 255);
    const alphaText = srgb[4];
    const alpha = alphaText === undefined ? 1 : alphaText.endsWith("%") ? Number(alphaText.slice(0, -1)) / 100 : Number(alphaText);
    if (channels.some((part) => !Number.isFinite(part)) || !Number.isFinite(alpha)) return null;
    return [channels[0]!, channels[1]!, channels[2]!, alpha];
  }
  if (!/^rgba?\(/u.test(text)) return null;
  const numbers = text.match(/[\d.]+/gu)?.map(Number) ?? [];
  if (numbers.length < 3 || numbers.slice(0, 3).some((part) => !Number.isFinite(part))) return null;
  const [red = 0, green = 0, blue = 0, alpha = 1] = numbers;
  return [red, green, blue, Number.isFinite(alpha) ? alpha : 1];
}

function cssColorToRgba(value: string): Rgba | null {
  const probe = document.createElement("span");
  probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none";
  probe.style.color = value;
  document.body.append(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  return parseComputedColor(computed);
}

/**
 * HSL channels for a shadcn variable. Shadcn colours are opaque channels, so a
 * translucent DS colour (borders are white at 22-56% in dark mode) is first
 * composited over the surface it sits on; dropping alpha would turn every
 * border solid white.
 */
export function rgbaToHslChannels([r, g, b, a]: Rgba, backdrop: Rgba = [0, 0, 0, 1]): string {
  const alpha = Math.min(1, Math.max(0, a));
  const [red, green, blue] = [r, g, b].map(
    (part, index) => (part * alpha + backdrop[index]! * (1 - alpha)) / 255,
  ) as [number, number, number];
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
  const base = snapshot.tokens["--surface-base"];
  const backdrop = base && SAFE_CSS_VALUE.test(base.trim()) ? cssColorToRgba(base) ?? undefined : undefined;
  for (const [token, value] of Object.entries(snapshot.tokens)) {
    if (!THEME_TOKENS.has(token) || !SAFE_CSS_VALUE.test(value.trim())) continue;
    // The DS `--accent` is a full colour; shadcn's `--accent` holds HSL channels
    // (`hsl(var(--accent))`). Writing the raw token there would invalidate it.
    if (!SHADCN_TARGETS.has(token)) root.style.setProperty(token, value);
    tokenCount += 1;
    const mappedTokens = SHADCN_TOKEN_MAP[token];
    const rgba = mappedTokens ? cssColorToRgba(value) : null;
    if (rgba && mappedTokens) {
      const hsl = rgbaToHslChannels(rgba, backdrop);
      for (const target of mappedTokens) root.style.setProperty(target, hsl);
    }
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
