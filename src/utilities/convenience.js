import { utilities } from 'tods-competition-factory';
import { getRow } from '../functions/sheetAccess';
import { getWorkbook } from '../global/state';

export function maxInstance(values) {
  const valueCounts = utilities.instanceCount(values);
  const valueInstances = Math.max(0, ...Object.values(valueCounts));
  return Object.keys(valueCounts).reduce((p, c) => (valueCounts[c] === valueInstances ? c : p), undefined);
}

export const hasNumeric = (value) => /\d+/.test(value);
export const isString = (value) => typeof value === 'string';
export const isNumeric = (value) => /^\d+(a)?$/.test(value);
export const isObject = (value) => typeof value === 'object';
export const removeBits = (value, remove = []) => {
  remove.forEach((replace) => {
    if (['(', ')'].includes(replace)) {
      value = isString(value) ? value.split(replace).join('') : value;
    } else {
      const re = new RegExp(replace, 'g');
      value = isString(value) ? value.replace(re, '') : value;
    }
  });
  return value;
};
export const removeTrailing = (value, remove = ['.', ':', ',']) => {
  if (remove.some((r) => value.endsWith(r))) return value.slice(0, value.length - 1);
  return value;
};
export const tidyValue = (value) => (isString(value) ? removeTrailing(value.trim()) : value);

export const keyRowSort = (a, b) => parseInt(getRow(a)) - parseInt(getRow(b));

const isAlpha = (value) => /^[a-zA-Z- ]+$/.test(value);
export const onlyAlpha = (value, profile) =>
  Array.isArray(profile?.considerAlpha) ? isAlpha(removeBits(value, profile.considerAlpha)) : isAlpha(value);
export const onlyNumeric = (value, profile) => profile.considerNumeric?.includes(value) || isNumeric(value);
export const isSkipWord = (value, profile) =>
  (profile.skipWords || []).some((skipWord) => processSkipWord(skipWord, value));

export const startsWithIterator = (value) => isString(value) && /^\d\s/.test(value.trim());
export const hasBracketedValue = (value) => isString(value) && /\(\d+\)$/.test(value.trim());
export const matchSeeding = (value) => value.match(/^(.+)\((\d+)\)$/);
export const getSeeding = (value) => {
  if (typeof value !== 'string') return;
  const matchValues = matchSeeding(value);
  if (!matchValues) return;
  const profile = getWorkbook()?.workbookType?.profile;
  const isParticipant = onlyAlpha(matchValues[1], profile);
  return hasBracketedValue(value) && isParticipant && matchValues[2] ? parseInt(matchValues[2]) : undefined;
};
export const getNonBracketedValue = (value) => {
  if (!hasBracketedValue(value)) return value;
  const matchValues = matchSeeding(value);
  if (!matchValues) return;
  const nonBracketedValue = matchSeeding(value)[1];
  return typeof nonBracketedValue === 'string' ? nonBracketedValue.trim() : nonBracketedValue;
};

// ensure that the key is of the form [A-Z][#], not 'AA1', for example
export const keyHasSingleAlpha = (key) => key && key.length > 1 && isNumeric(key[1]);

function getSkipOptions(skipObj) {
  const { text, ...options } = skipObj;
  if (text);
  return options;
}
export function processSkipWord(skipWord, value) {
  const text = (isObject(skipWord) ? skipWord?.text || '' : skipWord).toLowerCase();
  const options = isObject(skipWord) ? getSkipOptions(skipWord) : { startsWith: true };
  const lowerValue = value.toLowerCase();

  const { includes, startsWith, endsWith, startsWithEndsWith, remove } = options;
  const modifiedValue = remove ? removeBits(lowerValue, remove) : lowerValue;

  if (includes) {
    return modifiedValue.includes(text);
  } else if (startsWith) {
    return modifiedValue.startsWith(text);
  } else if (endsWith) {
    return modifiedValue.endsWith(text);
  } else if (startsWithEndsWith) {
    const { startsWith, endsWith } = startsWithEndsWith;
    const goodStart = Array.isArray(startsWith)
      ? startsWith.some((start) => modifiedValue.startsWith(start.toString()))
      : modifiedValue.startsWith(startsWith);
    const goodEnd = Array.isArray(endsWith)
      ? endsWith.some((end) => modifiedValue.startsWith(end))
      : modifiedValue.endsWith(endsWith);
    return goodStart && goodEnd;
  }
}

export function containsExpression(value, expression) {
  const re = new RegExp(expression, 'g');
  return value && re.test(value);
}
