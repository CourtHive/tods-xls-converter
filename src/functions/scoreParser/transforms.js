import { punctuationAdjustments } from './punctuationAdjustments';
import { handleBracketSpacing } from './handleBracketSpacing';
import { joinFloatingTiebreak } from './joinFloatingTiebreak';
import { isNumeric } from '../../utilities/identification';
import { matchKnownPatterns } from './matchKnownPatterns';
import { utilities } from 'tods-competition-factory';
import { properTiebreak } from './properTiebreak';
import { containedSets } from './containedSets';
import { sensibleSets } from './sensibleSets';
import { superSquare } from './superSquare';
import { getSuper } from './utilities';

export function stringScore({ score }) {
  score = score.toString().toLowerCase();
  return { score };
}

export function handleNumeric({ score }) {
  if (typeof score === 'number') {
    score = score.toString().toLowerCase();

    if (!(score.length % 2)) {
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

export function replaceOh({ score }) {
  if (typeof score !== 'string') return { score };
  score = score
    .toLowerCase()
    .split(' ')
    .map((part) => {
      if (/^o[1-9]$/.test(part) || /^[1-9]o$/.test(part)) {
        part = part.split('o').join('0');
      }
      return part;
    })
    .join(' ');

  return { score };
}

export function separateScoreBlocks({ score }) {
  if (typeof score !== 'string') return { score };
  score = score
    .toLowerCase()
    .split(' ')
    .map((part) => {
      if (/^\d+$/.test(part) && part.length > 2) {
        const oneIndex = part.indexOf('1');
        if (!(part.length % 2)) {
          part = utilities
            .chunkArray(part.split(''), 2)
            .map((c) => c.join(''))
            .join(' ');
        } else if (part.length === 3 && oneIndex >= 0) {
          const tiebreakScore = getSuper(part.split(''), oneIndex);
          return tiebreakScore;
        }
      }
      return part;
    })
    .join(' ');

  return { score };
}

export function removeErroneous({ score }) {
  if (typeof score !== 'string') return { score };

  if (parseSuper(score)) return { score: parseSuper(score) };

  score = score
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

  return { score };
}

export function handleWalkover({ score }) {
  if (['walkover', 'wo', 'w/o', 'w-o'].includes(score.toString().toLowerCase())) {
    return { matchUpStatus: 'walkover', score: '' };
  }
  return { score };
}

export function handleRetired({ score, profile }) {
  score = score.toString().toLowerCase();
  const re = /^(.*\d+.*)(ret|con)+[A-Za-z ]*$/; // at least one digit
  if (re.test(score)) {
    const [leading] = score.match(re).slice(1);
    return { score: leading.trim(), matchUpStatus: 'retired' };
  }

  const providerRetired = profile?.matchUpStatuses?.retired;
  const additionalRetired = Array.isArray(providerRetired) ? providerRetired : [providerRetired].filter(Boolean);

  // accommodate other variations
  const retired = ['rtd', ...additionalRetired].find((ret) => score.endsWith(ret));

  if (retired) {
    return { matchUpStatus: 'retired', score: score.replace(retired, '').trim() };
  }
  return { score };
}

export function removeDanglingBits({ score, attributes }) {
  if (['.', ','].some((punctuation) => score.endsWith(punctuation))) {
    score = score.slice(0, score.length - 1);
  }
  if ([')', '('].includes(score) || score.endsWith(' am') || score.endsWith(' pm')) score = '';

  const targetPunctuation = '()/-'.split('').some((punctuation) => score.includes(punctuation));
  if (/ \d$/.test(score) && targetPunctuation) {
    const removed = score.slice(score.length - 2).trim();
    attributes = { removed };
    score = score.slice(0, score.length - 2);
  }

  const alphaEnding = /(.*)[A-Za-z]+$/;
  if (alphaEnding.test(score)) {
    const scorePart = score.match(alphaEnding).slice(1)[0];
    score = scorePart.trim();
  }

  return { score, attributes };
}

export function handleSetSlashSeparation({ score }) {
  const re = new RegExp(/-\d+\/\d+-/);
  if (re.test(score)) {
    score = score.split('/').join(' ');
  }
  return { score };
}

export function handleGameSeparation({ score }) {
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

  return { score };
}

export function handleTiebreakSlashSeparation({ score }) {
  const re = new RegExp(/\(\d+\/\d+\)/g);
  const tiebreaks = score.match(re);
  for (const tiebreak of tiebreaks || []) {
    const replacement = tiebreak.replace('/', '-');
    score = score.replace(tiebreak, replacement);
  }
  return { score };
}

export function handleSpaceSeparator({ score }) {
  if (score.includes(',')) {
    const sets = score.split(',').map((set) => set.trim());
    const isSpaced = (set) => /\d \d/.test(set);
    const spacedSets = sets.every(isSpaced);
    if (spacedSets) score = sets.map((set) => set.replace(' ', '-')).join(' ');
  }

  if (score.includes(' ')) {
    const noSpaces = score.replace(/[ ,]/g, '');
    const isNumber = noSpaces.split('').every((char) => isNumeric(char));
    if (isNumber && noSpaces.length === 4) {
      score = noSpaces;
    }
  }

  return { score };
}

export function excisions({ score }) {
  const re = new RegExp(/^\[\d+\](.*)$/);
  if (re.test(score)) {
    score = score.match(re).slice(1)[0].trim();
  }

  const openComma = /\(,/g;
  if (openComma.test(score)) {
    score = score.replace(openComma, '(');
  }

  return { score };
}

export function parseSuper(score) {
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

export const transforms = {
  handleTiebreakSlashSeparation: handleTiebreakSlashSeparation,
  handleSetSlashSeparation: handleSetSlashSeparation,
  punctuationAdjustments: punctuationAdjustments,
  handleGameSeparation: handleGameSeparation,
  joinFloatingTiebreak: joinFloatingTiebreak,
  handleBracketSpacing: handleBracketSpacing,
  handleSpaceSeparator: handleSpaceSeparator,
  separateScoreBlocks: separateScoreBlocks,
  matchKnownPatterns: matchKnownPatterns,
  removeDanglingBits: removeDanglingBits,
  removeErroneous: removeErroneous,
  handleWalkover: handleWalkover,
  properTiebreak: properTiebreak,
  handleNumeric: handleNumeric,
  handleRetired: handleRetired,
  containedSets: containedSets,
  sensibleSets: sensibleSets,
  stringScore: stringScore,
  superSquare: superSquare,
  excisions: excisions,
  replaceOh: replaceOh
};
