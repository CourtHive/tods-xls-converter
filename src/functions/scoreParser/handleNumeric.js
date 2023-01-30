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
      const chunks = utilities.chunkArray(score.split(''), 2).map((part) => part.join(''));
      const chunkCharacter = chunks.map((chunk) => {
        const [s1, s2] = chunk.split('').map((s) => parseInt(s));
        const diff = Math.abs(s1 - s2);
        const winner = s1 > s2 ? 1 : 2;
        return diff > 1 ? winner : 'tbset';
      });

      if (chunkCharacter[0] !== 'tbset' && chunkCharacter[1] !== 'tbset' && chunkCharacter[0] !== chunkCharacter[1]) {
        score = [chunks.slice(0, 2).join(' '), chunks.slice(2).join('-')].join(' ');
      } else {
        score = chunks.join(' ');
      }
    } else {
      score = parseSuper(score) || score;
    }
  }

  return { score };
}
