import { normalizeScore } from '../functions/cleanScore';
import { tidyScore } from '../functions/scoreParser';
import { expect, it } from 'vitest';

const scores = [
  { score: '67 (3)' },
  { score: '36 63', expectation: { score: '3-6 6-3' } },
  { score: '36 63 [10-5]', expectation: { score: '3-6 6-3 10-5' } },
  { score: '36 63 (10-5)', expectation: { score: '3-6 6-3 10-5' } },
  { score: '(6-3, 6-2)', expectation: { score: '6-3 6-2' } },
  { score: '62 32 RET X LES', expectation: { score: '6-2 3-2', matchUpStatus: 'RETIRED' } },
  { score: '63 O1 RET X LES', expectation: { score: '6-3 0-1', matchUpStatus: 'RETIRED' } },
  { score: 6475, expectation: { score: '6-4 7-5' } }
];
it.each(scores)('can tidy scores', ({ score, expectation }) => {
  const tidy = tidyScore(score);
  const { normalized, matchUpStatus } = normalizeScore(tidy);
  if (expectation) {
    expect(normalized).toEqual(expectation.score);
    if (expectation.matchUpStatus) expect(matchUpStatus).toEqual(expectation.matchUpStatus);
  } else {
    console.log({ score, tidy, normalized, matchUpStatus });
  }
});
