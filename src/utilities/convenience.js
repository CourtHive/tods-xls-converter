import { utilities, matchUpStatusConstants } from 'tods-competition-factory';
import { isNumeric, isObject, isString } from './identification';
import { getWorkbook } from '../global/state';
import { removeBits } from './transformers';

import { POSITION } from '../constants/columnConstants';
const { BYE } = matchUpStatusConstants;

export function indices(val, arr) {
  return arr.reduce((a, e, i) => {
    if (e === val) a.push(i);
    return a;
  }, []);
}
export function instanceCount(values) {
  return values.reduce((a, c) => {
    if (!a[c]) a[c] = 0;
    a[c]++;
    return a;
  }, {});
}
export function maxInstance(values) {
  const valueCounts = utilities.instanceCount(values);
  const valueInstances = Math.max(0, ...Object.values(valueCounts));
  return Object.keys(valueCounts).reduce((p, c) => (valueCounts[c] === valueInstances ? c : p), undefined);
}

export const isFloatValue = (value) => !isNaN(Number(value)) && !Number.isInteger(Number(value));
export const removeChars = (str, chars = []) =>
  chars.reduce((result, char) => (result || str).toString().split(char).join(''), undefined);

export const removeTrailing = (value, remove = ['.', ':', ',']) => {
  if (remove.some((r) => value.endsWith(r))) return value.slice(0, value.length - 1);
  return value;
};
export const tidyValue = (value) => (isString(value) ? removeTrailing(value.trim()) : value);
export const tidyLower = (value) => (isString(value) ? tidyValue(value.trim()).toLowerCase() : value);

export const isBye = (participant) =>
  (typeof participant === 'object' ? Object.values(participant) : [participant]).some(
    (value) => isString(value) && value.toLowerCase() === BYE.toLowerCase()
  );

const isAlpha = (value) => /^[a-zA-Z- ]+$/.test(value);
export const onlyAlpha = (value, profile) =>
  Array.isArray(profile?.considerAlpha) ? isAlpha(removeBits(value, profile.considerAlpha)) : isAlpha(value);
export const onlyNumeric = (value, profile) => profile.considerNumeric?.includes(value) || isNumeric(value);
export const isSkipWord = (value, profile) =>
  (profile.skipWords || []).some((skipWord) => processSkipWord(skipWord, value));

export const startsWithIterator = (value) => isString(value) && /^\d\s/.test(value.trim());
export const hasBracketedValue = (value) => isString(value) && /^[A-Za-z]+.*[([]{1}\d+[)\]]{1}$/.test(value.trim());
export const matchSeeding = (value) => value.match(/^(.+)[([]{1}(\d+)[)\]]{1}$/);
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

export const withoutQualifyingDesignator = (value, qualifyingIdentifiers = []) => {
  if (!isString(value)) return value;

  for (const identifier of qualifyingIdentifiers) {
    if (value.toLowerCase().startsWith(`${identifier.toLowerCase()} `)) {
      const withoutIdentifier = value.split(' ').slice(1).join(' ');
      return withoutIdentifier;
    }
  }
  return value;
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

  const { exact, includes, startsWith, endsWith, startsWithEndsWith, remove } = options;
  const modifiedValue = remove ? removeBits(lowerValue, remove) : lowerValue;

  if (exact) {
    return modifiedValue === text;
  } else if (includes) {
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

export function getPositionColumn(columnProfiles) {
  const positionColumnProfile = columnProfiles.find(({ attribute, character }) =>
    [attribute, character].includes(POSITION)
  );
  return {
    positionColumn: positionColumnProfile?.column,
    positionColumnProfile
  };
}

export function getLongestName(str) {
  return str
    .split(' ')
    .sort(function (a, b) {
      return a.length - b.length;
    })
    .pop();
}
