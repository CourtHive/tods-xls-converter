import { utilities } from 'tods-competition-factory';
import { getWorkbook } from '..';
import { getRow } from '../functions/sheetAccess';

export function maxInstance(values) {
  const valueCounts = utilities.instanceCount(values);
  const valueInstances = Math.max(0, ...Object.values(valueCounts));
  return Object.keys(valueCounts).reduce((p, c) => (valueCounts[c] === valueInstances ? c : p), undefined);
}

export const isString = (value) => typeof value === 'string';
export const isNumeric = (value) => /^\d+(a)?$/.test(value);
export const isObject = (value) => typeof value === 'object';
export const removeBits = (value, remove = []) => {
  remove.forEach((replace) => {
    const re = new RegExp(replace, 'g');
    value = value.replace(re, '');
  });
  return value;
};

export const keyRowSort = (a, b) => parseInt(getRow(a)) - parseInt(getRow(b));

export const onlyAlpha = (value, profile) => profile?.considerAlpha?.includes(value) || /^[a-zA-Z- ]+$/.test(value);
export const onlyNumeric = (value, profile) => profile.considerNumeric?.includes(value) || isNumeric(value);

export const hasBracketedValue = (value) => typeof value === 'string' && /\(\d+\)$/.test(value.trim());
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
