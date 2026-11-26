import { describe, expect, it } from 'vitest';
import { DICTIONARIES, SUPPORTED_LOCALES, translate } from './index.ts';

describe('i18n dictionary parity (et, en, ru)', () => {
  const baseKeys = Object.keys(DICTIONARIES.et).sort();

  it('has identical keys and non-empty values across et, en, and ru', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const dict = DICTIONARIES[locale];
      const keys = Object.keys(dict).sort();
      expect(keys).toEqual(baseKeys);

      for (const key of keys) {
        const value = dict[key as keyof typeof dict];
        expect(typeof value).toBe('string');
        expect(value.trim().length, `Empty key "${key}" in "${locale}"`).toBeGreaterThan(0);
      }
    }
  });

  it('interpolates parameters across all 3 locales', () => {
    expect(translate('et', 'player.progress', { current: 2, total: 5 })).toBe('Küsimus 2 / 5');
    expect(translate('en', 'player.progress', { current: 2, total: 5 })).toBe('Question 2 of 5');
    expect(translate('ru', 'player.progress', { current: 2, total: 5 })).toBe('Вопрос 2 из 5');
  });
});
