import { correctContainerMismatch } from './correctContainerMismatch';
import { instanceCount } from '../../utilities/convenience';
import { isContained } from './utilities';

export function punctuationAdjustments({ score }) {
  score = correctContainerMismatch(score);

  // convert (# - # ) => (#-#)
  const bwsg = /\(([\d- ]+)\)/g;
  const bws = /\(([\d- ]+)\)/;
  const ws = score.match(bwsg);
  for (const s of ws || []) {
    const [v] = s.match(bws).slice(1);
    const trimmedBracketValue = v.replace(/ /g, '');
    score = score.replace(s, `(${trimmedBracketValue})`);
  }

  // repeating dash or dash with comma
  const repeatingDash = new RegExp(/[-,]{2,}/g);
  score = score.replace(repeatingDash, '-');

  // dash space or space dash
  ['- ', ' -'].forEach((dashScenario) => {
    const dashSpace = new RegExp(`(\\d+)${dashScenario}(\\d+)`, 'g');
    const spacedDash = score.match(dashSpace);
    if (spacedDash) {
      spacedDash.forEach((spaced) => (score = score.replace(spaced, spaced.split(dashScenario).join('-'))));
    }
  });

  // remove trailing puncutation
  '-/,'.split('').forEach((punctuation) => {
    if (score.endsWith(punctuation)) score = score.slice(0, score.length - 1);
  });

  let missingOpenParen, missingCloseParen, missingCloseBracket, noClose, counts;

  const getMissing = () => {
    counts = instanceCount(score.split(''));
    missingCloseParen = counts['('] === (counts[')'] || 0) + 1;
    missingOpenParen = (counts['('] || 0) + 1 === counts[')'];
    missingCloseBracket = counts['['] === counts[']'] + 1;
    noClose = missingCloseParen && !missingCloseBracket;
  };
  getMissing();

  // space slash surrounded by digits
  if (/\d \/\d/.test(score)) score = score.replace(/ \//g, '/');
  // all other space slashes are replaced by space
  if (score.includes(' /')) score = score.replace(/ \//g, ' ');
  if (score.includes('/)')) score = score.replace(/\/\)/g, ')');
  if (score.includes('(/')) score = score.replace(/\(\//g, '(');

  const unclosed = /(\d+-\d+\(\d+)0,/;
  if (unclosed.test(score)) {
    const [setScore] = score.match(unclosed).slice(1);
    score = score.replace(unclosed, setScore + ')');
  }

  if (counts['('] === counts[')'] && counts['('] > 1) {
    const parts = score.split(')(').join(') (').split(' ');
    if (parts.every(isContained)) {
      score = parts
        .map((part) => {
          const innards = part.slice(1, part.length - 1);
          return innards.length > 2 ? innards : part;
        })
        .join(' ');
    } else {
      score = parts.join(' ');
    }
  }

  getMissing();

  const hasAlpha = /[A-Za-z]+/.test(score);
  const hasDigits = /\d+/.test(score);

  if (!hasAlpha && !hasDigits) return { score: '' };

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
    getMissing();
  }

  if (counts['('] === 1 && !counts[')'] && score[0] === '(') {
    score = score + ')';
    getMissing();
  }

  if (counts['('] > (counts[')'] || 0) && score.slice(0, 2) === '((') {
    score = score.slice(1);
  }

  if (missingOpenParen && /^9\d/.test(score)) {
    score = '(' + score.slice(1);
  } else if (missingOpenParen) {
    if (score[0] !== '(') score = '(' + score;
  }

  if (counts[')'] > (counts['('] || 0)) {
    if (score[0] === ')') score = '(' + score.slice(1);
  }

  if (noClose && (score.endsWith(9) || /\d{1,}0$/.test(score))) {
    score = score.slice(0, score.length - 1) + ')';
    getMissing();
  }

  if (noClose && (!score.endsWith(')') || score.startsWith('(('))) {
    score = score + ')';
    getMissing();
  }

  if (noClose) {
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

  if (missingCloseBracket && !missingCloseParen) score = score + ']';

  // this is potentially problematic as enclosing with '[]' yields tiebreak...
  // ... wheres enclosing with '()' yields a set which gets converted to a supertiebreak!
  // Really it would be better to convert to set and determine later which type of tiebreak based on previous set
  if (score.includes('([') && score.includes('])')) {
    score = score.split('([').join('[').split('])').join(']');
  }

  if (/\(\d+0$/.test(score)) {
    score = score.slice(0, score.length - 1) + ')';
  }

  counts = instanceCount(score.split(''));

  if (counts[')'] === 1 && !counts['('] && score.endsWith(')')) {
    score = score.slice(0, score.length - 1);
  }

  if (score.startsWith('(') && score.endsWith(')') && counts['('] === 1 && counts[')'] === 1) {
    score = score.slice(1, score.length - 1);
  }

  return { score };
}
