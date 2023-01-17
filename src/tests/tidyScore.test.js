import { normalizeScore } from '../functions/cleanScore';
import { tidyScore } from '../functions/scoreParser';
import { expect, it } from 'vitest';

// "8 30 am","30 am" => should reject

// "4664104","4664104"
// "2675119","2675119"

// "6 4, 6 3","4"
// "6 36, 1","3-6"
// "6 2, 6 3","2"
// "6 26 3","2-6"

// any set with a number >= 10 should be in square brackets [10-2]
// "6-4, 6-7(5), 10-2","6-4 6-7(5) 10-2"

// nonsensical - remove [1-7]
// "(6-7) (6-1) (7-5)[1-7]","6-7 6-1 7-5 1-7"

// handling matchUpStatus
// "4-6, 7-6(5), 2-0 concede","4-6 7-6(5) 2-0 concede"
// '6/1 conceed', '6-1 conceed'
// "walkover","walkover"
// "w/o,","w-o"

const scores = [
  { score: '(6-3)(6-3)' }, //"6-3) (6-3"
  { score: '(6-4)(4-6)(6-1)' }, // "6-4) (4-6) (6-1"
  { score: '(6-1) (4-6) (6-3)' }, //"6-1) (4-6) (6-3"
  { score: '(7-6)[7-3] (5-7) (6-2)' }, //"7-6) [7-3] (5-7) (6-2"
  { score: '(7, 6)(5), (6, 4)' }, // "7 6(5) (6 4"
  { score: '6-2/6-3.', ex: { score: '6-2 6-3' } }, // => '6-2-6-3'
  { score: '7/6(11/9), 5/7, 6/2' }, // => "7-6(11-9) 5-7 6-2"
  { score: '6/0, 7/6[7]' }, // => '6-0 7-6[7]'
  { score: '6-4, 2-6, ( 10-7 )' }, // =>"6-4 2-6 ( 10-7 )"
  { score: '3-6, 6-1, (10-6 )' }, // -> "3-6 6-1 (10-6 )"
  { score: '1/6, 7/6(7, 4)' }, // => "1-6 7-6(7 4"
  { score: '9/8 [7/0]' }, // => '9-8 7-0'
  { score: '5/4 [7-4], 5/4 [12-11]' }, // => '5-4 [7-4] 5-4 [12-11]'

  { score: '(4, 6)(6, 0)(6, 0)', expectation: { score: '4-6 6-0 6-0' } },
  { score: '7-5 6-7 (6) 6-3', expectation: { score: '7-5 6-7(6) 6-3' } },
  { score: '6-7 (5), 7-6 (6), 10-7', expectation: { score: '6-7(5) 7-6(6) 10-7' } },
  { score: '93', expectation: { score: '9-3' } },
  { score: '103', expectation: { score: '10-3' } },
  { score: 103, expectation: { score: '10-3' } },
  { score: 310, expectation: { score: '3-10' } },
  { score: '(6-3, 6-2)', expectation: { score: '6-3 6-2' } },
  { score: '(9 3)', expectation: { score: '9-3' } },
  { score: '(93)', expectation: { score: '9-3' } },
  { score: '(9.3)', expectation: { score: '9-3' } },
  { score: '(9,3)', expectation: { score: '9-3' } },
  { score: '(9/3)', expectation: { score: '9-3' } },
  { score: '(9, 3)', expectation: { score: '9-3' } },
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
  { score: '62 32 RET X LES', expectation: { score: '6-2 3-2', matchUpStatus: 'RETIRED' } },
  { score: '63 O1 RET X LES', expectation: { score: '6-3 0-1', matchUpStatus: 'RETIRED' } },
  { score: 6475, expectation: { score: '6-4 7-5' } },
  { score: `8--5`, expectation: { score: '8-5' } },
  { score: `9--0`, expectation: { score: '9-0' } },
  { score: `6--1, 6--1`, expectation: { score: '6-1 6-1' } }
];

it.each(scores.slice(0, 5))('can tidy scores', ({ score, expectation }) => {
  const tidy = tidyScore(score);
  const { normalized, matchUpStatus } = normalizeScore(tidy);
  if (expectation) {
    expect(normalized).toEqual(expectation.score);
    if (expectation.matchUpStatus) expect(matchUpStatus).toEqual(expectation.matchUpStatus);
  } else {
    console.log({ score, tidy, normalized, matchUpStatus });
  }
});

// '(7, 5)(2, 1)con'
// '(2, 6)(7, 6)[7, 2](6, 3'

/*
{ result: '(6, 4)(3, 6)(10, 6', isLikeScore: true, isScoreLike: true }
{ result: ')', isLikeScore: true, isScoreLike: true }
{ result: '17', isLikeScore: true, isScoreLike: true }
{ result: '(6-1)(6-0)', isLikeScore: true, isScoreLike: true }
{ result: '25', isLikeScore: true, isScoreLike: true }
{ result: '(6-0)(6-0)', isLikeScore: true, isScoreLike: true }
{ result: '17', isLikeScore: true, isScoreLike: true }
{ result: 'w/o', isLikeScore: true, isScoreLike: false }
{ result: '2-6, 7-6(7-4), 11-9', isLikeScore: true, isScoreLike: true }
{ result: '12', isLikeScore: true, isScoreLike: true }
{ result: '13', isLikeScore: true, isScoreLike: true }
{ result: '(6-4)(6-3) 6', isLikeScore: true, isScoreLike: true }
*/
