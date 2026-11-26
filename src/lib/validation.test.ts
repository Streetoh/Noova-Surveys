import { describe, expect, it } from 'vitest';
import {
  canAdvanceQuestion,
  isSurveyEffectivelyClosed,
  isValidPin,
  pruneEmptyQuestions,
  resolveLocalizedText,
  stripUndefinedDeep,
  validateAllAnswers,
  validateSurveyDraft,
} from './validation.ts';
import type { Question } from '../types/survey.ts';

describe('validation', () => {
  it('resolves localized question text across et, en, ru, es with fallback', () => {
    const text = { et: 'Kuidas trenn läks?', en: '', ru: 'Как прошла тренировка?', es: '¿Qué tal el entreno?' };
    expect(resolveLocalizedText(text, 'et')).toBe('Kuidas trenn läks?');
    expect(resolveLocalizedText(text, 'en')).toBe('Kuidas trenn läks?');
    expect(resolveLocalizedText(text, 'ru')).toBe('Как прошла тренировка?');
    expect(resolveLocalizedText(text, 'es')).toBe('¿Qué tal el entreno?');
  });

  it('auto-prunes empty trailing questions and validates choice options', () => {
    const qFilled: Question = { id: 'q1', type: 'emoji5', required: true, text: { et: '¿Qué tal hoy?' } };
    const qBlank: Question = { id: 'q2', type: 'rating10', required: true, text: { et: '   ', en: '' } };

    expect(pruneEmptyQuestions([qFilled, qBlank])).toHaveLength(1);
    const check = validateSurveyDraft({ title: 'Post entreno', questions: [qFilled, qBlank] });
    expect(check.valid).toBe(true);
    expect(check.cleanedQuestions).toHaveLength(1);

    const invalidChoice: Question = {
      id: 'q3',
      type: 'choice',
      required: true,
      text: { et: 'Vali üks' },
      options: [{ id: 'o1', label: { et: 'Ainult üks' } }],
    };
    expect(validateSurveyDraft({ title: 'Test', questions: [invalidChoice] }).errorKey).toBe(
      'validation.choiceOptionsRequired'
    );
  });

  it('validates single and multi-select choice answers and auto-closes at closesAt deadline', () => {
    const choiceSingle: Question = {
      id: 'q1',
      type: 'choice',
      required: true,
      multiSelect: false,
      text: { et: 'Kas tuled?' },
      options: [
        { id: 'yes', label: { et: 'Jah' } },
        { id: 'no', label: { et: 'Ei' } },
      ],
    };
    const choiceMulti: Question = {
      ...choiceSingle,
      id: 'q2',
      multiSelect: true,
    };

    expect(canAdvanceQuestion(choiceSingle, undefined)).toBe(false);
    expect(canAdvanceQuestion(choiceSingle, 'yes')).toBe(true);
    expect(canAdvanceQuestion(choiceMulti, [])).toBe(false);
    expect(canAdvanceQuestion(choiceMulti, ['yes', 'no'])).toBe(true);
    expect(validateAllAnswers([choiceSingle, choiceMulti], { q1: 'yes', q2: ['no'] }).valid).toBe(true);

    // Auto-close deadline checks
    expect(isSurveyEffectivelyClosed({ status: 'active', closesAt: 5000 }, 4999)).toBe(false);
    expect(isSurveyEffectivelyClosed({ status: 'active', closesAt: 5000 }, 5000)).toBe(true);
    expect(isSurveyEffectivelyClosed({ status: 'active', closesAt: 5000 }, 6000)).toBe(true);
    expect(isSurveyEffectivelyClosed({ status: 'closed', closesAt: null }, 1000)).toBe(true);
  });

  it('validates 4-digit PINs and strips undefined fields for Firestore', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('12')).toBe(false);

    const cleaned = stripUndefinedDeep({
      title: 'Test',
      questions: [{ id: 'q1', type: 'text', text: { et: 'Hola', en: undefined }, min: undefined }],
    });
    expect('min' in cleaned.questions[0]).toBe(false);
  });
});
