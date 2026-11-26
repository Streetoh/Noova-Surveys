import { describe, expect, it } from 'vitest';
import {
  calculateAverage,
  computeQuestionStats,
  exportSurveyResultsToCsv,
  formatAnswerForDisplay,
} from './analytics.ts';
import { BODY_NONE_VALUE } from './bodymap.ts';
import type { Question, Survey, SurveyResponse } from '../types/survey.ts';

describe('analytics, bodymap stats & deletion recalculation', () => {
  it('recalculates independent numeric averages and voter lists cleanly after deleting an individual response', () => {
    const qRating: Question = { id: 'q1', type: 'rating10', required: true, text: { et: 'Raskus' } };
    const qChoice: Question = {
      id: 'q2',
      type: 'choice',
      required: true,
      multiSelect: true,
      text: { et: 'Valik' },
      options: [
        { id: 'yes', label: { et: 'Jah', es: 'Sí' } },
        { id: 'no', label: { et: 'Ei', es: 'No' } },
      ],
    };

    const r1: SurveyResponse = {
      id: 'r1',
      surveyId: 's1',
      respondentName: 'Markus',
      locale: 'et',
      answers: { q1: 10, q2: ['yes'] },
      submittedAt: 1000,
    };
    const r2Duplicate: SurveyResponse = {
      id: 'r2',
      surveyId: 's1',
      respondentName: 'Testiregistreering',
      locale: 'et',
      answers: { q1: 2, q2: ['no'] },
      submittedAt: 2000,
    };

    const beforeDelete = computeQuestionStats(qRating, [r1, r2Duplicate]);
    if (beforeDelete.type === 'rating10') {
      expect(beforeDelete.average).toBe(6);
      expect(beforeDelete.answeredCount).toBe(2);
    }

    const remaining = [r1, r2Duplicate].filter((r) => r.id !== 'r2');
    const afterDelete = computeQuestionStats(qRating, remaining);
    if (afterDelete.type === 'rating10') {
      expect(afterDelete.average).toBe(10);
      expect(afterDelete.answeredCount).toBe(1);
      expect(afterDelete.buckets[1].voters).toEqual([]);
      expect(afterDelete.buckets[9].voters).toEqual(['Markus']);
    }

    const choiceStats = computeQuestionStats(qChoice, remaining, 'es');
    expect(choiceStats.type).toBe('choice');
    if (choiceStats.type === 'choice') {
      expect(choiceStats.buckets[0].label).toBe('Sí');
      expect(choiceStats.buckets[0].voters).toEqual(['Markus']);
      expect(choiceStats.buckets[1].count).toBe(0);
    }
  });

  it('computes bodymap heatmap stats and exports localized bodymap + choice labels to CSV', () => {
    expect(calculateAverage([])).toBeNull();

    const qBody: Question = { id: 'q_body', type: 'bodymap', required: true, text: { et: 'Valu?' } };
    const qChoice: Question = {
      id: 'q_choice',
      type: 'choice',
      required: true,
      options: [
        { id: 'yes', label: { et: 'Jah', es: 'Sí' } },
        { id: 'no', label: { et: 'Ei', es: 'No' } },
      ],
      text: { et: 'Kas tuled?' },
    };

    const survey: Survey = {
      id: 's1',
      title: 'Trenn',
      description: '',
      teamTag: 'U12',
      status: 'active',
      isTemplate: false,
      allowMultipleFromSameDevice: false,
      questions: [qChoice, qBody],
      responseCount: 2,
      createdAt: 1000,
      updatedAt: 1000,
    };

    const responses: SurveyResponse[] = [
      { id: 'r1', surveyId: 's1', respondentName: 'Oskar', locale: 'es', answers: { q_choice: 'yes', q_body: ['knee_r'] }, submittedAt: 1000 },
      { id: 'r2', surveyId: 's1', respondentName: 'Hugo', locale: 'es', answers: { q_choice: 'no', q_body: [BODY_NONE_VALUE] }, submittedAt: 2000 },
    ];

    const bodyStats = computeQuestionStats(qBody, responses, 'es');
    expect(bodyStats.type).toBe('bodymap');
    if (bodyStats.type === 'bodymap') {
      expect(bodyStats.answeredCount).toBe(2);
      expect(bodyStats.allClearCount).toBe(1);
      expect(bodyStats.reportedZones[0].zoneId).toBe('knee_r');
    }

    const fakeT = (k: string) => (k === 'body.knee_r' ? 'Rodilla derecha' : k === 'body.allClear' ? 'Todo bien' : k);
    expect(formatAnswerForDisplay(qBody, ['knee_r'], 'es', fakeT)).toBe('Rodilla derecha');
    expect(formatAnswerForDisplay(qBody, [BODY_NONE_VALUE], 'es', fakeT)).toBe('Todo bien');

    const csv = exportSurveyResultsToCsv(survey, responses, 'es', fakeT);
    expect(csv).toContain('Sí');
    expect(csv).toContain('Rodilla derecha');
    expect(csv).toContain('Todo bien');
  });
});
