const setTypes = ['\\d+-\\d+', '\\d+-\\d+\\(\\d+\\)', '\\[\\d+-\\d+\\]'];
// prettier-ignore
const patternGenerator = [
  '0', '1', '2', '00', '01', '10', '11',
  '002', '012', '102', '112', 
  '000', '001', '010', '100', '011', '101',
  '110', '111', '002', '012', '102', '112',
  '0002', '0012', '0102', '1002',
  '0112', '1012', '1102', '1112'
];
const regularExpressions = patternGenerator.map((pattern) => {
  const indices = pattern.split('');
  const expression = indices.map((index) => setTypes[index]).join(' ');
  return new RegExp(`^${expression}$`);
});

export function isValidPattern(score) {
  return !score || regularExpressions.some((re) => re.test(score));
}
