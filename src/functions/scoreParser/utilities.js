export function isTiebreakScore(part) {
  return /^\(\d+\)$/.test(part) || /^\(\d+$/.test(part);
}

export function isBracketScore(part) {
  return /^\(\d+-\d+\)$/.test(part) || /^\[\d+-\d+\]$/.test(part);
}

export function isDiffOne(score) {
  const strip = (value) => value?.split('-').join('').split('/').join('');
  const stripped = strip(score);
  if (/^\d+$/.test(stripped) && stripped.length === 2) {
    const scores = stripped.split('');
    const diff = Math.abs(scores.reduce((a, b) => +a - +b));
    return diff === 1;
  }
}
