import { punctuationAdjustments } from './punctuationAdjustments';
import { joinFloatingTiebreak } from './joinFloatingTiebreak';
import { isNumeric } from '../../utilities/identification';
import { getSuper, isDiffOne } from './utilities';
import { properTiebreak } from './properTiebreak';
import { containedSets } from './containedSets';
import { scoreParser } from './tidyScore';

function replaceOh(score) {
  if (typeof score !== 'string') return score;
  return score
    .toLowerCase()
    .split(' ')
    .map((part) => {
      if (/^o[1-9]$/.test(part) || /^[1-9]o$/.test(part)) {
        part = part.split('o').join('0');
      }
      return part;
    })
    .join(' ');
}

function separateScoreBlocks(score) {
  if (typeof score !== 'string') return score;
  return score
    .toLowerCase()
    .split(' ')
    .map((part) => {
      if (/^\d+$/.test(part) && part.length > 2 && !(part.length % 2)) {
        part = chunkArray(part.split(''), 2)
          .map((c) => c.join(''))
          .join(' ');
      }
      return part;
    })
    .join(' ');
}

function removeErroneous(score) {
  if (typeof score !== 'string') return score;

  if (parseSuper(score)) return parseSuper(score);

  return score
    .toLowerCase()
    .split(' ')
    .map((part) => {
      if (/^\d+$/.test(part) && part.length === 1) {
        return;
      }
      if (/^\d+$/.test(part) && part.length === 3) {
        return part.slice(0, 2);
      }
      return part;
    })
    .filter(Boolean)
    .join(' ');
}

export function handleBracketSpacing(score) {
  if (score.includes('( ')) {
    score = score
      .split('( ')
      .map((part) => part.trim())
      .join('(');
  }
  if (score.includes(' )')) {
    score = score
      .split(' )')
      .map((part) => part.trim())
      .join(')');
  }
  return score;
}

export function handleWalkover(score) {
  if (['walkover', 'wo', 'w/o', 'w-o'].includes(score)) {
    return { matchUpStatus: 'walkover', score: '' };
  }
  return { score };
}

export function handleRetired(score) {
  const re = /^(.*)(ret|con)+[A-Za-z ]*$/;
  if (re.test(score)) {
    const [leading] = score.match(re).slice(1);
    return { score: leading.trim(), matchUpStatus: 'retired' };
  }

  // accommodate other variations
  const retired = ['rtd'].find((ret) => score.endsWith(ret));

  if (retired) {
    return { matchUpStatus: 'retired', score: score.replace(retired, '').trim() };
  }
  return { score };
}

export function removeDanglingBits(score) {
  if (['.', ','].some((punctuation) => score.endsWith(punctuation))) {
    score = score.slice(0, score.length - 1);
  }
  if ([')', '('].includes(score) || score.endsWith(' am') || score.endsWith(' pm')) return '';

  const targetPunctuation = '()/-'.split('').some((punctuation) => score.includes(punctuation));
  if (/ \d$/.test(score) && targetPunctuation) {
    return score.slice(0, score.length - 2);
  }
  return score;
}

export function handleSetSlashSeparation(score) {
  const re = new RegExp(/-\d+\/\d+-/);
  if (re.test(score)) {
    return score.split('/').join(' ');
  }
  return score;
}

export function handleGameSeparation(score) {
  const re = new RegExp(/^\d+\/\d+/);
  const parts = score.split(' ');
  if (parts.some((part) => re.test(part))) {
    score = parts.map((part) => (re.test(part) ? part.replace('/', '-') : part)).join(' ');
  }

  const singleSet = /^(\d+), *(\d+)$/;
  if (singleSet.test(score)) {
    const [s1, s2] = score.match(singleSet).slice(1);
    const setScore = [s1, s2].join('-');
    score = setScore;
  }

  return score;
}

export function handleTiebreakSlashSeparation(score) {
  const re = new RegExp(/\(\d+\/\d+\)/g);
  const tiebreaks = score.match(re);
  for (const tiebreak of tiebreaks || []) {
    const replacement = tiebreak.replace('/', '-');
    score = score.replace(tiebreak, replacement);
  }
  return score;
}

export function handleSpaceSeparator(score) {
  if (score.includes(',')) {
    const sets = score.split(',').map((set) => set.trim());
    const isSpaced = (set) => /\d \d/.test(set);
    const spacedSets = sets.every(isSpaced);
    if (spacedSets) return sets.map((set) => set.replace(' ', '-')).join(' ');
  }

  if (score.includes(' ')) {
    const noSpaces = score.replace(/[ ,]/g, '');
    const isNumber = noSpaces.split('').every((char) => isNumeric(char));
    if (isNumber && noSpaces.length === 4) {
      return noSpaces;
    }
  }

  return score;
}

