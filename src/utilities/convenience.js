import { utilities } from 'tods-competition-factory';

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
