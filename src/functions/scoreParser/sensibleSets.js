import { isNumeric } from '../../utilities/identification';
import { tiebreakSet } from './validPatterns';
import { isDiffOne } from './utilities';

export function sensibleSets({ score, matchUpStatus }) {
  const sets = score.split(' ');

  score = sets
    .map((set) => {
      if (new RegExp(tiebreakSet).test(set)) {
        const tiebreak = set.slice(3);
        const setScores = set.slice(0, 3);
        const sideScores = setScores.split('-');

        if (!isDiffOne(setScores) && !matchUpStatus) {
          const maxSetScore = Math.max(...sideScores);
          const maxIndex = setScores.indexOf(maxSetScore);
          const sensibleSetScores = [maxSetScore, maxSetScore - 1];
          const sensibleSetScore = maxIndex ? sensibleSetScores.reverse().join('-') : sensibleSetScores.join('-');
          const sensibleSet = sensibleSetScore + tiebreak;
          return sensibleSet;
        }
      } else if (set.length === 2 && isNumeric(set)) {
        return set.split('').join('-');
      }

      return set;
    })
    .join(' ');

  return { score };
}
