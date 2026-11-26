import { describe, expect, it } from 'vitest';
import {
  calculateAverage,
  computeQuestionStats,
  exportSurveyResultsToCsv,
} from './analytics.ts';
import type { Question, Survey, SurveyResponse } from '../types/survey.ts';

describe('analytics & deletion recalculation', () => {
  it('recalculates averages and voter lists cleanly after deleting an individual response', () => {
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

    // Simulate coach deleting r2Duplicate
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

  it('exports choice labels cleanly in CSV', () => {
    expect(calculateAverage([])).toBeNull();
    const survey: Survey = {
      id: 's1',
      title: 'Trenn',
      description: '',
      teamTag: 'U12',
      status: 'active',
      isTemplate: false,
      allowMultipleFromSameDevice: false,
      questions: [
        {
          id: 'q1',
          type: 'choice',
          required: true,
          options: [
            { id: 'yes', label: { et: 'Jah', es: 'Sí' } },
            { id: 'no', label: { et: 'Ei', es: 'No' } },
          ],
          text: { et: 'Kas tuled?' },
        },
      ],
      responseCount: 1,
      createdAt: 1000,
      updatedAt: 1000,
    };
    const csv = exportSurveyResultsToCsv(
      survey,
      [{ id: 'r1', surveyId: 's1', respondentName: 'Oskar', locale: 'et', answers: { q1: 'yes' }, submittedAt: 1000 }],
      'es'
    );
    expect(csv).toContain('Sí');
  });
});
