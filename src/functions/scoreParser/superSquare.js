import { isNumeric } from '../../utilities/identification';

export function superSquare(score) {
  const sets = score.split(' ');
  const finalSet = sets[sets.length - 1];
  if (!finalSet.includes('-') || finalSet.indexOf('(') > 0) return score;

  let scores = finalSet.split('(').join('').split(')').join('').split('-');
  if (!scores.every((score) => isNumeric(score))) return score;
  scores = scores.map((score) => parseInt(score));

  const maxSetScore = Math.max(...scores);
  let diff = Math.abs(scores[0] - scores[1]);

  if (maxSetScore >= 10) {
    // if both scores are greater than 10 and diff > 2 then attempt to modify
    if (diff > 2 && scores.every((s) => +s >= 10)) {
      const modifiedScores = scores.map((s) => (s === maxSetScore ? s - 10 : 10)).sort();
      diff = Math.abs(modifiedScores[0] - modifiedScores[1]);
      if (diff > 2) scores = modifiedScores;
    }
    const squared = [...sets.slice(0, sets.length - 1), `[${scores.join('-')}]`].join(' ');
    return squared;
  }
  return score;
}
