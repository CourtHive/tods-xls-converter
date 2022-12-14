import { isString } from './identification';

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

export function contextAnalisys(fileResults) {
  return Object.values(fileResults).flatMap((f) =>
    Object.values(f.sheetAnalysis).map((s) => ({ fileName: f.fileName, sheetName: s.sheetName, ...s.analysis }))
  );
}
