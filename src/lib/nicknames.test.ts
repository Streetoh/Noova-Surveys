import { describe, expect, it } from 'vitest';
import { generateNickname } from './nicknames.ts';

describe('nicknames', () => {
  it('generates localized neutral nicknames in et, en, and ru', () => {
    const et = generateNickname('et', () => 0.1);
    const en = generateNickname('en', () => 0.2);
    const ru = generateNickname('ru', () => 0.3);

    expect(et.split(' ').length).toBe(3);
    expect(en.split(' ').length).toBe(3);
    expect(ru.split(' ').length).toBe(3);
    expect(/[А-Яа-яЁё]/.test(ru)).toBe(true);
  });
});
