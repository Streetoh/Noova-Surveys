import type { AnswerValue, Locale, LocalizedText, Question, Survey } from '../types/survey.ts';

export function resolveLocalizedText(text: LocalizedText | undefined, locale: Locale): string {
  if (!text) return '';
  const candidate = text[locale];
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate.trim();
  }
  if (typeof text.et === 'string' && text.et.trim().length > 0) {
    return text.et.trim();
  }
  if (typeof text.en === 'string' && text.en.trim().length > 0) {
    return text.en.trim();
  }
  if (typeof text.ru === 'string' && text.ru.trim().length > 0) {
    return text.ru.trim();
  }
  return '';
}

export function isAnswerProvided(question: Question, value: AnswerValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (question.type === 'text') {
    return typeof value === 'string' && value.trim().length > 0;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return false;
    if (question.type === 'rating10') return value >= 1 && value <= 10;
    if (question.type === 'emoji5') return value >= 1 && value <= 5;
    if (question.type === 'slider') {
      const min = question.min ?? 1;
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
} {
  if (!survey.title || survey.title.trim().length === 0) {
    return { valid: false, errorKey: 'validation.titleRequired' };
  }
  if (!Array.isArray(survey.questions) || survey.questions.length === 0) {
    return { valid: false, errorKey: 'validation.questionsRequired' };
  }
  for (const q of survey.questions) {
    if (!resolveLocalizedText(q.text, 'et')) {
      return { valid: false, errorKey: 'validation.questionTextRequired' };
    }
    if (q.type === 'slider') {
      const min = q.min ?? 1;
      const max = q.max ?? 10;
      if (min >= max) {
        return { valid: false, errorKey: 'validation.invalidSliderRange' };
      }
    }
  }
  return { valid: true, errorKey: null };
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
