export const hasNumeric = (value) => /\d+/.test(value);
export const isString = (value) => typeof value === 'string';
export const isNumeric = (value) => /^\d+(a)?$/.test(value);
export const isScoreLike = (value) => /^[\d,-/() ]+[A-Za-z.]*$/.test(value);
export const isObject = (value) => typeof value === 'object';
