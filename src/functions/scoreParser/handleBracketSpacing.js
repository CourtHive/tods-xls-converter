import { standardSetComma, tiebreakSetComma } from './validPatterns';

export function handleBracketSpacing({ score }) {
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

  [standardSetComma, tiebreakSetComma].forEach((setComma) => {
    const setsEndComma = score.match(setComma);
    if (setsEndComma?.length) {
      setsEndComma.forEach((commaEnd) => {
        score = score.replace(commaEnd, commaEnd.slice(0, commaEnd.length - 1) + ' ');
      });
    }
  });

  // remove extraneous spaces
  score = score.split(' ').filter(Boolean).join(' ');

  return { score };
}
