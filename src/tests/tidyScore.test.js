import { normalizeScore } from '../functions/cleanScore';
import { tidyScore } from '../functions/scoreParser';
import { expect, it } from 'vitest';

let start = 0;
let end = undefined;

const scores = [
  { score: '113', expectation: { score: '[11-3]' } },
  { score: '311', expectation: { score: '[3-11]' } },
  { score: 310, expectation: { score: '[3-10]' } },
  { score: 103, expectation: { score: '[10-3]' } },
  { score: 113, expectation: { score: '[11-3]' } },
  { score: 6475, expectation: { score: '6-4 7-5' } },
  { score: '93', expectation: { score: '9-3' } },
  { score: '103', expectation: { score: '[10-3]' } },
  { score: '2675119', expectation: { score: '2-6 7-5 [11-9]' } },
  { score: '4664104', expectation: { score: '4-6 6-4 [10-4]' } },
  { score: '(6-7) (1-6) (7-5)[1-7]', expectation: { score: '6-7 1-6 7-6(1)' } }, // 7-5 with tiebreak has been corrected
  { score: '6 36, 1', expectation: { score: '6-3 6-1' } },
  { score: '6 26 3', expectation: { score: '6-2 6-3' } },
  { score: '6 4, 6 3', expectation: { score: '6-4 6-3' } },
  { score: '7/6(11/9), 5/7, 6/2', expectation: { score: '7-6(9) 5-7 6-2' } },
  { score: '6/0, 7/6[7]', expectation: { score: '6-0 7-6(7)' } },
  { score: '6/0, 7/6[7-3]', expectation: { score: '6-0 7-6(3)' } },
  { score: '5/4 [7-4], 5/4 [12-11]', expectation: { score: '5-4(4) 5-4(11)' } },
  { score: '5/4 (7-4), 5/4 (12-11)', expectation: { score: '5-4(4) 5-4(11)' } },
  { score: '8 30 am', expectation: { score: '' } }, // => should reject
  { score: '9-8 (7-0)', expectation: { score: '9-8(0)' } },
  { score: '9/8 [7/0]', expectation: { score: '9-8(0)' } },
  { score: '6-2/6-3.', expectation: { score: '6-2 6-3' } },
  { score: '1/6, 7/6(7, 4)', expectation: { score: '1-6 7-6(4)' } },
  { score: '1/6, 6/7(3 7), 7/6(7, 4)', expectation: { score: '1-6 6-7(3) 7-6(4)' } },
  { score: '2-6, 7-6(7-4), 11-9', expectation: { score: '2-6 7-6(4) [11-9]' } },
  { score: '4-6, 7-6(5), 2-0 concede', expectation: { score: '4-6 7-6(5) 2-0', matchUpStatus: 'RETIRED' } },
  { score: '(7, 5)(2, 1)con', expectation: { score: '7-5 2-1', matchUpStatus: 'RETIRED' } },
  { score: '62 32 RET X LES', expectation: { score: '6-2 3-2', matchUpStatus: 'RETIRED' } },
  { score: '63 O1 RET X LES', expectation: { score: '6-3 0-1', matchUpStatus: 'RETIRED' } },
  { score: '6/1 conceed', expectation: { score: '6-1', matchUpStatus: 'RETIRED' } },
  { score: '(2, 6)(7, 6)[7, 2](6, 3', expectation: { score: '2-6 7-6(2) 6-3' } },
  { score: '(6-4)(6-3) 6', expectation: { score: '6-4 6-3' } },
  { score: ')', expectation: { score: '' } },
  { score: 'w/o', expectation: { matchUpStatus: 'WALKOVER' } },
  { score: 'w-o', expectation: { matchUpStatus: 'WALKOVER' } },
  { score: 'wo', expectation: { matchUpStatus: 'WALKOVER' } },
  { score: 'walkover', expectation: { matchUpStatus: 'WALKOVER' } },
  { score: '57 76(7) 76(49', expectation: { score: '5-7 7-6(7) 7-6(4)' } },
  { score: '3-6, 6-1, (10-6 )', expectation: { score: '3-6 6-1 [10-6]' } },
  { score: '6-4, 2-6, ( 10-7 )', expectation: { score: '6-4 2-6 [10-7]' } },
  { score: '(6, 4)(3, 6)(10, 6', expectation: { score: '6-4 3-6 [10-6]' } },
  { score: '(7, 6)(5), (6, 4)', expectation: { score: '7-6(5) 6-4' } },
  { score: '(6-3)(6-3)', expectation: { score: '6-3 6-3' } },
  { score: '(6-4)(4-6)(6-1)', expectation: { score: '6-4 4-6 6-1' } },
  { score: '(6-1) (4-6) (6-3)', expectation: { score: '6-1 4-6 6-3' } },
  { score: '(7-6)[7-3] (5-7) (6-2)', expectation: { score: '7-6(3) 5-7 6-2' } },
  { score: '(4, 6)(6, 0)(6, 0)', expectation: { score: '4-6 6-0 6-0' } },
  { score: '7-5 6-7 (6) 6-3', expectation: { score: '7-5 6-7(6) 6-3' } },
  { score: '6-7 (5), 7-6 (6), 10-7', expectation: { score: '6-7(5) 7-6(6) [10-7]' } },
  { score: '(6-3, 6-2)', expectation: { score: '6-3 6-2' } },
  { score: '(9 3)', expectation: { score: '9-3' } },
  { score: '(93)', expectation: { score: '9-3' } },
  { score: '(9.3)', expectation: { score: '9-3' } },
  { score: '(9,3)', expectation: { score: '9-3' } },
  { score: '(9/3)', expectation: { score: '9-3' } },
  { score: '(9, 3)', expectation: { score: '9-3' } },
  { score: '9-8 (3)', expectation: { score: '9-8(3)' } },
  { score: '67 (3)', expectation: { score: '6-7(3)' } },
  { score: '61 26 10-13', expectation: { score: '6-1 2-6 [10-3]' } },
  { score: '61 26 10-5', expectation: { score: '6-1 2-6 [10-5]' } },
  { score: '4662 10-8', expectation: { score: '4-6 6-2 [10-8]' } },
  { score: '41 1', expectation: { score: '4-1' } },
  { score: '634 61', expectation: { score: '6-3 6-1' } },
  { score: '76(3) 67(5) 60', expectation: { score: '7-6(3) 6-7(5) 6-0' } },
  { score: '36 63', expectation: { score: '3-6 6-3' } },
  { score: '36 63 [10-5]', expectation: { score: '3-6 6-3 [10-5]' } },
  { score: '36 63 (10-5)', expectation: { score: '3-6 6-3 [10-5]' } },
  { score: `8--5`, expectation: { score: '8-5' } },
  { score: `9--0`, expectation: { score: '9-0' } },
  { score: `6--1, 6--1`, expectation: { score: '6-1 6-1' } }
];

it.each(scores.slice(start, end))('can tidy scores', ({ score, expectation }) => {
  const tidy = tidyScore(score, end - start === 1);
  const { normalized, matchUpStatus } = normalizeScore(tidy, true);

  let metExpectation;
  if (expectation?.matchUpStatus) {
    expect(matchUpStatus).toEqual(expectation.matchUpStatus);
    metExpectation = true;
  }
  if (expectation?.score !== undefined) {
    expect(normalized).toEqual(expectation.score);
    metExpectation = true;
  }

  if (!metExpectation) {
    console.log({ score, tidy, normalized, matchUpStatus });
  }
});
