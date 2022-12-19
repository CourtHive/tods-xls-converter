import { normalizeScore } from '../functions/cleanScore';
import { tidyScore } from '../functions/scoreParser';
import { expect, it } from 'vitest';

// '7-5 6-7 (6) 6-3' =>  '7-5 6-7 [8-6] 6-3',
// '6-7 (5), 7-6 (6), 10-7' => '6-7 (5) 7-6 (6) 10-7'
// '9/8 [7/0]' => '9-8 7-0'
// '5/4 [7-4], 5/4 [12-11]' => '5-4 [7-4] 5-4 [12-11]'
// '6/0, 7/6[7]' => '6-0 7-6[7]'
// '6-2/6-3.' => '6-2'

const scores = [
  { score: '93', expectation: { score: '9-3' } },
  { score: '103' },
  { score: '9-8 (3)', expectation: { score: '9-8(3)' } },
  { score: '67 (3)', expectation: { score: '6-7(3)' } },
  { score: '61 26 10-13', expectation: { score: '6-1 2-6 10-3' } },
  { score: '61 26 10-5', expectation: { score: '6-1 2-6 10-5' } },
  { score: '57 76(7) 76(49', expectation: { score: '5-7 7-6(7) 7-6(4)' } },
  { score: '4662 10-8', expectation: { score: '4-6 6-2 10-8' } },
  { score: '41 1', expectation: { score: '4-1' } },
  { score: '634 61', expectation: { score: '6-3 6-1' } },
  { score: '76(3) 67(5) 60', expectation: { score: '7-6(3) 6-7(5) 6-0' } },
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

/*
(6, 1)(6, 2)
(6, 0)(7, 5)
(7, 5)(6, 2)
(7, 5)(2, 1)con
(6, 3)(2, 6)(6, 1)
(3, 6)(6, 3)(10, 8)
(6, 3)(5, 7)(10, 4)
(2, 6)(7, 6)[7, 2](6, 3
(6, 3)(1, 6)(7, 6)[7, 4]
(6, 4)(7, 6)[9, 7]
(7, 6)[7, 4](6, 1)
(3, 6)(7, 6)[7, 2](7, 6)[7, 5]
(7, 6)[11, 9](6, 7)[4, 7)(10, 6)
*/
