import { correctContainerMismatch } from './correctContainerMismatch';
import { joinFloatingTiebreak } from './joinFloatingTiebreak';
import { instanceCount } from '../../utilities/convenience';
import { isNumeric } from '../../utilities/identification';
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

function isDiffOne(score) {
  const strip = (value) => value?.split('-').join('').split('/').join('');
  const stripped = strip(score);
  if (/^\d+$/.test(stripped) && stripped.length === 2) {
    const scores = stripped.split('');
    const diff = Math.abs(scores.reduce((a, b) => +a - +b));
    return diff === 1;
  }
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

export function punctuationAdjustments(score) {
  score = correctContainerMismatch(score);

  const counts = instanceCount(score.split(''));
  let missingCloseParen = counts['('] === counts[')'] + 1;
  let missingOpenParen = (counts['('] || 0) + 1 === counts[')'];
  let missingCloseBracket = counts['['] === counts[']'] + 1;
  const hasAlpha = /[A-Za-z]+/.test(score);
  const hasDigits = /[0-9]+/.test(score);

  if (!hasAlpha && !hasDigits) return '';

  // remove enclosing [] provided there is anything other than numbers contained
  // don't want to remove for e.g. "[1]" which is dealt with as seeding value
  if (/^\[.+\]$/.test(score) && '()/,- '.split('').some((punctuation) => counts[punctuation])) {
    score = score.slice(1, score.length - 1);
  }

  // remove enclosing () provided contained punctuation
  if (
    /^\(.+\)$/.test(score) &&
    counts['('] === 1 &&
    counts[')'] === 1 &&
    '[]/,'.split('').some((punctuation) => counts[punctuation] > 1)
  ) {
    score = score.slice(1, score.length - 1);
  }

  if (score.startsWith('(') && score.endsWith('))')) {
    score = score.slice(1, score.length - 1);
  }

  if (counts['('] > (counts[')'] || 0) && score[score.length - 1] === '(') {
    score = score.slice(0, score.length - 1) + ')';
    missingCloseParen = counts['('] === counts[')'] + 1;
    missingOpenParen = counts['('] + 1 === counts[')'];
    missingCloseBracket = counts['['] === counts[']'] + 1;
  }

  if (counts['('] === 1 && !counts[')'] && score[0] === '(') {
    score = score + ')';
  }

  if (counts['('] > counts[')'] && score.slice(0, 2) === '((') {
    score = score.slice(1);
  }

  if (missingOpenParen && score.startsWith('9')) {
    score = '(' + score.slice(1);
  } else if (missingOpenParen) {
    if (score[0] !== '(') score = '(' + score;
  }

  if (counts[')'] > counts['(']) {
    if (score[0] === ')') score = '(' + score.slice(1);
  }

  if (missingCloseParen && !missingCloseBracket) {
    if (score.endsWith(9)) {
      score = score.slice(0, score.length - 1) + ')';
    } else if (!score.endsWith(')') || score.startsWith('((')) {
      score = score + ')';
    } else {
      let reconstructed = '';
      let open = 0;
      // step through characters and insert close before open when open
      for (const char of score.split('')) {
        if (char === '(') {
          if (open) {
            reconstructed += ')';
          } else {
            open += 1;
          }
        }
        if (char === ')') open -= 1;
        reconstructed += char;
      }
      score = reconstructed;
    }
  }

  if (missingCloseBracket && !missingCloseParen) return score + ']';

  // this is potentially problematic as enclosing with '[]' yields tiebreak...
  // ... wheres enclosing with '()' yields a set which gets converted to a supertiebreak!
  // Really it would be better to convert to set and determine later which type of tiebreak based on previous set
  if (score.includes('([') && score.includes('])')) {
    score = score.split('([').join('[').split('])').join(']');
  }

  return score;
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
  if ([')', '('].includes(score) || score.endsWith(' am') || score.endsWith(' pm')) return '';
  if (/^(.*) \d$/.test(score)) {
    return score.slice(0, score.length - 2);
  }
  if (['.', ','].some((punctuation) => score.endsWith(punctuation))) {
    return score.slice(0, score.length - 1);
  }
  return score;
}

export function properTiebreak(score) {
  let parts = score?.split(' ');
  score = parts
    .map((part) => {
      if (part.endsWith(']')) {
        const setScores = part.split('[');
        if (isDiffOne(setScores[0])) {
          return setScores[0] + `(${setScores[1].slice(0, setScores[1].length - 1)})`;
        }
      }
      return part;
    })
    .join(' ');

  const tb = new RegExp(/(\([\d ]+\))/g);
  // const tb = new RegExp(/(\([\d+ ]+\))/g);
  if (tb.test(score)) {
    // handle tiebreak score which has no delimiter
    for (const t of score.match(tb)) {
      const replacement = t.replace(' ', '-');
      // score = score.replace(t, replacement);
      let tiebreakScore = replacement.match(/\((.*)\)/)?.[1];
      if (isNumeric(tiebreakScore) && tiebreakScore?.[0] > 2) {
        if ([2, 4].includes(tiebreakScore.length)) {
          tiebreakScore = tiebreakScore.split('').join('-');
        } else if (tiebreakScore.length === 3) {
          const oneIndex = tiebreakScore.indexOf('1');
          tiebreakScore = getSuper(tiebreakScore.split(''), oneIndex);
        }
      }
      score = score.replace(t, `(${tiebreakScore})`);
    }
  }

  parts = score?.split(' ');
  // handles tiebreaks (#-#) or (#/#)
  let re = new RegExp(/^(\d[-/]+\d)\((\d+)[-/]+(\d+)\)$/);
  score = parts
    .map((part) => {
      if (re.test(part)) {
        const [set, tb1, tb2] = Array.from(part.match(re)).slice(1);
        const lowTiebreakScore = Math.min(tb1, tb2);
        const setScore = `${set}(${lowTiebreakScore})`;
        return setScore;
      }
      return part;
    })
    .join(' ');

  // convert ##(#) => #-#(#)
  parts = score?.split(' ');
  re = new RegExp(/^(\d{2})\((\d+)\)$/);
  score = parts
    .map((part) => {
      if (re.test(part)) {
        const [set, lowTiebreakScore] = Array.from(part.match(re)).slice(1);
        const setScores = set.split('');
        const setScore = `${setScores[0]}-${setScores[1]}(${lowTiebreakScore})`;
        return setScore;
      }
      return part;
    })
    .join(' ');

  // convert (#-#)# to #-#(#)
  parts = score?.split(' ');
  re = new RegExp(/^\((\d[-/]+\d)\)(\d+)$/);
  score = parts
    .map((part) => {
      if (re.test(part)) {
        const [set, lowTiebreakScore] = Array.from(part.match(re)).slice(1);
        if (isDiffOne(set)) {
          return `${set}(${lowTiebreakScore})`;
        } else {
          // discard the number outside the bracket as erroneous
          return set;
        }
      }
      return part;
    })
    .join(' ');

  // convert 1-0(#) to super tiebreak
  parts = score?.split(' ');
  re = new RegExp(/^1-0\((\d+)\)$/);
  score = parts
    .map((part) => {
      if (re.test(part)) {
        const [lowTiebreakScore] = part.match(re).slice(1);
        const hightiebreakScore = lowTiebreakScore < 9 ? 10 : parseInt(lowTiebreakScore) + 2;
        return `[${hightiebreakScore}-${lowTiebreakScore}]`;
      }
      return part;
    })
    .join(' ');

  return score;
}

export function handleSetSlashSeparation(score) {
  const re = new RegExp(/-\d+\/\d+-/);
  if (re.test(score)) {
    return score.split('/').join(' ');
  }
  return score;
}

export function handleGameSlashSeparation(score) {
  const re = new RegExp(/^\d+\/\d+/);
  const parts = score.split(' ');
  if (parts.some((part) => re.test(part))) {
    return parts.map((part) => (re.test(part) ? part.replace('/', '-') : part)).join(' ');
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

  score = handleBracketSpacing(score);
  if (stepLog) console.log({ score }, 'handleBracketeSpacing');
  score = containedSets(score);
  if (stepLog) console.log({ score }, 'containedSets');
  score = separateScoreBlocks(score);
  if (stepLog) console.log({ score }, 'separateScoreBlocks');
  score = handleGameSlashSeparation(score);
  if (stepLog) console.log({ score }, 'handleGameSlashSeparation');
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

  score = scoreParser.tidyScore(replaceOh(score));
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

function getSuper(values, index) {
  const parts = [values.slice(index, index + 2), index ? values.slice(0, 1) : values.slice(2)].map((n) =>
    parseInt(n.join(''))
  );
  // preserve order
  const scores = index ? parts.reverse() : parts;

  const diff = Math.abs(scores.reduce((a, b) => +a - +b));
  if (diff >= 2) return scores.join('-');
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
