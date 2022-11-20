import { getNonBracketedValue, getSeeding, hasBracketedValue } from '../utilities/convenience';
import { expect, it } from 'vitest';

const scenarios = [
  { value: '3-6, 6-3, 7-6(1)', bracketValue: true, seedValue: undefined, nonBracketedValue: '3-6, 6-3, 7-6' },
  { value: 'participant (1)', bracketValue: true, seedValue: 1, nonBracketedValue: 'participant' },
  { value: '(1)', bracketValue: true, seedValue: undefined, nonBracketedValue: undefined },
  { value: 1, bracketValue: false, seedValue: undefined, nonBracketedValue: 1 }
];

it.each(scenarios)('can recognize and extract seedValues', ({ value, bracketValue, seedValue, nonBracketedValue }) => {
  expect(getNonBracketedValue(value)).toEqual(nonBracketedValue);
  expect(hasBracketedValue(value)).toEqual(bracketValue);
  expect(getSeeding(value)).toEqual(seedValue);
});
