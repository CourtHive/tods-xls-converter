import { utilities } from 'tods-competition-factory';
import { getWorkbook } from '..';
import { getRow } from '../functions/sheetAccess';

export function maxInstance(values) {
  const valueCounts = utilities.instanceCount(values);
  const valueInstances = Math.max(0, ...Object.values(valueCounts));
  return Object.keys(valueCounts).reduce((p, c) => (valueCounts[c] === valueInstances ? c : p), undefined);
}

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

const onlyAlpha = (value, profile) => profile?.considerAlpha?.includes(value) || /^[a-zA-Z- ]+$/.test(value);

export const hasBracketedValue = (value) => typeof value === 'string' && /\(\d+\)$/.test(value.trim());
export const matchSeeding = (value) => value.match(/^(.+)\((\d+)\)$/);
export const getSeeding = (value) => {
  const matchValues = matchSeeding(value);
  const profile = getWorkbook()?.workbookType?.profile;
  const isParticipant = onlyAlpha(matchValues[1], profile);
  return hasBracketedValue(value) && isParticipant && matchValues[2];
};
export const extractNonBracketedValue = (value) => hasBracketedValue(value) && matchSeeding(value)[1];
export const removeSeeding = (value) =>
  typeof value === 'string' ? (extractNonBracketedValue(value) || value).trim() : value;
