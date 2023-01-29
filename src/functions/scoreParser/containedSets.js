import { instanceCount, indices } from '../../utilities/convenience';
import { dashJoin, isDiffOne, isTiebreakScore } from './utilities';
import { isNumeric } from '../../utilities/identification';

export function containedSets({ score, attributes }) {
  if (typeof score !== 'string') return { score };

  const withParens = new RegExp(/\([\d,/ ]+\)/g);
  const contained = score.match(withParens);
  contained?.forEach((container) => {
    let innards = dashJoin(container.match(/^\((.*)\)$/)[1]);
    const dashIndices = indices('-', innards.split(''));
    const numbers = innards.split('-');
    const eventNumberCount = !(numbers.length % 2);
    const oddDashCount = !!(dashIndices.length % 2);
    // handle situation where too many dashes join what should be sets
    // multiple sets were found within a parenthetical
    if (eventNumberCount && oddDashCount && dashIndices.length > numbers.length / 2) {
      const spaceIndices = dashIndices.filter((_, i) => i % 2);
      spaceIndices.forEach((index) => {
        innards = innards.substring(0, index) + ' ' + innards.substring(index + 1);
      });
    }
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
  }

  let counts = instanceCount(score.split(''));
  if (counts['('] === 1 && counts[')'] === 1 && score.startsWith('(') && score.endsWith(')')) {
    score = score.slice(1, score.length - 1);

    // is a tiebreakSet; check for valid removed tiebreak value
    if (counts['-'] === 1 && isDiffOne(score) && isNumeric(attributes?.removed)) {
      score = score + `(${attributes.removed})`;
      attributes.removed = undefined;
    }
  }

  return { score };
}
