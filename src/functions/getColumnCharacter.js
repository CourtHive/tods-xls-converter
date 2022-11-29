import { isNumeric } from '../utilities/identification';
import { utilities } from 'tods-competition-factory';

import { POSITION, PRE_ROUND } from '../constants/columnConstants';
import { ROUND_ROBIN } from '../constants/sheetTypes';

export function getColumnCharacter({ attributeMap, columnIndex, columnProfile, sheetType }) {
  const { consecutiveNumbers, containsNumeric, containsAlpha, values, lastNumericValue, column, allNumeric } =
    columnProfile;

  const numericCheck = consecutiveNumbers && lastNumericValue > 0;
  const knockOutCheck =
    utilities.isPowerOf2(lastNumericValue) || (lastNumericValue < values.length && utilities.isPowerOf2(values.length));

  // preRound and position columns cannot occur beyond 4th column
  if (columnIndex < 4 && numericCheck && (sheetType === ROUND_ROBIN ? allNumeric : knockOutCheck)) {
    const character = containsAlpha ? PRE_ROUND : POSITION;
    columnProfile.character = character;
    if (!attributeMap[column]) attributeMap[column] = character;
  }

  if (containsNumeric && containsAlpha) {
    // check whether there is clear separation between numeric and alpha values
    // and whether numeric values occur before alpha values
    // if this is the case discard the numeric values
    const numericMap = values.map(isNumeric);
    const lastNumeric = numericMap.lastIndexOf(true);
    const firstAlpha = numericMap.indexOf(false);
    if (firstAlpha > lastNumeric) columnProfile.values = values.slice(firstAlpha);
  }

  return columnProfile.character;
}
