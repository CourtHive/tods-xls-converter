import { utilities } from 'tods-competition-factory';
import { isNumeric } from '../../utilities/identification';
import { parseSuper } from './transforms';

export function handleNumeric({ score, applied }) {
  const allNumeric = score
    .toString()
    .split('')
    .every((d) => isNumeric(d));

  const getDiff = (values) => Math.abs(values[0] - values[1]);

  if (typeof score === 'number' || allNumeric) {
    score = score.toString().toLowerCase();
    const numbers = score.split('').map((n) => parseInt(n));

    if (score.length === 3 && getDiff(numbers.slice(0, 2)) === 1) {
      const [s1, s2, tb] = numbers;
      score = `${s1}-${s2}(${tb})`;
      applied.push('numericTiebreakPattern1');
    } else if (score.length === 4 && getDiff(numbers.slice(0, 2)) === 1) {
      const [s1, s2, tb1, tb2] = numbers;
      const tb = Math.min(tb1, tb2);
      score = `${s1}-${s2}(${tb})`;
      applied.push('numericTiebreakPattern2');
    } else if (score.length === 5 && getDiff(numbers.slice(0, 2)) === 1) {
      const [s1, s2, tb, s3, s4] = numbers;
      score = `${s1}-${s2}(${tb}) ${s3}-${s4}`;
      applied.push('numericTiebreakPattern3');
    } else if (score.length === 5 && getDiff(numbers.slice(3)) === 1) {
      const [s1, s2, s3, s4, tb] = numbers;
      score = `${s1}-${s2} ${s3}-${s4}(${tb})`;
      applied.push('numericTiebreakPattern4');
    } else if (
      score.length === 7 &&
      getDiff(numbers.slice(0, 2)) === 1 &&
      getDiff(numbers.slice(2, 4)) !== 1 &&
      getDiff(numbers.slice(4, 6)) !== 1
    ) {
      const [s1, s2, tb, s3, s4, s5, s6] = numbers;
      score = `${s1}-${s2}(${tb}) ${s3}-${s4} ${s5}-${s6}`;
      applied.push('numericTiebreakPattern5');
    } else if (score.length === 7) {
      score = score.slice(0, 4) + ' ' + score.slice(4);
      applied.push('numericMatchTiebreakPattern');
    } else if (!(score.length % 2)) {
      const chunks = utilities.chunkArray(score.split(''), 2).map((part) => part.join(''));
      const chunkCharacter = chunks.map((chunk) => {
        const [s1, s2] = chunk.split('').map((s) => parseInt(s));
        const diff = Math.abs(s1 - s2);
        const winner = s1 > s2 ? 1 : 2;
        return diff > 1 && winner;
      });
      const allWinners = chunkCharacter.reduce((a, b) => a && b);

      if (chunkCharacter[0] && chunkCharacter[1] && chunkCharacter[0] !== chunkCharacter[1]) {
        score = [chunks.slice(0, 2).join(' '), chunks.slice(2).join('-')].join(' ');
        applied.push('numeric3rdSetTiebreakPattern');
      } else if (allWinners) {
        score = chunks.join(' ');
        applied.push('chunkSplit');
      }
    } else {
      score = parseSuper(score) || score;
    }
  }

  return { score, applied };
}
