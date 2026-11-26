import type { Locale, Question, Survey, SurveyResponse } from '../types/survey.ts';
import { resolveLocalizedText } from './validation.ts';

export interface DistributionBucket {
  label: string;
  value: number;
  count: number;
  percentage: number;
}

export interface NumericQuestionStats {
  type: 'slider' | 'rating10' | 'emoji5';
  answeredCount: number;
  average: number | null;
  min: number;
  max: number;
  buckets: DistributionBucket[];
}

export interface TextResponseEntry {
  responseId: string;
  respondentName: string;
  identityMode: 'name' | 'pseudonym';
  text: string;
  submittedAt: number;
}

export interface TextQuestionStats {
  type: 'text';
  answeredCount: number;
  entries: TextResponseEntry[];
}

export type QuestionStats = NumericQuestionStats | TextQuestionStats;

export function calculateAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

export function computeQuestionStats(
  question: Question,
  responses: SurveyResponse[]
): QuestionStats {
  if (question.type === 'text') {
    const entries: TextResponseEntry[] = [];
    for (const r of responses) {
      const raw = r.answers[question.id];
      if (typeof raw === 'string' && raw.trim().length > 0) {
        entries.push({
          responseId: r.id,
          respondentName: r.respondentName,
          identityMode: r.identityMode,
          text: raw.trim(),
          submittedAt: r.submittedAt,
        });
      }
    }
    entries.sort((a, b) => b.submittedAt - a.submittedAt);
    return {
      type: 'text',
      answeredCount: entries.length,
      entries,
    };
  }

  const numericValues: number[] = [];
  for (const r of responses) {
    const raw = r.answers[question.id];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      numericValues.push(raw);
    }
  }

  const min = question.type === 'emoji5' ? 1 : question.type === 'rating10' ? 1 : (question.min ?? 1);
  const max = question.type === 'emoji5' ? 5 : question.type === 'rating10' ? 10 : (question.max ?? 10);
  const range = max - min + 1;

  let buckets: DistributionBucket[];
  if (range <= 12) {
    buckets = [];
    for (let v = min; v <= max; v += 1) {
      const count = numericValues.filter((n) => n === v).length;
      buckets.push({
        label: String(v),
        value: v,
        count,
        percentage: numericValues.length > 0 ? Math.round((count / numericValues.length) * 100) : 0,
      });
    }
  } else {
    // Group larger slider ranges (e.g. 0-100) into 5 clean intervals
    const binCount = 5;
    const step = (max - min) / binCount;
    buckets = Array.from({ length: binCount }, (_, idx) => {
      const low = Math.round(min + idx * step);
      const high = idx === binCount - 1 ? max : Math.round(min + (idx + 1) * step) - 1;
      const count = numericValues.filter((n) =>
        idx === binCount - 1 ? n >= low && n <= high : n >= low && n <= high
      ).length;
      return {
        label: `${low}–${high}`,
        value: low,
        count,
        percentage: numericValues.length > 0 ? Math.round((count / numericValues.length) * 100) : 0,
      };
    });
  }

  return {
    type: question.type,
    answeredCount: numericValues.length,
    average: calculateAverage(numericValues),
    min,
    max,
    buckets,
  };
}

export function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportSurveyResultsToCsv(
  survey: Survey,
  responses: SurveyResponse[],
  locale: Locale
): string {
  const headers = [
    'Submitted At',
    'Player',
    'Identity Mode',
    'Language',
    ...survey.questions.map((q, idx) => `${idx + 1}. ${resolveLocalizedText(q.text, locale)}`),
  ];

  const rows = responses.map((r) => [
    new Date(r.submittedAt).toISOString(),
    r.respondentName,
    r.identityMode,
    r.locale,
    ...survey.questions.map((q) => r.answers[q.id] ?? ''),
  ]);

  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];

  return `\uFEFF${lines.join('\r\n')}`;
}

export function exportSurveyResultsToJson(survey: Survey, responses: SurveyResponse[]): string {
  return JSON.stringify(
    {
      survey: {
        id: survey.id,
        title: survey.title,
        teamTag: survey.teamTag,
        status: survey.status,
      },
      exportedAt: new Date().toISOString(),
      totalResponses: responses.length,
      responses,
    },
    null,
    2
  );
}
