import { indices } from '../../utilities/convenience';
import { isBracketScore, isDiffOne, isTiebreakScore } from './utilities';

export function joinFloatingTiebreak(score) {
  if (typeof score !== 'string') return score;
  const strip = (value) => value?.split('-').join('').split('/').join('');
  const bracketToParen = (value) => value.split('[').join('(').split(']').join(')');
  score = score.split(', ').join(' ');
  let parts = score.split(' ');

  const floatingTiebreaks = parts.filter(isTiebreakScore);

  let lastIndex = 0;
  let joinedScore = '';
  for (const floatingTiebreak of floatingTiebreaks) {
    const thisIndex = indices(floatingTiebreak, parts).filter((index) => !lastIndex || index > lastIndex)[0];
    const leading = parts.slice(lastIndex, thisIndex - 1);
    const prior = parts[thisIndex - 1];
    const stripped = strip(prior);
    if (/^\d+$/.test(stripped) && stripped.length === 2) {
      const scores = stripped.split('');
      const diff = Math.abs(scores.reduce((a, b) => +a - +b));
      if (diff === 1) {
        const joined = [leading.join(' '), [prior, floatingTiebreak].join('')].join(' ');
        joinedScore += joined;
        lastIndex = thisIndex + 1;
      } else if (diff === 0) {
        const sameScore = Math.max(...scores);
        if ([4, 5, 6, 7, 8, 9].includes(sameScore)) {
          const pairedScore = [6, 4].includes(sameScore) ? sameScore + 1 : sameScore - 1;
          const setScore = [sameScore, pairedScore].sort().reverse().join('-');
          const joined = [leading.join(' '), [setScore, floatingTiebreak].join('')].join(' ');
          joinedScore += joined;
          lastIndex = thisIndex + 1;
        }
      }
    }
  }

  if (floatingTiebreaks.length && joinedScore.length) {
    const remainder = parts.slice(lastIndex).join(' ');
    joinedScore = [joinedScore, remainder].join(' ');
    return joinedScore;
  }

  if (parts.length === 2 && ['(', '['].some((punctuation) => parts[1].includes(punctuation))) {
    const stripped = strip(parts[0]);
    const scores = stripped.split('');
    const diff = Math.abs(scores.reduce((a, b) => +a - +b));
    if (diff === 1) {
      parts[1] = bracketToParen(parts[1]);
      return parts.join('');
    }
  }

  const parenScores = parts.map((part) => (isBracketScore(part) && 'bracket') || (isDiffOne(part) && 'set'));
  if (parenScores.includes('set') && parenScores.includes('bracket')) {
    let lastPart;
    let joinedParts = '';
    parts.forEach((part, i) => {
      if (parenScores[i] === 'bracket' && lastPart === 'set') {
        part = bracketToParen(part);
        joinedParts += part;
      } else {
        joinedParts += ` ${part}`;
      }
      lastPart = parenScores[i];
    });
    return joinedParts;
  }

  // recognize tiebreak scores which look like sets s#-s# tb#-tb#
  parts = score.split(' ');
  let lastSet;
  const profile = parts.map((part) => {
    const re = new RegExp(/^(\d+)-(\d+)$/); // only consider sets which have no existing tiebreak score
    if (re.test(part)) {
      const [n1, n2] = part.match(re).slice(1);
      const diff = Math.abs([n1, n2].reduce((a, b) => +a - +b));
      const max = Math.max(n1, n2);
      if (diff === 1) {
        lastSet = 'tiebreakSet';
        return lastSet;
      } else if (diff >= 2 && max >= 7 && lastSet === 'tiebreakSet') {
        lastSet = 'tiebreak';
        return lastSet;
      }
    }
  });

  const tiebreakIndices = indices('tiebreak', profile);
  if (tiebreakIndices.length) {
    let joinedParts = '';
    parts.forEach((part, i) => {
      if (tiebreakIndices.includes(i)) {
        joinedParts += `(${part}) `;
      } else if (tiebreakIndices.includes(i + 1)) {
        joinedParts += `${part}`;
      } else {
        joinedParts += `${part} `;
      }
    });
    score = joinedParts.trim();
  }

  return score;
}