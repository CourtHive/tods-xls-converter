export const hasNumeric = (value) => /\d+/.test(value);
export const isString = (value) => typeof value === 'string';
export const isNumeric = (value) => /^\d+(a)?$/.test(value);
export const isScoreLike = (value) => {
  return /^[\d,-/() ]+[A-Za-z.]*$/.test(excludeSingleDigits(value));
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
  const parts = value.toString().split(' ');
  const firstDigitPart = parts.find((part) => /\d/.test(part));
  const firstDigitIndex = parts.indexOf(firstDigitPart);
  return [parts.slice(0, firstDigitIndex).join(' '), parts.slice(firstDigitIndex).join(' ')];
}
export function digitsCount(value) {
  return (value.match(/\d/g) || []).length;
}
export function getPotentialResult(value) {
  const splitValue = splitValueOnFirstDigit(value);
  const potentialResult = excludeSingleDigits(splitValue?.[1]);
  const isPotential = isScoreLike(potentialResult) && digitsCount(potentialResult) > 1;
  return { leader: splitValue?.[0], potentialResult: isPotential && potentialResult };
}
