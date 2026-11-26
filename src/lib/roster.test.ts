import { describe, expect, it } from 'vitest';
import { computeRosterParticipation, parseAndMergePlayers } from './roster.ts';

describe('roster & participation tracking', () => {
  it('parses multiline names, deduplicates case-insensitively and sorts alphabetically', () => {
    const merged = parseAndMergePlayers(
      ['Markus Tamm'],
      'Oskar Kask\nmarkus tamm\n  Artur Saar  \nKarl Lepp',
      'et'
    );
    expect(merged).toEqual(['Artur Saar', 'Karl Lepp', 'Markus Tamm', 'Oskar Kask']);
  });

  it('computes answered vs missing roster players and extra ("Other name") respondents', () => {
    const roster = ['Markus Tamm', 'Artur Saar', 'Oskar Kask'];
    const responses = [
      { respondentName: '  artur saar ' },
      { respondentName: 'Markus Tamm' },
      { respondentName: 'Uus Mängija' },
    ];

    const diff = computeRosterParticipation(roster, responses, 'et');
    expect(diff.answeredRoster).toEqual(['Artur Saar', 'Markus Tamm']);
    expect(diff.missingRoster).toEqual(['Oskar Kask']);
    expect(diff.extraRespondents).toEqual(['Uus Mängija']);
  });
});
