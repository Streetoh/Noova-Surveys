import type { Locale } from '../types/survey.ts';
import { en } from './en.ts';
import { es } from './es.ts';
import { et, type TranslationKey, type Translations } from './et.ts';
import { ru } from './ru.ts';

export const SUPPORTED_LOCALES: Locale[] = ['et', 'en', 'ru', 'es'];

export const DICTIONARIES: Record<Locale, Translations> = {
  et,
  en,
  ru,
  es,
};

export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES.et;
  let template = dict[key] ?? DICTIONARIES.et[key];
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      template = template.replaceAll(`{${k}}`, String(v));
    }
  }
  return template;
}

export function createTranslator(locale: Locale) {
  return (key: TranslationKey, params?: Record<string, string | number>) =>
    translate(locale, key, params);
}

export type { TranslationKey, Translations };
