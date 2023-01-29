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

  const singleSetCommaSeparation = /^\d \d,/;
  if (singleSetCommaSeparation.test(score)) {
    const set = score.match(singleSetCommaSeparation)[0];
    const replacement = set
      .slice(0, set.length - 1)
      .split(' ')
      .join('-');
    score = score.replace(set, replacement);
  }

  // pattern \d+-\d{2}-\d+ => \d-\d \d-\d
  let failSafe = 0;
  const noSetSeparation = /(\d+)-(\d{2})-(\d+)/;
  while (noSetSeparation.test(score) && failSafe < 3) {
    const [left, middle, right] = score.match(noSetSeparation).slice(1);
    const separated = middle.split('');
    const reformatted = `${left}-${separated[0]} ${separated[1]}-${right}`;
    score = score.replace(noSetSeparation, reformatted);
    failSafe += 1;
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

  // slash separated sets with comma separated games
  // pattern /\d+,\s?\d/+\/\d+\s?\d+/
  const slashCommaSets = /^\d, *\d\/\d, *\d/;
  if (slashCommaSets.test(score)) {
    const excerpt = score.match(slashCommaSets)[0];
    const replacement =
      excerpt
        .split('/')
        .map((e) => `(${e})`)
        .join(' ') + ' ';
    score = score.replace(excerpt, replacement);
  }

  const missedSet0 = /\(6-\)/g;
  if (missedSet0.test(score)) {
    score = score.replace(missedSet0, '(6-0)');
  }

  // IMPORTANT: must occur last...
  const slashSetGlobal = /(?<!-)(\d+)\/(\d+)(?!-)/g;
  if (slashSetGlobal.test(score)) {
    const slashSets = score.match(slashSetGlobal);
    const slashSet = /(?<!-)(\d+)\/(\d+)(?!-)/;
    let newScore = score;
    slashSets.forEach((set) => {
      const [s1, s2] = set.match(slashSet).slice(1);
      const dashSet = `${s1}-${s2}`;
      newScore = newScore.replace(set, dashSet);
    });
    score = newScore;
  }

  return { score };
}
