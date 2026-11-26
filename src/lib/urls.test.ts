import { describe, expect, it } from 'vitest';
import { buildPublicSurveyUrl, buildViberShareUrl } from './urls.ts';

describe('GitHub Pages & Estonian Viber URL builders', () => {
  it('preserves repository subpath and uses HashRouter path', () => {
    expect(buildPublicSurveyUrl('abc123', 'https://coach.github.io', '/Noova-Surveys/')).toBe(
      'https://coach.github.io/Noova-Surveys/#/s/abc123'
    );
  });

  it('formats the exact Estonian prompt followed by the direct URL for Viber', () => {
    const publicUrl = 'https://streetoh.github.io/Noova-Surveys/#/s/abc123';
    const viber = buildViberShareUrl(publicUrl);
    expect(viber.startsWith('viber://forward?text=')).toBe(true);
    const decoded = decodeURIComponent(viber.replace('viber://forward?text=', ''));
    expect(decoded).toBe(
      `Palun võta 3 minutit ja vasta lühikesele küsitlusele treeningute kohta: ${publicUrl}`
    );
  });
});
