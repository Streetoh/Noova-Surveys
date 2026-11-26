import type { Polarity } from '../types/survey.ts';

export type DialLevelKey = 'dial.level1' | 'dial.level2' | 'dial.level3' | 'dial.level4';

export function getNormalizedRatio(value: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function getDialLevelKey(value: number, min: number, max: number): DialLevelKey {
  const ratio = getNormalizedRatio(value, min, max);
  if (ratio <= 0.25) return 'dial.level1';
  if (ratio <= 0.55) return 'dial.level2';
  if (ratio <= 0.8) return 'dial.level3';
  return 'dial.level4';
}

export function getPolarityColor(ratio: number, polarity: Polarity = 'positive'): string {
  const r = Math.max(0, Math.min(1, ratio));
  if (polarity === 'neutral') {
    return r >= 0.5 ? '#B8FF2C' : '#60A5FA';
  }
  const effective = polarity === 'inverse' ? 1 - r : r;
  if (effective < 0.35) return '#FF5A5F';
  if (effective < 0.68) return '#F59E0B';
  return '#B8FF2C';
}

export function getPolarityGradientStops(polarity: Polarity = 'positive'): [string, string, string] {
  if (polarity === 'inverse') {
    return ['#B8FF2C', '#F59E0B', '#FF5A5F'];
  }
  if (polarity === 'neutral') {
    return ['#38BDF8', '#60A5FA', '#B8FF2C'];
  }
  return ['#FF5A5F', '#F59E0B', '#B8FF2C'];
}

export function parseQuickChipsInput(raw: string): string[] {
  const seen = new Set<string>();
  const chips: string[] = [];
  for (const part of raw.split(/[,;\r\n]+/)) {
    const clean = part.trim();
    if (!clean) continue;
    const key = clean.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      chips.push(clean);
    }
  }
  return chips;
}

export function toggleQuickChipInText(currentText: string, chip: string): string {
  const cleanChip = chip.trim();
  if (!cleanChip) return currentText;

  const parts = currentText
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const chipLower = cleanChip.toLocaleLowerCase();
  const existsIdx = parts.findIndex((p) => p.toLocaleLowerCase() === chipLower);

  if (existsIdx >= 0) {
    parts.splice(existsIdx, 1);
  } else {
    parts.push(cleanChip);
  }
  return parts.join(', ');
}

export function isQuickChipActiveInText(currentText: string, chip: string): boolean {
  const chipLower = chip.trim().toLocaleLowerCase();
  if (!chipLower) return false;
  return currentText
    .split(',')
    .map((p) => p.trim().toLocaleLowerCase())
    .includes(chipLower);
}
