import { describe, expect, it } from 'vitest';
import {
  clearSubmittedOnDevice,
  hasSubmittedOnDevice,
  isBlockedByAntispam,
  markSubmittedOnDevice,
  type StorageLike,
} from './antispam.ts';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}

describe('antispam device lock', () => {
  it('blocks repeat submissions when shared-device mode is OFF', () => {
    const storage = createMemoryStorage();
    expect(isBlockedByAntispam('survey_1', false, storage)).toBe(false);

    markSubmittedOnDevice('survey_1', storage, 12345);
    expect(hasSubmittedOnDevice('survey_1', storage)).toBe(true);
    expect(isBlockedByAntispam('survey_1', false, storage)).toBe(true);
    expect(isBlockedByAntispam('survey_2', false, storage)).toBe(false);
  });

  it('allows multiple submissions from same device when shared-device mode is ON', () => {
    const storage = createMemoryStorage();
    markSubmittedOnDevice('survey_1', storage, 12345);
    expect(isBlockedByAntispam('survey_1', true, storage)).toBe(false);

    clearSubmittedOnDevice('survey_1', storage);
    expect(hasSubmittedOnDevice('survey_1', storage)).toBe(false);
  });
});
