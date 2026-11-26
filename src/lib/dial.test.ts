import { describe, expect, it } from 'vitest';
import {
  getDialLevelKey,
  getPolarityColor,
  getPolarityGradientStops,
  isQuickChipActiveInText,
  parseQuickChipsInput,
  toggleQuickChipInText,
} from './dial.ts';

describe('dial & quick chips helpers', () => {
  it('maps values across all 4 dial intensity brackets', () => {
    expect(getDialLevelKey(1, 1, 10)).toBe('dial.level1');
    expect(getDialLevelKey(5, 0, 10)).toBe('dial.level2');
    expect(getDialLevelKey(8, 0, 10)).toBe('dial.level3');
    expect(getDialLevelKey(10, 1, 10)).toBe('dial.level4');
  });

  it('computes Athletic Volt polarity colors & gradient stops', () => {
    expect(getPolarityColor(0.9, 'positive')).toBe('#B8FF2C');
    expect(getPolarityColor(0.1, 'positive')).toBe('#FF5A5F');
    expect(getPolarityColor(0.9, 'inverse')).toBe('#FF5A5F');
    expect(getPolarityColor(0.1, 'inverse')).toBe('#B8FF2C');
    expect(getPolarityColor(0.2, 'neutral')).toBe('#60A5FA');
    expect(getPolarityGradientStops('inverse')).toEqual(['#B8FF2C', '#F59E0B', '#FF5A5F']);
  });

  it('parses and idempotently toggles quick chips in open text answers', () => {
    expect(parseQuickChipsInput('Tiros, 1v1; Tiros\nPases')).toEqual(['Tiros', '1v1', 'Pases']);

    let text = '';
    text = toggleQuickChipInText(text, 'Tiros');
    expect(text).toBe('Tiros');
    expect(isQuickChipActiveInText(text, 'tiros')).toBe(true);

    text = toggleQuickChipInText(text, '1v1');
    expect(text).toBe('Tiros, 1v1');

    text = toggleQuickChipInText(text, 'Tiros');
    expect(text).toBe('1v1');
    expect(isQuickChipActiveInText(text, 'Tiros')).toBe(false);
  });
});
