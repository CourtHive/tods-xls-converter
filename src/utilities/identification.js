export const hasNumeric = (value) => /\d+/.test(value);
export const isString = (value) => typeof value === 'string';
export const isNumeric = (value) => /^\d+(a)?$/.test(value);
export const isScoreLike = (value) => {
  return /^[\d,-/() [\]]+[A-Za-z.]*$/.test(excludeSingleDigits(value));
};
export const isObject = (value) => typeof value === 'object';
export function excludeSingleDigits(value) {
  return value
    ?.toString()
    .split(' ')
    .filter((p) => !/^\d$/.test(p))
    .join(' ');
}
export function splitValueOnFirstDigit(value) {
  if (!value) return;
  const parts = value.toString().toLowerCase().split(' ').filter(Boolean);
  const firstDigitPart = parts.find((part) => /\d+/.test(part));
  const firstDigitIndex = parts.indexOf(firstDigitPart);
  return parts.length >= 2
    ? [parts.slice(0, firstDigitIndex + 1).join(' '), parts.slice(firstDigitIndex + 1).join(' ')]
    : undefined;
}
export function digitsCount(value) {
  return (value.match(/\d/g) || []).length;
}
export function getPotentialResult(value) {
  const splitValue = splitValueOnFirstDigit(value);
  let potentialResult = excludeSingleDigits(splitValue?.[1]);

  let isPotential = isScoreLike(potentialResult) && digitsCount(potentialResult) > 1;

  const stringValue = value?.toString().toLowerCase();
  const splitter = stringValue.indexOf(':') ? ':' : ' ';
  const lastPart = stringValue.split(splitter).reverse()[0];

  if (['walkover', 'wo', 'w/o'].includes(lastPart)) {
    potentialResult = 'WALKOVER';
    isPotential = true;
  }

  const potentialPosition = /^\d+$/.test(splitValue?.[0]) ? parseInt(splitValue[0]) : '';

  return { potentialPosition, potentialResult: isPotential && potentialResult };
}
