import { create } from 'zustand';
import {
  applyThemeToDocument,
  DEFAULT_THEME_ID,
  isThemeId,
  normalizeHexColor,
  type ThemeId,
} from '../lib/theme.ts';
import type { Locale } from '../types/survey.ts';

const LANG_KEY = 'pps_locale_v1';
const PIN_HASH_KEY = 'pps_coach_pin_v1';
const SESSION_UNLOCK_KEY = 'pps_coach_unlocked_v1';
const THEME_KEY = 'pps_theme_v1';
const ACCENT_KEY = 'pps_accent_v1';

function readInitialLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved === 'et' || saved === 'en' || saved === 'ru' || saved === 'es') return saved;
  } catch {
    // Fallback
  }
  return 'et';
}

function readInitialTheme(): ThemeId {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (isThemeId(saved)) return saved;
  } catch {
    // Fallback
  }
  return DEFAULT_THEME_ID;
}

function readInitialAccent(): string | null {
  try {
    return normalizeHexColor(window.localStorage.getItem(ACCENT_KEY));
  } catch {
    return null;
  }
}

function hashPin(pin: string): string {
  // Deterministic lightweight salted hash for client-side PIN gate
  let h = 2166136261;
  const input = `pps_salt_v1:${pin}`;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function hasStoredPin(): boolean {
  try {
    return Boolean(window.localStorage.getItem(PIN_HASH_KEY));
  } catch {
    return false;
  }
}

function readSessionUnlocked(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

interface ToastState {
  message: string;
  tone: 'info' | 'error';
}

interface AppStoreState {
  locale: Locale;
  themeId: ThemeId;
  customAccent: string | null;
  hasPin: boolean;
  unlocked: boolean;
  toast: ToastState | null;
  setLocale: (locale: Locale) => void;
  setTheme: (themeId: ThemeId) => void;
  setCustomAccent: (hex: string | null) => void;
  setupPin: (pin: string) => void;
  verifyPin: (pin: string) => boolean;
  updatePin: (pin: string) => void;
  lockCoach: () => void;
  showToast: (message: string, tone?: 'info' | 'error') => void;
  dismissToast: () => void;
}

let toastTimeout: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppStoreState>((set, get) => ({
  locale: readInitialLocale(),
  themeId: readInitialTheme(),
  customAccent: readInitialAccent(),
  hasPin: hasStoredPin(),
  unlocked: readSessionUnlocked(),
  toast: null,

  setLocale: (locale) => {
    try {
      window.localStorage.setItem(LANG_KEY, locale);
    } catch {
      // Ignore
    }
    document.documentElement.setAttribute('lang', locale);
    set({ locale });
  },

  setTheme: (themeId) => {
    try {
      window.localStorage.setItem(THEME_KEY, themeId);
      window.localStorage.removeItem(ACCENT_KEY);
    } catch {
      // Ignore
    }
    applyThemeToDocument(themeId, null);
    set({ themeId, customAccent: null });
  },

  setCustomAccent: (hex) => {
    const normalized = normalizeHexColor(hex);
    try {
      if (normalized) {
        window.localStorage.setItem(ACCENT_KEY, normalized);
      } else {
        window.localStorage.removeItem(ACCENT_KEY);
      }
    } catch {
      // Ignore
    }
    applyThemeToDocument(get().themeId, normalized);
    set({ customAccent: normalized });
  },

  setupPin: (pin) => {
    try {
      window.localStorage.setItem(PIN_HASH_KEY, hashPin(pin));
      window.sessionStorage.setItem(SESSION_UNLOCK_KEY, '1');
    } catch {
      // Ignore
    }
    set({ hasPin: true, unlocked: true });
  },

  verifyPin: (pin) => {
    try {
      const stored = window.localStorage.getItem(PIN_HASH_KEY);
      if (stored && stored === hashPin(pin)) {
        window.sessionStorage.setItem(SESSION_UNLOCK_KEY, '1');
        set({ unlocked: true });
        return true;
      }
    } catch {
      // Ignore
    }
    return false;
  },

  updatePin: (pin) => {
    try {
      window.localStorage.setItem(PIN_HASH_KEY, hashPin(pin));
    } catch {
      // Ignore
    }
    set({ hasPin: true });
  },

  lockCoach: () => {
    try {
      window.sessionStorage.removeItem(SESSION_UNLOCK_KEY);
    } catch {
      // Ignore
    }
    set({ unlocked: false });
  },

  showToast: (message, tone = 'info') => {
    if (toastTimeout) clearTimeout(toastTimeout);
    set({ toast: { message, tone } });
    toastTimeout = setTimeout(() => set({ toast: null }), 3000);
  },

  dismissToast: () => {
    if (toastTimeout) clearTimeout(toastTimeout);
    set({ toast: null });
  },
}));
