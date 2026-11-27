import type { AnswerValue, BodyZoneId, SurveyResponse } from '../types/survey.ts';

export const BODY_NONE_VALUE = 'none';

export interface BodyZoneMeta {
  id: BodyZoneId;
  translationKey: `body.${BodyZoneId}`;
  views: ('front' | 'back')[];
}

export const BODY_ZONES: BodyZoneMeta[] = [
  { id: 'shoulder_r', translationKey: 'body.shoulder_r', views: ['front', 'back'] },
  { id: 'shoulder_l', translationKey: 'body.shoulder_l', views: ['front', 'back'] },
  { id: 'back', translationKey: 'body.back', views: ['back'] },
  { id: 'hip_r', translationKey: 'body.hip_r', views: ['front', 'back'] },
  { id: 'hip_l', translationKey: 'body.hip_l', views: ['front', 'back'] },
  { id: 'quad_r', translationKey: 'body.quad_r', views: ['front'] },
  { id: 'quad_l', translationKey: 'body.quad_l', views: ['front'] },
  { id: 'hamstring_r', translationKey: 'body.hamstring_r', views: ['back'] },
  { id: 'hamstring_l', translationKey: 'body.hamstring_l', views: ['back'] },
  { id: 'knee_r', translationKey: 'body.knee_r', views: ['front', 'back'] },
  { id: 'knee_l', translationKey: 'body.knee_l', views: ['front', 'back'] },
  { id: 'calf_r', translationKey: 'body.calf_r', views: ['front', 'back'] },
  { id: 'calf_l', translationKey: 'body.calf_l', views: ['front', 'back'] },
  { id: 'ankle_r', translationKey: 'body.ankle_r', views: ['front', 'back'] },
  { id: 'ankle_l', translationKey: 'body.ankle_l', views: ['front', 'back'] },
];

export const VALID_BODY_ZONE_IDS = new Set<string>(BODY_ZONES.map((z) => z.id));

export function isBodyZoneId(value: string): value is BodyZoneId {
  return VALID_BODY_ZONE_IDS.has(value);
}

export function normalizeBodyAnswer(value: AnswerValue | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && (v === BODY_NONE_VALUE || isBodyZoneId(v)));
}

export function isBodyMapAnswered(value: AnswerValue | undefined): boolean {
  return normalizeBodyAnswer(value).length > 0;
}

export function isAllClearSelected(value: AnswerValue | undefined): boolean {
  const arr = normalizeBodyAnswer(value);
  return arr.length === 1 && arr[0] === BODY_NONE_VALUE;
}

export function toggleBodyZoneSelection(current: AnswerValue | undefined, zoneId: BodyZoneId): string[] {
  const existing = normalizeBodyAnswer(current).filter((v) => v !== BODY_NONE_VALUE);
  if (existing.includes(zoneId)) {
    return existing.filter((v) => v !== zoneId);
  }
  return [...existing, zoneId];
}

export function selectBodyAllClear(): string[] {
  return [BODY_NONE_VALUE];
}

export interface BodyZoneStat {
  zoneId: BodyZoneId;
  count: number;
  percentage: number;
  intensity: number; // 0..1 scaled against max count for heatmap opacity
  voters: string[];
}

export interface BodyMapHeatmapStats {
  answeredCount: number;
  allClearCount: number;
  allClearVoters: string[];
  zones: BodyZoneStat[]; // All 15 zones
  reportedZones: BodyZoneStat[]; // Only count > 0, sorted descending
}

export function computeBodyMapHeatmap(
  questionId: string,
  responses: SurveyResponse[]
): BodyMapHeatmapStats {
  let answeredCount = 0;
  const allClearVoters: string[] = [];
  const votersByZone = new Map<BodyZoneId, string[]>();

  for (const z of BODY_ZONES) {
    votersByZone.set(z.id, []);
  }

  for (const r of responses) {
    const selected = normalizeBodyAnswer(r.answers[questionId]);
    if (selected.length === 0) continue;
    answeredCount += 1;

    if (selected.includes(BODY_NONE_VALUE)) {
      allClearVoters.push(r.respondentName);
      continue;
    }

    for (const item of selected) {
      if (isBodyZoneId(item)) {
        votersByZone.get(item)!.push(r.respondentName);
      }
    }
  }

  let maxCount = 0;
  for (const voters of votersByZone.values()) {
    if (voters.length > maxCount) maxCount = voters.length;
  }

  const zones: BodyZoneStat[] = BODY_ZONES.map((z) => {
    const voters = votersByZone.get(z.id) || [];
    const count = voters.length;
    return {
      zoneId: z.id,
      count,
      percentage: answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0,
      intensity: maxCount > 0 ? count / maxCount : 0,
      voters,
    };
  });

  const reportedZones = zones
    .filter((z) => z.count > 0)
    .sort((a, b) => b.count - a.count || a.zoneId.localeCompare(b.zoneId));

  return {
    answeredCount,
    allClearCount: allClearVoters.length,
    allClearVoters,
    zones,
    reportedZones,
  };
}
