import type { SurveyResponse } from '../types/survey.ts';

export function normalizePlayerKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function sortPlayersAlphabetically(names: string[], locale = 'et'): string[] {
  return [...names].sort((a, b) => a.localeCompare(b, locale, { sensitivity: 'base' }));
}

export function parseAndMergePlayers(existing: string[], multilineInput: string, locale = 'et'): string[] {
  const seen = new Map<string, string>();
  for (const name of existing) {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (clean) seen.set(normalizePlayerKey(clean), clean);
  }

  const candidates = multilineInput
    .split(/[\r\n,;]+/)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter((line) => line.length > 0);

  for (const candidate of candidates) {
    const key = normalizePlayerKey(candidate);
    if (!seen.has(key)) {
      seen.set(key, candidate);
    }
  }

  return sortPlayersAlphabetically(Array.from(seen.values()), locale);
}

export interface RosterParticipation {
  answeredRoster: string[];
  missingRoster: string[];
  extraRespondents: string[];
}

export function computeRosterParticipation(
  roster: string[],
  responses: Pick<SurveyResponse, 'respondentName'>[],
  locale = 'et'
): RosterParticipation {
  const cleanRoster = sortPlayersAlphabetically(
    roster.map((n) => n.trim()).filter(Boolean),
    locale
  );
  const rosterByKey = new Map<string, string>();
  for (const player of cleanRoster) {
    rosterByKey.set(normalizePlayerKey(player), player);
  }

  const answeredRosterKeys = new Set<string>();
  const extraMap = new Map<string, string>();

  for (const resp of responses) {
    const rawName = (resp.respondentName || '').trim().replace(/\s+/g, ' ');
    if (!rawName) continue;
    const key = normalizePlayerKey(rawName);
    if (rosterByKey.has(key)) {
      answeredRosterKeys.add(key);
    } else if (!extraMap.has(key)) {
      extraMap.set(key, rawName);
    }
  }

  const answeredRoster: string[] = [];
  const missingRoster: string[] = [];

  for (const player of cleanRoster) {
    const key = normalizePlayerKey(player);
    if (answeredRosterKeys.has(key)) {
      answeredRoster.push(player);
    } else {
      missingRoster.push(player);
    }
  }

  return {
    answeredRoster,
    missingRoster,
    extraRespondents: sortPlayersAlphabetically(Array.from(extraMap.values()), locale),
  };
}
