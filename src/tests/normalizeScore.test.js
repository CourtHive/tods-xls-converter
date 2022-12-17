import { normalizeScore } from '../functions/cleanScore';
import { it } from 'vitest';

const scores = [
  { score: '14 14', expectation: { normalized: '1-4 1-4' } },
  { score: '40 54(4)', expectation: { normalized: '4-0 5-4(4)' } },
  { score: '60 76(4)', expectation: { normalized: '6-0 7-6(4)' } },
  { score: '36 63 (10-5)', expectation: { normalized: '3-6 6-3 10-5' } },
  { score: '36 63 [10-5]', expectation: { normalized: '3-6 6-3 10-5' } },
  { score: '61 26 10-5', expectation: { normalized: '6-1 2-6 10-5' } },
  { score: '61 26 10-13', expectation: { normalized: '6-1 2-6 10-3' } },
  { score: '61 24 RET', expectation: { normalized: '6-1 2-4', matchUpStatus: 'RETIRED' } },
  { score: '67(4)', expectation: { normalized: '6-7(4)' } },
  { score: '93', expectation: { normalized: '9-3' } },
  { score: '103', expectation: { normalized: '10-3' } },
  { score: '63', expectation: { normalized: '6-3' } }
];
it.each(scores)('can nomralize scores', ({ score, expectation }) => {
  const { normalized, matchUpStatus } = normalizeScore(score);
  if (expectation) {
    if (expectation?.score) expect(score).toEqual(expectation.score);
    if (expectation.matchUpStatus) expect(matchUpStatus).toEqual(expectation.matchUpStatus);
  } else {
    console.log({ score, normalized, matchUpStatus });
  }
});
