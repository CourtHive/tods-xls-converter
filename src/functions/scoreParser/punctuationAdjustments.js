import { correctContainerMismatch } from './correctContainerMismatch';
import { instanceCount } from '../../utilities/convenience';

function isContained(part) {
  return part.startsWith('(') && part.endsWith(')');
}

export function punctuationAdjustments(score) {
  score = correctContainerMismatch(score);
  const counts = instanceCount(score.split(''));

  if (counts['('] === counts[')'] && counts['('] > 1) {
    const parts = score.split(')(').join(') (').split(' ');
    if (parts.every(isContained)) {
      score = parts
        .map((part) => {
          const innards = part.slice(1, part.length - 1);
          return innards.length > 2 ? innards : part;
        })
        .join(' ');
    }
  }

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
