import { describe, expect, it } from 'vitest';
import { changeQuestionType, createEmptyQuestion } from './templates.ts';

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
