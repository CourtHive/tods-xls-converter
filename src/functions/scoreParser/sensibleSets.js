import { isDiffOne } from './utilities';

export function sensibleSets(score) {
  const sets = score.split(' ');
  const isTiebreakSet = (set) => set.indexOf('(') === 3;
  score = sets
    .map((set) => {
      if (isTiebreakSet(set)) {
        const tiebreak = set.slice(3);
        const setScores = set.slice(0, 3);
        if (!isDiffOne(setScores)) {
          const maxSetScore = Math.max(...setScores.split('-'));
          const maxIndex = setScores.indexOf(maxSetScore);
          const sensibleSetScores = [maxSetScore, maxSetScore - 1];
          const sensibleSetScore = maxIndex ? sensibleSetScores.reverse().join('-') : sensibleSetScores.join('-');
          const sensibleSet = sensibleSetScore + tiebreak;
          return sensibleSet;
        }
      }

      return set;
    })
    .join(' ');
  return score;
}
