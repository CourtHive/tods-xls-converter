import { utilities } from 'tods-competition-factory';
import { isNumeric } from '../utilities/convenience';

export function getColumnCharacter({ columnProfile, attributeMap }) {
  const { consecutiveNumbers, containsNumeric, containsAlpha, values, lastNumericValue, column } = columnProfile;

  if (
    consecutiveNumbers &&
    lastNumericValue > 0 &&
    (utilities.isPowerOf2(lastNumericValue) ||
      (lastNumericValue < values.length && utilities.isPowerOf2(values.length)))
  ) {
    const character = containsAlpha ? 'preRound' : 'position';
    columnProfile.character = character;
    if (!attributeMap[column]) attributeMap[column] = character;
  }

  if (containsNumeric && containsAlpha) {
    // check whether there is clear separation between numeric and alpha values
    // and whether numeric values occur before alpha values
    const numericMap = values.map(isNumeric);
    const lastNumeric = numericMap.lastIndexOf(true);
    const firstAlpha = numericMap.indexOf(false);
    if (firstAlpha > lastNumeric) columnProfile.values = values.slice(firstAlpha);
  }
}
