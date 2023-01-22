import { matchTiebreak, standardSet, tiebreakSet } from './validPatterns';
import { isNumeric } from '../../utilities/identification';
import { isDiffOne } from './utilities';

export function sensibleSets({ score, matchUpStatus }) {
  const profile = [];

  let maxSetValue;
  let sets = score.split(' ').map((set, index) => {
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

    const setType =
      (new RegExp(standardSet).test(set) && 'standard') ||
      (new RegExp(tiebreakSet).test(set) && 'tiebreak') ||
      (new RegExp(matchTiebreak).test(set) && 'super') ||
      'unknown';
    profile.push(setType);

    // check for reasonable set scores in the first two sets
    if (setType === 'standard' && index < 2) {
      const [s1, s2] = set.split('-');
      const diff = Math.abs(s1 - s2);
      const max = Math.max(s1, s2);
      const min = Math.min(s1, s2);

      // identify problematic score
      // coerce larger value to something reasonable
      if (max > 9 && diff > 2) {
        const reasonable = max
          .toString()
          .split('')
          .find((value) => parseInt(value) > min || (index && parseInt(value) <= maxSetValue));

        if (reasonable) {
          set = [reasonable, min].join('-');
        }

        const option = max
          .toString()
          .split('')
          .find((value) => index && parseInt(value) <= maxSetValue);

        if (option && !reasonable) {
          set = [option, min].join('-');
        }
      }

      if (max > (maxSetValue || 0)) maxSetValue = max;
    }

    return set;
  });

  score = sets.join(' ');

  return { score };
}
