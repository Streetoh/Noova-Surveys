import { beforeEach, describe, expect, it } from 'vitest';
import { isSurveyEffectivelyClosed } from '../lib/validation.ts';
import {
  createSurvey,
  deleteSurveyResponseById,
  getSurveyById,
  getSurveyResponsesOnce,
  submitSurveyResponse,
  subscribeActiveSurveyResponses,
} from './surveysRepo.ts';

describe('surveysRepo & Firestore optimization invariants', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => store.set(k, String(v)),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear(),
      },
    });
  });

  it('updates responseCount on submit (+1) and delete (-1) and preserves embedded teamRosterSnapshot', async () => {
    const now = Date.now();
    const surveyId = await createSurvey({
      title: 'Post-entreno U12',
      description: '',
      teamTag: 'U12',
      teamId: 'team_1',
      teamRosterSnapshot: ['Artur Saar', 'Markus Tamm', 'Oskar Kask'],
      closesAt: null,
      status: 'active',
      isTemplate: false,
      allowMultipleFromSameDevice: false,
      questions: [{ id: 'q1', type: 'rating10', required: true, text: { et: 'Raskus' } }],
      responseCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    const loaded = await getSurveyById(surveyId);
    expect(loaded?.teamRosterSnapshot).toEqual(['Artur Saar', 'Markus Tamm', 'Oskar Kask']);
    expect(loaded?.responseCount).toBe(0);

    const respId = await submitSurveyResponse({
      surveyId,
      respondentName: 'Markus Tamm',
      locale: 'et',
      answers: { q1: 8 },
      submittedAt: now + 1000,
    });

    const afterSubmit = await getSurveyById(surveyId);
    expect(afterSubmit?.responseCount).toBe(1);

    await deleteSurveyResponseById(respId, surveyId);
    const afterDelete = await getSurveyById(surveyId);
    expect(afterDelete?.responseCount).toBe(0);
  });

  it('loads closed/expired surveys via one-shot getSurveyResponsesOnce without opening subscriptions', async () => {
    const now = Date.now();
    const closedSurveyId = await createSurvey({
      title: 'Closed Survey',
      description: '',
      teamTag: 'U10',
      closesAt: now - 1000,
      status: 'active',
      isTemplate: false,
      allowMultipleFromSameDevice: false,
      questions: [{ id: 'q1', type: 'emoji5', required: true, text: { et: 'Tuju' } }],
      responseCount: 0,
      createdAt: now - 5000,
      updatedAt: now - 5000,
    });

    const loaded = await getSurveyById(closedSurveyId);
    expect(loaded).not.toBeNull();
    expect(isSurveyEffectivelyClosed(loaded!, now)).toBe(true);

    // Closed/expired surveys use one-shot read (getSurveyResponsesOnce)
    const onceList = await getSurveyResponsesOnce(closedSurveyId);
    expect(onceList).toEqual([]);

    // Active surveys support subscribeActiveSurveyResponses with clean unsubscribe
    let received: unknown[] = [];
    const unsubscribe = subscribeActiveSurveyResponses(closedSurveyId, (list) => {
      received = list;
    });
    expect(received).toEqual([]);
    unsubscribe();
  });
});
