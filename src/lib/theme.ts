export type ThemeId =
  | 'carbon-blue'
  | 'club-emerald'
  | 'athletic-volt'
  | 'tactical-amber'
  | 'light-minimal';

export type ThemeTranslationKey =
  | 'settings.theme.carbonBlue'
  | 'settings.theme.clubEmerald'
  | 'settings.theme.athleticVolt'
  | 'settings.theme.tacticalAmber'
  | 'settings.theme.lightMinimal';

export interface ThemePreset {
  id: ThemeId;
  translationKey: ThemeTranslationKey;
  mode: 'dark' | 'light';
  bg: string;
  bgGlass: string;
  surface: string;
  surfaceGlass: string;
  surfaceSubtle: string;
  surfaceElevated: string;
  surfaceHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  defaultAccent: string;
  border: string;
  borderStrong: string;
  shadowMd: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'carbon-blue',
    translationKey: 'settings.theme.carbonBlue',
    mode: 'dark',
    bg: '#0D1117',
    bgGlass: 'rgba(13, 17, 23, 0.92)',
    surface: '#161B22',
    surfaceGlass: 'rgba(22, 27, 34, 0.96)',
    surfaceSubtle: 'rgba(13, 17, 23, 0.45)',
    surfaceElevated: '#1F2631',
    surfaceHover: '#273140',
    textPrimary: '#F3F6FA',
    textSecondary: '#9FB0C4',
    textMuted: '#6E7F94',
    defaultAccent: '#3B82F6',
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
    shadowMd: '0 18px 44px rgba(0, 0, 0, 0.56)',
  },
  {
    id: 'club-emerald',
    translationKey: 'settings.theme.clubEmerald',
    mode: 'dark',
    bg: '#08121E',
    bgGlass: 'rgba(8, 18, 30, 0.92)',
    surface: '#0F1D2E',
    surfaceGlass: 'rgba(15, 29, 46, 0.96)',
    surfaceSubtle: 'rgba(8, 18, 30, 0.48)',
    surfaceElevated: '#17283D',
    surfaceHover: '#1F3550',
    textPrimary: '#F1F7FB',
    textSecondary: '#9BB4C9',
    textMuted: '#698399',
    defaultAccent: '#10B981',
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
    shadowMd: '0 18px 44px rgba(0, 0, 0, 0.58)',
  },
  {
    id: 'athletic-volt',
    translationKey: 'settings.theme.athleticVolt',
    mode: 'dark',
    bg: '#0B0E14',
    bgGlass: 'rgba(11, 14, 20, 0.92)',
    surface: '#141923',
    surfaceGlass: 'rgba(20, 25, 35, 0.96)',
    surfaceSubtle: 'rgba(11, 14, 20, 0.45)',
    surfaceElevated: '#1A2130',
    surfaceHover: '#212A3D',
    textPrimary: '#F5F7FA',
    textSecondary: '#A6B1C4',
    textMuted: '#707C91',
    defaultAccent: '#B8FF2C',
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
    shadowMd: '0 18px 44px rgba(0, 0, 0, 0.58)',
  },
  {
    id: 'tactical-amber',
    translationKey: 'settings.theme.tacticalAmber',
    mode: 'dark',
    bg: '#121214',
    bgGlass: 'rgba(18, 18, 20, 0.92)',
    surface: '#1B1B1F',
    surfaceGlass: 'rgba(27, 27, 31, 0.96)',
    surfaceSubtle: 'rgba(18, 18, 20, 0.45)',
    surfaceElevated: '#25252B',
    surfaceHover: '#303038',
    textPrimary: '#F7F7F8',
    textSecondary: '#B3B3BD',
    textMuted: '#7E7E8B',
    defaultAccent: '#F59E0B',
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
    shadowMd: '0 18px 44px rgba(0, 0, 0, 0.58)',
  },
  {
    id: 'light-minimal',
    translationKey: 'settings.theme.lightMinimal',
    mode: 'light',
    bg: '#F4F6F9',
    bgGlass: 'rgba(244, 246, 249, 0.92)',
    surface: '#FFFFFF',
    surfaceGlass: 'rgba(255, 255, 255, 0.96)',
    surfaceSubtle: 'rgba(15, 23, 42, 0.04)',
    surfaceElevated: '#EEF2F7',
    surfaceHover: '#E4EAF2',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    defaultAccent: '#2563EB',
    border: 'rgba(15, 23, 42, 0.09)',
    borderStrong: 'rgba(15, 23, 42, 0.18)',
    shadowMd: '0 14px 32px rgba(15, 23, 42, 0.12)',
  },
];

