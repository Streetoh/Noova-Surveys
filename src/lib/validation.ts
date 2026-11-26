import type { AnswerValue, ChoiceOption, Locale, LocalizedText, Question, Survey } from '../types/survey.ts';

export function resolveLocalizedText(text: LocalizedText | undefined, locale: Locale): string {
  if (!text) return '';
  const candidate = text[locale];
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate.trim();
  }
  for (const fallback of ['et', 'en', 'es', 'ru'] as const) {
    const val = text[fallback];
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }
  return '';
}

export function hasAnyQuestionText(question: Question): boolean {
  return resolveLocalizedText(question.text, 'et').length > 0;
}

export function pruneEmptyChoiceOptions(options: ChoiceOption[] | undefined): ChoiceOption[] {
  if (!Array.isArray(options)) return [];
  return options.filter((opt) => resolveLocalizedText(opt.label, 'et').length > 0);
}

export function pruneEmptyQuestions(questions: Question[]): Question[] {
  return questions
    .filter((q) => hasAnyQuestionText(q))
    .map((q) => (q.type === 'choice' ? { ...q, options: pruneEmptyChoiceOptions(q.options) } : q));
}

export function isSurveyExpired(
  survey: Pick<Survey, 'closesAt'>,
  now: number = Date.now()
): boolean {
  return typeof survey.closesAt === 'number' && Number.isFinite(survey.closesAt) && now >= survey.closesAt;
}

export function isSurveyEffectivelyClosed(
  survey: Pick<Survey, 'status' | 'closesAt'>,
  now: number = Date.now()
): boolean {
  if (survey.status !== 'active') return true;
  return isSurveyExpired(survey, now);
}

export function isAnswerProvided(question: Question, value: AnswerValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (question.type === 'text') {
    return typeof value === 'string' && value.trim().length > 0;
  }
  if (question.type === 'choice') {
    const validIds = new Set((question.options || []).map((o) => o.id));
    if (question.multiSelect) {
      return Array.isArray(value) && value.length > 0 && value.every((id) => validIds.has(id));
    }
    if (typeof value === 'string') {
      return value.trim().length > 0 && validIds.has(value);
    }
    return Array.isArray(value) && value.length === 1 && validIds.has(value[0]);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return false;
    if (question.type === 'rating10') return value >= 1 && value <= 10;
    if (question.type === 'emoji5') return value >= 1 && value <= 5;
    if (question.type === 'slider') {
      const min = question.min ?? 0;
      const max = question.max ?? 10;
      return value >= min && value <= max;
    }
  }
  return false;
}

export function canAdvanceQuestion(question: Question, value: AnswerValue | undefined): boolean {
  if (!question.required) return true;
  return isAnswerProvided(question, value);
}

export function validateAllAnswers(
  questions: Question[],
  answers: Record<string, AnswerValue | undefined>
): { valid: boolean; missingQuestionIds: string[] } {
  const missingQuestionIds: string[] = [];
  for (const q of questions) {
    if (q.required && !isAnswerProvided(q, answers[q.id])) {
      missingQuestionIds.push(q.id);
    }
  }
  return {
    valid: missingQuestionIds.length === 0,
    missingQuestionIds,
  };
}

export function validateSurveyDraft(survey: Pick<Survey, 'title' | 'questions'>): {
  valid: boolean;
  errorKey: string | null;
  cleanedQuestions: Question[];
} {
  if (!survey.title || survey.title.trim().length === 0) {
    return { valid: false, errorKey: 'validation.titleRequired', cleanedQuestions: survey.questions };
  }

  const cleanedQuestions = pruneEmptyQuestions(survey.questions);
  if (cleanedQuestions.length === 0) {
    return { valid: false, errorKey: 'validation.questionsRequired', cleanedQuestions: [] };
  }

  for (const q of cleanedQuestions) {
    if (q.type === 'slider') {
      const min = q.min ?? 0;
      const max = q.max ?? 10;
      if (min >= max) {
        return { valid: false, errorKey: 'validation.invalidSliderRange', cleanedQuestions };
      }
    }
    if (q.type === 'choice') {
      const opts = pruneEmptyChoiceOptions(q.options);
      if (opts.length < 2) {
        return { valid: false, errorKey: 'validation.choiceOptionsRequired', cleanedQuestions };
      }
    }
  }
  return { valid: true, errorKey: null, cleanedQuestions };
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        clean[key] = stripUndefinedDeep(val);
      }
    }
    return clean as T;
  }
  return value;
}
