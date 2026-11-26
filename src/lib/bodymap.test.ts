import { describe, expect, it } from 'vitest';
import {
  BODY_NONE_VALUE,
  BODY_ZONES,
  computeBodyMapHeatmap,
  isAllClearSelected,
  isBodyMapAnswered,
  selectBodyAllClear,
  toggleBodyZoneSelection,
} from './bodymap.ts';
import type { SurveyResponse } from '../types/survey.ts';

describe('bodymap domain', () => {
  it('defines all 15 independent zones including left/right knees', () => {
    expect(BODY_ZONES).toHaveLength(15);
    const ids = BODY_ZONES.map((z) => z.id);
    expect(ids).toContain('knee_r');
    expect(ids).toContain('knee_l');
    expect(ids).toContain('hamstring_r');
    expect(ids).toContain('hamstring_l');
    expect(ids).toContain('back');
  });

  it('toggles zones, clears when selecting none, and switches back cleanly', () => {
    let ans = toggleBodyZoneSelection(undefined, 'knee_r');
    expect(ans).toEqual(['knee_r']);
    ans = toggleBodyZoneSelection(ans, 'calf_l');
    expect(ans).toEqual(['knee_r', 'calf_l']);
    expect(isBodyMapAnswered(ans)).toBe(true);
    expect(isAllClearSelected(ans)).toBe(false);

    ans = selectBodyAllClear();
    expect(ans).toEqual([BODY_NONE_VALUE]);
    expect(isBodyMapAnswered(ans)).toBe(true);
    expect(isAllClearSelected(ans)).toBe(true);

    // Selecting a zone removes BODY_NONE_VALUE automatically
    ans = toggleBodyZoneSelection(ans, 'ankle_r');
    expect(ans).toEqual(['ankle_r']);
    expect(isAllClearSelected(ans)).toBe(false);

    // Toggling off the only zone results in unanswered empty array
    ans = toggleBodyZoneSelection(ans, 'ankle_r');
    expect(ans).toEqual([]);
    expect(isBodyMapAnswered(ans)).toBe(false);
  });

  it('aggregates heatmap counts, scaled intensity and sorted voters descending', () => {
    const responses: SurveyResponse[] = [
      {
        id: 'r1',
        surveyId: 's1',
        respondentName: 'Markus',
        locale: 'et',
        answers: { q_body: ['knee_r', 'calf_r'] },
        submittedAt: 1000,
      },
      {
        id: 'r2',
        surveyId: 's1',
        respondentName: 'Oskar',
        locale: 'et',
        answers: { q_body: ['knee_r'] },
        submittedAt: 2000,
      },
      {
        id: 'r3',
        surveyId: 's1',
        respondentName: 'Artur',
        locale: 'et',
        answers: { q_body: [BODY_NONE_VALUE] },
        submittedAt: 3000,
      },
    ];

    const heatmap = computeBodyMapHeatmap('q_body', responses);
    expect(heatmap.answeredCount).toBe(3);
    expect(heatmap.allClearCount).toBe(1);
    expect(heatmap.allClearVoters).toEqual(['Artur']);
    expect(heatmap.reportedZones).toHaveLength(2);
    expect(heatmap.reportedZones[0].zoneId).toBe('knee_r');
    expect(heatmap.reportedZones[0].count).toBe(2);
    expect(heatmap.reportedZones[0].intensity).toBe(1);
    expect(heatmap.reportedZones[0].voters).toEqual(['Markus', 'Oskar']);
    expect(heatmap.reportedZones[1].zoneId).toBe('calf_r');
    expect(heatmap.reportedZones[1].count).toBe(1);
    expect(heatmap.reportedZones[1].intensity).toBe(0.5);
  });
});