export function sensibleSets(score) {
  const sets = score.split(' ');
  const isTiebreakSet = (set) => set.indexOf('(') === 3;
  return sets
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
}

export function superSquare(score) {
  const sets = score.split(' ');
  const finalSet = sets[sets.length - 1];
  if (!finalSet.includes('-') || finalSet.indexOf('(') > 0) return score;
  const scores = finalSet.split('(').join('').split(')').join('').split('-');
  const maxSetScore = Math.max(...scores);
  if (maxSetScore >= 10) {
    const squared = [...sets.slice(0, sets.length - 1), `[${scores.join('-')}]`].join(' ');
    return squared;
  }
  return score;
}

export function excisions(score) {
  const re = new RegExp(/^\[\d+\](.*)$/);
  if (re.test(score)) {
    score = score.match(re).slice(1)[0].trim();
  }
  return score;
}

export function tidyScore(score, stepLog) {
  let matchUpStatus, result;

  if (typeof score === 'number') {
    score = score.toString().toLowerCase();

    if (!(score.length % 2)) {
      score = chunkArray(score.split(''), 2)
        .map((part) => part.join(''))
        .join(' ');
    } else {
      score = parseSuper(score) || score;
    }
  }
  score = score.toString().toLowerCase();

  // -------------------------------
  score = punctuationAdjustments(score); // Must occure before removeDanglingBits
  if (stepLog) console.log({ score }, 'punctuationAdjustments');
  // -------------------------------

  score = excisions(score);
  if (stepLog) console.log({ score }, 'excisions');
  score = handleSpaceSeparator(score);
  if (stepLog) console.log({ score }, 'handleSpaceSeparator');
  score = removeDanglingBits(score);
  if (stepLog) console.log({ score }, 'removeDanglingBits');

  result = handleWalkover(score);
  score = result.score;
  if (result.matchUpStatus) matchUpStatus = result.matchUpStatus;

  result = handleRetired(score);
  score = result.score;
  if (result.matchUpStatus) matchUpStatus = result.matchUpStatus;
  if (stepLog) console.log({ score }, 'handleMatchUpStatus');

  score = replaceOh(score);
  score = handleBracketSpacing(score);
  if (stepLog) console.log({ score }, 'handleBracketeSpacing');
  score = containedSets(score);
  if (stepLog) console.log({ score }, 'containedSets');
  score = separateScoreBlocks(score);
  if (stepLog) console.log({ score }, 'separateScoreBlocks');
  score = handleGameSeparation(score);
  if (stepLog) console.log({ score }, 'handleGameSeparation');
  score = removeErroneous(score);
  if (stepLog) console.log({ score }, 'removeErroneous');
  score = joinFloatingTiebreak(score);
  if (stepLog) console.log({ score }, 'joinFloatingTiebreak');
  score = handleSetSlashSeparation(score);
  if (stepLog) console.log({ score }, 'handleSetSlashSeparation');
  score = handleTiebreakSlashSeparation(score);
  if (stepLog) console.log({ score }, 'handleTiebreakSlashSeparation');
  score = properTiebreak(score);
  if (stepLog) console.log({ score }, 'properTiebreak');
  score = sensibleSets(score);
  if (stepLog) console.log({ score }, 'sensibleSets');
  score = superSquare(score);
  if (stepLog) console.log({ score }, 'superSquare');

  if (matchUpStatus) {
    score = score + ` ${matchUpStatus}`;
  }

  score = scoreParser.tidyScore(score);
  if (stepLog) console.log({ score }, 'tidyScore');

  return score;
}

export function transformScore(score) {
  return scoreParser.transformScore(score).transformed_score;
}

export function chunkArray(arr, chunksize) {
  return arr.reduce((all, one, i) => {
    const ch = Math.floor(i / chunksize);
    all[ch] = [].concat(all[ch] || [], one);
    return all;
  }, []);
}

function parseSuper(score) {
  const oneIndex = score.indexOf('1');
  const numbers = score.split('');
  const allNumeric = numbers.every((n) => !isNaN(n));

  if (allNumeric && score.length === 3 && oneIndex >= 0 && oneIndex < 2) {
    const superTiebreak = getSuper(numbers, oneIndex);
    if (superTiebreak) return superTiebreak;
  }

  if (allNumeric && score.length === 7 && oneIndex > 3) {
    const tiebreak = numbers.slice(4);
    const superTiebreak = getSuper(tiebreak, oneIndex - 4);
    if (superTiebreak) {
      return `${numbers[0]}-${numbers[1]} ${numbers[2]}-${numbers[3]} ${superTiebreak}`;
    }
  }

  return;
}
