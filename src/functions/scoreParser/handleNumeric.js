import { utilities } from 'tods-competition-factory';
import { isNumeric } from '../../utilities/identification';
import { parseSuper } from './transforms';

export function handleNumeric({ score }) {
  const allNumeric = score
    .toString()
    .split('')
    .every((d) => isNumeric(d));

  if (typeof score === 'number' || allNumeric) {
    score = score.toString().toLowerCase();

    if (score.length === 7) {
      score = score.slice(0, 4) + ' ' + score.slice(4);
    } else if (!(score.length % 2)) {
      score = utilities
        .chunkArray(score.split(''), 2)
        .map((part) => part.join(''))
        .join(' ');
    } else {
      score = parseSuper(score) || score;
    }
  }

  return { score };
}
