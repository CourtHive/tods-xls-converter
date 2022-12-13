import { normalizeScore } from '../functions/cleanScore';
import { tidyScore } from '../functions/scoreParser';
import { it } from 'vitest';

const scores = [
  '67 (3)',
  '36 63',
  '36 63 [10-5]',
  '36 63 (10-5)',
  '(6-3, 6-2)',
  '62 32 RET X LES',
  '63 O1 RET X LES',
  6475
];
it.each(scores)('can tidy scores', (score) => {
  const tidy = tidyScore(score);
  const { normalized, matchUpStatus } = normalizeScore(tidy);
  console.log({ score, tidy, normalized, matchUpStatus });
});
