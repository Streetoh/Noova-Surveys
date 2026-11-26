import { describe, expect, it } from 'vitest';
import { buildPublicSurveyUrl } from './urls.ts';

describe('GitHub Pages public URL builder', () => {
  it('preserves repository subpath and uses HashRouter path', () => {
    expect(buildPublicSurveyUrl('abc123', 'https://coach.github.io', '/team-surveys/')).toBe(
      'https://coach.github.io/team-surveys/#/s/abc123'
    );
    expect(buildPublicSurveyUrl('abc123', 'https://coach.github.io', '/team-surveys/index.html')).toBe(
      'https://coach.github.io/team-surveys/#/s/abc123'
    );
    expect(buildPublicSurveyUrl('abc123', 'http://localhost:5173', '/')).toBe(
      'http://localhost:5173/#/s/abc123'
    );
  });
});
