import { normalizeScore } from '../functions/cleanScore';
import { it } from 'vitest';

const scores = ['14 14', '40 54(4)', '60 76(4)', '36 63 (10-5)', '36 63 [10-5]', '61 26 10-5', '61 26 10-13'];
it.each(scores)('can nomralize scores', (score) => {
  const { normalized, matchUpStatus } = normalizeScore(score);
  console.log({ score, normalized, matchUpStatus });
});
