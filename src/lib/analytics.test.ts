import { describe, expect, it } from 'vitest';
import {
  calculateAverage,
  computeQuestionStats,
  exportSurveyResultsToCsv,
  exportSurveyResultsToJson,
} from './analytics.ts';
import type { Question, Survey, SurveyResponse } from '../types/survey.ts';

describe('analytics', () => {
  it('computes averages with 2-decimal precision and handles empty arrays', () => {
    expect(calculateAverage([])).toBeNull();
    expect(calculateAverage([8, 9, 10])).toBe(9);
    expect(calculateAverage([7, 8, 8])).toBe(7.67);
  });

  it('computes distribution buckets for rating10, emoji5, slider 0-100 and text entries', () => {
    const qRating: Question = { id: 'q1', type: 'rating10', required: true, text: { et: 'Raskus' } };
    const qEmoji: Question = { id: 'q2', type: 'emoji5', required: true, text: { et: 'Tuju' } };
    const qSlider: Question = { id: 'q3', type: 'slider', required: true, min: 0, max: 100, text: { et: 'Energia' } };
    const qText: Question = { id: 'q4', type: 'text', required: false, text: { et: 'Kommentaar' } };

    const responses: SurveyResponse[] = [
      {
        id: 'r1',
        surveyId: 's1',
        respondentName: 'Markus',
        identityMode: 'name',
        locale: 'et',
        answers: { q1: 8, q2: 5, q3: 90, q4: 'Hea trenn!' },
        submittedAt: 1000,
      },
      {
        id: 'r2',
        surveyId: 's1',
        respondentName: 'Kiire Kotkas 42',
        identityMode: 'pseudonym',
        locale: 'et',
        answers: { q1: 6, q2: 4, q3: 45, q4: '  ' },
        submittedAt: 2000,
      },
    ];

    const ratingStats = computeQuestionStats(qRating, responses);
    expect(ratingStats.type).toBe('rating10');
    if (ratingStats.type !== 'text') {
      expect(ratingStats.average).toBe(7);
      expect(ratingStats.buckets).toHaveLength(10);
      expect(ratingStats.buckets[7].count).toBe(1);
    }

    const emojiStats = computeQuestionStats(qEmoji, responses);
    if (emojiStats.type !== 'text') {
      expect(emojiStats.average).toBe(4.5);
      expect(emojiStats.buckets).toHaveLength(5);
    }

    const sliderStats = computeQuestionStats(qSlider, responses);
    if (sliderStats.type !== 'text') {
      expect(sliderStats.average).toBe(67.5);
      expect(sliderStats.buckets).toHaveLength(5);
    }

    const textStats = computeQuestionStats(qText, responses);
    expect(textStats.type).toBe('text');
    if (textStats.type === 'text') {
      expect(textStats.answeredCount).toBe(1);
      expect(textStats.entries[0].respondentName).toBe('Markus');
    }
  });

  it('exports RFC-4180 CSV with UTF-8 BOM and valid JSON', () => {
    const survey: Survey = {
      id: 's1',
      title: 'Trenn',
      description: '',
      teamTag: 'U12',
      status: 'active',
      isTemplate: false,
      allowIdentityChoice: true,
      allowMultipleFromSameDevice: false,
      questions: [{ id: 'q1', type: 'text', required: true, text: { et: 'Kuidas läks?' } }],
      responseCount: 1,
      createdAt: 1000,
      updatedAt: 1000,
    };
    const responses: SurveyResponse[] = [
      {
        id: 'r1',
        surveyId: 's1',
        respondentName: 'Oskar',
        identityMode: 'name',
        locale: 'et',
        answers: { q1: 'Väga hea, "super" trenn' },
        submittedAt: 1700000000000,
      },
    ];

    const csv = exportSurveyResultsToCsv(survey, responses, 'et');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Väga hea, ""super"" trenn"');

    const json = JSON.parse(exportSurveyResultsToJson(survey, responses));
    expect(json.totalResponses).toBe(1);
    expect(json.survey.id).toBe('s1');
  });
});
