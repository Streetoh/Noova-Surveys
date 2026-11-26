import type { AnswerValue, Locale, Question, Survey, SurveyResponse } from '../types/survey.ts';
import { resolveLocalizedText } from './validation.ts';

export interface DistributionBucket {
  label: string;
  value: number;
  count: number;
  percentage: number;
  voters: string[];
}

export interface NumericQuestionStats {
  type: 'slider' | 'rating10' | 'emoji5';
  answeredCount: number;
  average: number | null;
  min: number;
  max: number;
  buckets: DistributionBucket[];
}

export interface ChoiceOptionBucket {
  optionId: string;
  label: string;
  count: number;
  percentage: number;
  voters: string[];
}

export interface ChoiceQuestionStats {
  type: 'choice';
  answeredCount: number;
  buckets: ChoiceOptionBucket[];
}

export interface TextResponseEntry {
  responseId: string;
  respondentName: string;
  text: string;
  submittedAt: number;
}

export interface TextQuestionStats {
  type: 'text';
  answeredCount: number;
  entries: TextResponseEntry[];
}

export type QuestionStats = NumericQuestionStats | ChoiceQuestionStats | TextQuestionStats;

export function calculateAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

function extractSelectedOptionIds(raw: AnswerValue | undefined): string[] {
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string' && v.length > 0);
  if (typeof raw === 'string' && raw.length > 0) return [raw];
  return [];
}

export function formatAnswerForDisplay(
  question: Question,
  raw: AnswerValue | undefined,
  locale: Locale
): string {
  if (raw === undefined || raw === null || raw === '') return '—';
  if (question.type === 'choice') {
    const selected = extractSelectedOptionIds(raw);
    if (selected.length === 0) return '—';
    const optionMap = new Map((question.options || []).map((o) => [o.id, resolveLocalizedText(o.label, locale)]));
    return selected.map((id) => optionMap.get(id) || id).join(', ');
  }
  return String(raw);
}

export function computeQuestionStats(
  question: Question,
  responses: SurveyResponse[],
  locale: Locale = 'et'
): QuestionStats {
  if (question.type === 'text') {
    const entries: TextResponseEntry[] = [];
    for (const r of responses) {
      const raw = r.answers[question.id];
      if (typeof raw === 'string' && raw.trim().length > 0) {
        entries.push({
          responseId: r.id,
          respondentName: r.respondentName,
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

  if (question.type === 'choice') {
    const options = question.options || [];
    let answeredCount = 0;
    const votersByOption = new Map<string, string[]>();
    for (const opt of options) {
      votersByOption.set(opt.id, []);
    }

    for (const r of responses) {
      const selected = extractSelectedOptionIds(r.answers[question.id]).filter((id) =>
        votersByOption.has(id)
      );
      if (selected.length > 0) {
        answeredCount += 1;
        for (const optId of selected) {
          votersByOption.get(optId)!.push(r.respondentName);
        }
      }
    }

    const buckets: ChoiceOptionBucket[] = options.map((opt) => {
      const voters = votersByOption.get(opt.id) || [];
      return {
        optionId: opt.id,
        label: resolveLocalizedText(opt.label, locale),
        count: voters.length,
        percentage: answeredCount > 0 ? Math.round((voters.length / answeredCount) * 100) : 0,
        voters,
      };
    });

    return {
      type: 'choice',
      answeredCount,
      buckets,
    };
  }

  const votePairs: { value: number; name: string }[] = [];
  for (const r of responses) {
    const raw = r.answers[question.id];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      votePairs.push({ value: raw, name: r.respondentName });
    }
  }

  const numericValues = votePairs.map((p) => p.value);
  const min = question.type === 'emoji5' ? 1 : question.type === 'rating10' ? 1 : (question.min ?? 0);
  const max = question.type === 'emoji5' ? 5 : question.type === 'rating10' ? 10 : (question.max ?? 10);
  const range = max - min + 1;

  let buckets: DistributionBucket[];
  if (range <= 12) {
    buckets = [];
    for (let v = min; v <= max; v += 1) {
      const matching = votePairs.filter((p) => p.value === v);
      const count = matching.length;
      buckets.push({
        label: String(v),
        value: v,
        count,
        percentage: numericValues.length > 0 ? Math.round((count / numericValues.length) * 100) : 0,
        voters: matching.map((p) => p.name),
      });
    }
  } else {
    const binCount = 5;
    const step = (max - min) / binCount;
    buckets = Array.from({ length: binCount }, (_, idx) => {
      const low = Math.round(min + idx * step);
      const high = idx === binCount - 1 ? max : Math.round(min + (idx + 1) * step) - 1;
      const matching = votePairs.filter((p) => p.value >= low && p.value <= high);
      const count = matching.length;
      return {
        label: `${low}–${high}`,
        value: low,
        count,
        percentage: numericValues.length > 0 ? Math.round((count / numericValues.length) * 100) : 0,
        voters: matching.map((p) => p.name),
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
    'Language',
    ...survey.questions.map((q, idx) => `${idx + 1}. ${resolveLocalizedText(q.text, locale)}`),
  ];

  const rows = responses.map((r) => [
    new Date(r.submittedAt).toISOString(),
    r.respondentName,
    r.locale,
    ...survey.questions.map((q) => {
      const raw = r.answers[q.id];
      if (raw === undefined || raw === null) return '';
      if (q.type === 'choice') return formatAnswerForDisplay(q, raw, locale);
      return raw;
    }),
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
