import { getNonBracketedValue, getSeeding, hasBracketedValue } from '../utilities/convenience';
import { hasNumeric } from '../utilities/identification';
import { expect, it, test } from 'vitest';

const scenarios = [
  {
    value: 'participant 3-6, 6-3, 7-6(1)',
    bracketValue: true,
    seedValue: undefined,
    nonBracketedValue: 'participant 3-6, 6-3, 7-6'
  },
  { value: '3-6, 6-3, 7-6(1)', bracketValue: false, seedValue: undefined, nonBracketedValue: '3-6, 6-3, 7-6(1)' }, // no alpha leader
  { value: 'participant (1)', bracketValue: true, seedValue: 1, nonBracketedValue: 'participant' },
  { value: 'participant [1]', bracketValue: true, seedValue: 1, nonBracketedValue: 'participant' },
  { value: '(1)', bracketValue: false, seedValue: undefined, nonBracketedValue: '(1)' }, // no alpha leder
  { value: 1, bracketValue: false, seedValue: undefined, nonBracketedValue: 1 }
];

it.each(scenarios)('can recognize and extract seedValues', ({ value, bracketValue, seedValue, nonBracketedValue }) => {
  expect(hasBracketedValue(value)).toEqual(bracketValue);
  expect(getNonBracketedValue(value)).toEqual(nonBracketedValue);
  expect(getSeeding(value)).toEqual(seedValue);
});

test('can identify strings containing numeric values', () => {
  expect(hasNumeric('abc123')).toEqual(true);
  expect(hasNumeric('abc')).toEqual(false);
});
