import { normalizeScore } from '../functions/cleanScore';
import { it } from 'vitest';

const scores = ['14 14', '40 54(4)', '60 76(4)'];
it.each(scores)('can nomralize scores', (score) => {
  const normalized = normalizeScore(score);
  console.log({ score, normalized });
});
