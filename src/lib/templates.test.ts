import { describe, expect, it } from 'vitest';
import { changeQuestionType, createEmptyQuestion, STARTER_TEMPLATES } from './templates.ts';

describe('changeQuestionType', () => {
  it('preserves id and custom text while initializing type-specific defaults', () => {
    const original = {
      ...createEmptyQuestion('emoji5'),
      id: 'q_custom_1',
      text: { et: 'Kuidas läks?', en: 'How did it go?' },
      highlightInSummary: true,
    };

    const asChoice = changeQuestionType(original, 'choice');
    expect(asChoice.id).toBe('q_custom_1');
    expect(asChoice.text.et).toBe('Kuidas läks?');
    expect(asChoice.highlightInSummary).toBeUndefined();
    expect(asChoice.options?.length).toBe(2);
    expect(asChoice.polarity).toBeUndefined();

    const asSlider = changeQuestionType(asChoice, 'slider');
    expect(asSlider.id).toBe('q_custom_1');
    expect(asSlider.min).toBe(0);
    expect(asSlider.max).toBe(10);
    expect(asSlider.polarity).toBe('positive');
    expect(asSlider.options).toBeUndefined();
  });

  it('strips choice and slider fields when switching to text or bodymap', () => {
    const slider = {
      ...createEmptyQuestion('slider'),
      id: 'q_slider',
      text: { et: 'Koormus' },
      highlightInSummary: true,
    };

    const asText = changeQuestionType(slider, 'text');
    expect(asText.id).toBe('q_slider');
    expect(asText.text.et).toBe('Koormus');
    expect(asText.min).toBeUndefined();
    expect(asText.max).toBeUndefined();
    expect(asText.polarity).toBeUndefined();
    expect(asText.highlightInSummary).toBeUndefined();
    expect(asText.quickChips).toEqual([]);

    const emptyEmoji = createEmptyQuestion('emoji5');
    const asBodymap = changeQuestionType(emptyEmoji, 'bodymap');
    expect(asBodymap.text.es).toBeTruthy();
    expect(asBodymap.polarity).toBeUndefined();
  });
});

describe('STARTER_TEMPLATES catalog', () => {
  it('provides 4 complete football templates with 4-locale parity and required rules', () => {
    expect(STARTER_TEMPLATES).toHaveLength(4);
    const seenIds = new Set<string>();

    for (const tpl of STARTER_TEMPLATES) {
      expect(tpl.localizedTitle.et.trim().length).toBeGreaterThan(0);
      expect(tpl.localizedTitle.en?.trim().length).toBeGreaterThan(0);
      expect(tpl.localizedTitle.ru?.trim().length).toBeGreaterThan(0);
      expect(tpl.localizedTitle.es?.trim().length).toBeGreaterThan(0);

      for (const q of tpl.questions) {
        expect(seenIds.has(q.id)).toBe(false);
        seenIds.add(q.id);

        expect(q.text.et.trim().length).toBeGreaterThan(0);
        expect(q.text.en?.trim().length).toBeGreaterThan(0);
        expect(q.text.ru?.trim().length).toBeGreaterThan(0);
        expect(q.text.es?.trim().length).toBeGreaterThan(0);

        if (q.type === 'bodymap' || q.type === 'text') {
          expect(q.required).toBe(false);
        } else if (q.type === 'emoji5' || q.type === 'rating10' || q.type === 'slider') {
          expect(q.required).toBe(true);
        }
      }
    }
  });
});
