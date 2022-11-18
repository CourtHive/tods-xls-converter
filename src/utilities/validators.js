export function validRanking(value) {
  return /^\d+$/.test(value) || /^MR\d+$/.test(value);
}