export const QUICK_ACCENT_COLORS = [
  '#3B82F6',
  '#10B981',
  '#B8FF2C',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
] as const;

export const DEFAULT_THEME_ID: ThemeId = 'athletic-volt';

const VALID_THEME_IDS = new Set<string>(THEME_PRESETS.map((p) => p.id));

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return Boolean(value && VALID_THEME_IDS.has(value));
}

export function getThemePreset(themeId: ThemeId): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === themeId) || THEME_PRESETS[2];
}

export function normalizeHexColor(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const shortMatch = /^#([0-9a-fA-F]{3})$/.exec(trimmed);
  if (shortMatch) {
    const [r, g, b] = shortMatch[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  const fullMatch = /^#([0-9a-fA-F]{6})$/.exec(trimmed);
  if (fullMatch) {
    return `#${fullMatch[1].toUpperCase()}`;
  }
  return null;
}

function parseHexRgb(hex: string): [number, number, number] {
  const normalized = normalizeHexColor(hex) || '#B8FF2C';
  return [
    parseInt(normalized.slice(1, 3), 16),
    parseInt(normalized.slice(3, 5), 16),
    parseInt(normalized.slice(5, 7), 16),
  ];
}

export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = parseHexRgb(hex).map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastTextColor(hex: string): '#0B0E14' | '#FFFFFF' {
  return getRelativeLuminance(hex) > 0.36 ? '#0B0E14' : '#FFFFFF';
}

export function shiftHexBrightness(hex: string, factor: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const [r, g, b] = parseHexRgb(hex);
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r * factor)}${toHex(g * factor)}${toHex(b * factor)}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHexRgb(hex);
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

export function resolveThemeCssVars(
  themeId: ThemeId,
  customAccent?: string | null
): { mode: 'dark' | 'light'; accent: string; bg: string; vars: Record<string, string> } {
  const preset = getThemePreset(themeId);
  const accent = normalizeHexColor(customAccent) || preset.defaultAccent;
  const accentText = getContrastTextColor(accent);
  const accentHover =
    getRelativeLuminance(accent) > 0.2
      ? shiftHexBrightness(accent, 0.88)
      : shiftHexBrightness(accent, 1.12);

  return {
    mode: preset.mode,
    accent,
    bg: preset.bg,
    vars: {
      '--bg': preset.bg,
      '--bg-glass': preset.bgGlass,
      '--surface': preset.surface,
      '--surface-glass': preset.surfaceGlass,
      '--surface-subtle': preset.surfaceSubtle,
      '--surface-elevated': preset.surfaceElevated,
      '--surface-hover': preset.surfaceHover,
      '--text-primary': preset.textPrimary,
      '--text-secondary': preset.textSecondary,
      '--text-muted': preset.textMuted,
      '--accent': accent,
      '--accent-hover': accentHover,
      '--accent-text': accentText,
      '--accent-soft': hexToRgba(accent, preset.mode === 'light' ? 0.12 : 0.14),
      '--accent-border': hexToRgba(accent, preset.mode === 'light' ? 0.35 : 0.42),
      '--success': accent,
      '--success-soft': hexToRgba(accent, preset.mode === 'light' ? 0.12 : 0.14),
      '--border': preset.border,
      '--border-strong': preset.borderStrong,
      '--shadow-md': preset.shadowMd,
    },
  };
}

export function applyThemeToDocument(themeId: ThemeId, customAccent?: string | null): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveThemeCssVars(themeId, customAccent);
  const root = document.documentElement;
  root.setAttribute('data-theme', themeId);
  root.setAttribute('data-color-scheme', resolved.mode);
  root.style.colorScheme = resolved.mode;

  for (const [prop, val] of Object.entries(resolved.vars)) {
    root.style.setProperty(prop, val);
  }

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', resolved.bg);
  }
}
