const SUBMITTED_PREFIX = 'pps_submitted_v1_';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getDefaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function hasSubmittedOnDevice(
  surveyId: string,
  storage: StorageLike | null = getDefaultStorage()
): boolean {
  if (!storage || !surveyId) return false;
  return storage.getItem(`${SUBMITTED_PREFIX}${surveyId}`) !== null;
}

export function markSubmittedOnDevice(
  surveyId: string,
  storage: StorageLike | null = getDefaultStorage(),
  now: number = Date.now()
): void {
  if (!storage || !surveyId) return;
  try {
    storage.setItem(`${SUBMITTED_PREFIX}${surveyId}`, String(now));
  } catch {
    // Ignore storage quota issues in restricted mobile browsers
  }
}

export function clearSubmittedOnDevice(
  surveyId: string,
  storage: StorageLike | null = getDefaultStorage()
): void {
  if (!storage || !surveyId) return;
  try {
    storage.removeItem(`${SUBMITTED_PREFIX}${surveyId}`);
  } catch {
    // Ignore
  }
}

export function isBlockedByAntispam(
  surveyId: string,
  allowMultipleFromSameDevice: boolean,
  storage: StorageLike | null = getDefaultStorage()
): boolean {
  if (allowMultipleFromSameDevice) return false;
  return hasSubmittedOnDevice(surveyId, storage);
}
