export function validRanking(value) {
  return /^\d+$/.test(value) || /^MR\d+$/.test(value);
}

export function isValidRegex(expression) {
  let parts = expression.split('/'),
    regex = expression,
    options = '';
  if (parts.length > 1) {
    regex = parts[1];
    options = parts[2];
  }
  try {
    new RegExp(regex, options);
    return true;
  } catch (e) {
    return false;
  }
}
