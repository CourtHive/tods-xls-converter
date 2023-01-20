import { dashJoin, isTiebreakScore } from './utilities';

export function containedSets(score) {
  if (typeof score !== 'string') return score;

  const withParens = new RegExp(/\([\d,/ ]+\)/g);
  const contained = score.match(withParens);
  contained?.forEach((container) => {
    const innards = dashJoin(container.match(/^\((.*)\)$/)[1]);
    score = score.replace(container, `(${innards})`).trim();
  });

  const withBrackets = new RegExp(/\[[\d,/ ]+\]/g);
  const bracketed = score.match(withBrackets);
  bracketed?.forEach((container) => {
    const innards = dashJoin(container.match(/^\[(.*)\]$/)[1]);
    score = score.replace(container, `(${innards}) `).trim();
  });

  const potentialEndings = [')', ']'];
  const potentialMiddles = [')(', '), (', ') (', ')[', `) [`, '](', '] ('];
  if (
    score.startsWith('(') &&
    potentialEndings.some((ending) => score.endsWith(ending)) &&
    potentialMiddles.some((middle) => score.includes(middle))
  ) {
    let newScore = '';
    const parts = score
      .split(/[)\]]/)
      .filter(Boolean)
      .map((part) => {
        if (part.startsWith(',')) part = part.slice(1);
        return part.trim();
      });
    const commadDelimited = parts.every((part) => part.includes(',') || isTiebreakScore(part));
    const slashDelimited = parts.every((part) => part.includes('/') || isTiebreakScore(part));
    const dashDelimited = parts.every((part) => part.includes('-') || isTiebreakScore(part));
    const delimiter = (commadDelimited && ',') || (dashDelimited && '-') || (slashDelimited && '/');

    if (delimiter) {
      let lastPart;
      parts.forEach((part) => {
        if (part.startsWith('(')) {
          // is a set score
          if (lastPart === 'set') newScore += ' ';

          if (part.includes(delimiter)) {
            newScore += part
              .slice(1)
              .split(delimiter)
              .map((s) => s.trim())
              .join('-');
            lastPart = 'set';
          } else {
            const value = part.slice(1);
            newScore += `(${value}) `;
            lastPart = 'tiebreak';
          }
        } else if (part.startsWith('[')) {
          const values = part
            .slice(1)
            .split(delimiter)
            .map((s) => parseInt(s.trim()));
          const highValue = Math.min(...values);
          // is a tiebreak score
          if (lastPart === 'set') {
            newScore += `(${highValue}) `;
          } else {
            newScore += `[${values.join('-')}] `;
          }
          lastPart = 'tiebreak';
        }
      });

      score = newScore.trim();
    }
    /*
  } else if (score.startsWith('(') && score.endsWith(')')) {
    const result = score.slice(1, score.length - 1);
    const values = result.split(',');

    // handle (6-2, 6-4)
    const multipleResults = values.length > 1 && values.some((v) => v.includes('-') || v.includes('/'));

    if (multipleResults) {
      score = values.map((value) => value.trim()).join(' ');
    } else {
      // handle 6, 3 | 9 3 | 93 | 9,3 | 9/3 | 9, 3
      score = result
        .split(/[, -/]/)
        .filter(Boolean)
        .join('-');
    }
    console.log('xxx', { multipleResults, score, result });
    */
  }

  return score;
}
