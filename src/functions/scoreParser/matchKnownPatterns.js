export function matchKnownPatterns({ score }) {
  for (const punctuation of ['.', ',', ' ', '/']) {
    const re = new RegExp(`^(\\d+)\\${punctuation}(\\d+)$`);
    if (re.test(score)) {
      const numbers = score.match(re).slice(1);
      const diff = Math.abs(numbers[0] - numbers[1]);
      if (diff <= 10 && diff >= 2) {
        score = score.split(punctuation).join('-');
      }
    }
  }

  // insert spaces before and after parentheses
  const noSpacing = /^\d{3,}\(/;
  const parenStart = /^\(\d+\)\d+/;
  const considerations = [noSpacing, parenStart];
  considerations.forEach(() => {
    const parts = score.split(' ');
    score = parts
      .map((part) => {
        if (noSpacing.test(part)) {
          part = part.replace('(', ' (');
        }
        if (parenStart.test(part)) {
          part = part.replace(')', ') ');
        }
        return part;
      })
      .join(' ');
  });

  const setSpacing = /^(\d+)[ -](\d+)$/;
  const slashSeparation = /^([\d -]+)\/([\d -]+)$/;
  if (slashSeparation.test(score)) {
    const [left, right] = score.match(slashSeparation).slice(1);
    const s1 = left.trim();
    const s2 = right.trim();
    if (setSpacing.test(s1) && setSpacing.test(s2)) {
      const set1 = s1.match(setSpacing).slice(1, 3).join('-');
      const set2 = s2.match(setSpacing).slice(1, 3).join('-');
      score = `${set1} ${set2}`;
    }
  }
  const commaSeparation = /^([\d -]+),([\d -]+)$/;
  if (commaSeparation.test(score)) {
    const [left, right] = score.match(commaSeparation).slice(1);
    const s1 = left.trim();
    const s2 = right.trim();
    if (setSpacing.test(s1) && setSpacing.test(s2)) {
      const set1 = s1.match(setSpacing).slice(1, 3).join('-');
      const set2 = s2.match(setSpacing).slice(1, 3).join('-');
      score = `${set1} ${set2}`;
    }
  }

  // pattern \d+-\d{2}-\d+ => \d-\d \d-\d
  const noSetSeparation = /(\d+)-(\d{2})-(\d+)/;
  if (noSetSeparation.test(score)) {
    const [left, middle, right] = score.match(noSetSeparation).slice(1);
    const separated = middle.split('');
    const reformatted = `${left}-${separated[0]} ${separated[1]}-${right}`;
    score = score.replace(noSetSeparation, reformatted);
  }

  let spaceSeparatedSets = score.match(/\d \d /);
  spaceSeparatedSets?.forEach((ss) => {
    const replacement = ss
      .slice(0, ss.length - 1)
      .split(' ')
      .join('-');
    score = score.replace(ss, replacement);
  });

  spaceSeparatedSets = score.match(/ \d \d$/);
  spaceSeparatedSets?.forEach((ss) => {
    const replacement = ' ' + ss.slice(1).split(' ').join('-');
    score = score.replace(ss, replacement);
  });

  return { score };
}
