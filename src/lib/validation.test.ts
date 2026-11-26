import { describe, expect, it } from 'vitest';
import {
  canAdvanceQuestion,
  isValidPin,
  resolveLocalizedText,
  stripUndefinedDeep,
  validateAllAnswers,
  validateSurveyDraft,
} from './validation.ts';
import type { Question } from '../types/survey.ts';

describe('validation', () => {
  it('resolves localized question text with automatic fallback to base Estonian', () => {
    const text = { et: 'Kuidas trenn läks?', en: '', ru: 'Как прошла тренировка?' };
    expect(resolveLocalizedText(text, 'et')).toBe('Kuidas trenn läks?');
    expect(resolveLocalizedText(text, 'en')).toBe('Kuidas trenn läks?');
    expect(resolveLocalizedText(text, 'ru')).toBe('Как прошла тренировка?');
  });

  it('enforces required answers and allows skipping optional questions', () => {
    const requiredText: Question = { id: 'q1', type: 'text', required: true, text: { et: 'Nimi' } };
    const optionalText: Question = { id: 'q2', type: 'text', required: false, text: { et: 'Märkus' } };
    const requiredEmoji: Question = { id: 'q3', type: 'emoji5', required: true, text: { et: 'Tuju' } };

    expect(canAdvanceQuestion(requiredText, '')).toBe(false);
    expect(canAdvanceQuestion(requiredText, '   ')).toBe(false);
    expect(canAdvanceQuestion(requiredText, 'Hea')).toBe(true);
    expect(canAdvanceQuestion(optionalText, undefined)).toBe(true);
    expect(canAdvanceQuestion(requiredEmoji, 0)).toBe(false);
    expect(canAdvanceQuestion(requiredEmoji, 3)).toBe(true);

    const check = validateAllAnswers([requiredText, optionalText, requiredEmoji], { q1: 'OK' });
    expect(check.valid).toBe(false);
    expect(check.missingQuestionIds).toEqual(['q3']);
  });

  it('validates survey drafts and 4-digit PINs', () => {
    expect(validateSurveyDraft({ title: '', questions: [] }).valid).toBe(false);
    expect(
      validateSurveyDraft({
        title: 'Test',
        questions: [{ id: 'q1', type: 'slider', required: true, min: 10, max: 5, text: { et: 'A' } }],
      }).errorKey
    ).toBe('validation.invalidSliderRange');

    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('abcd')).toBe(false);
  });

  it('strips nested undefined fields so Firestore addDoc/updateDoc never fails', () => {
    const dirty = {
      title: 'Test',
      questions: [
        {
          id: 'q1',
          type: 'text',
          text: { et: 'Hola', en: undefined },
          min: undefined,
          max: undefined,
          minLabel: undefined,
        },
      ],
    };
    const cleaned = stripUndefinedDeep(dirty);
    expect('min' in cleaned.questions[0]).toBe(false);
    expect('max' in cleaned.questions[0]).toBe(false);
    expect('minLabel' in cleaned.questions[0]).toBe(false);
    expect('en' in cleaned.questions[0].text).toBe(false);
    expect(cleaned.questions[0].text.et).toBe('Hola');
  });
});
