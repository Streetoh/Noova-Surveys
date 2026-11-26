import { describe, expect, it } from 'vitest';
import {
  getContrastTextColor,
  normalizeHexColor,
  resolveThemeCssVars,
} from './theme.ts';

describe('theme utilities', () => {
  it('normalizes 3-digit and 6-digit hex colors and rejects invalid input', () => {
    expect(normalizeHexColor('#abc')).toBe('#AABBCC');
    expect(normalizeHexColor('  #b8ff2c ')).toBe('#B8FF2C');
    expect(normalizeHexColor('not-a-color')).toBeNull();
    expect(normalizeHexColor('#12345')).toBeNull();
  });

  it('picks high-contrast foreground text for bright vs dark accents', () => {
    expect(getContrastTextColor('#B8FF2C')).toBe('#0B0E14');
    expect(getContrastTextColor('#F59E0B')).toBe('#0B0E14');
    expect(getContrastTextColor('#FFFFFF')).toBe('#0B0E14');
    expect(getContrastTextColor('#2563EB')).toBe('#FFFFFF');
    expect(getContrastTextColor('#0F172A')).toBe('#FFFFFF');
    expect(getContrastTextColor('#7C3AED')).toBe('#FFFFFF');
  });

  it('resolves light-minimal preset and applies valid custom accent overrides', () => {
    const light = resolveThemeCssVars('light-minimal', null);
    expect(light.mode).toBe('light');
    expect(light.bg).toBe('#F4F6F9');
    expect(light.accent).toBe('#2563EB');
    expect(light.vars['--accent-text']).toBe('#FFFFFF');

    const custom = resolveThemeCssVars('carbon-blue', '#10b981');
    expect(custom.mode).toBe('dark');
    expect(custom.accent).toBe('#10B981');
    expect(custom.vars['--accent']).toBe('#10B981');

    const fallback = resolveThemeCssVars('club-emerald', 'invalid');
    expect(fallback.accent).toBe('#10B981');
  });
});
