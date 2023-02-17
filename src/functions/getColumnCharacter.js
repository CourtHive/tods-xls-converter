import { getRoundCharacter } from './getRoundCharacter';
import { isNumeric } from '../utilities/identification';
import { utilities } from 'tods-competition-factory';
import { getRow } from './sheetAccess';

import { POSITION, PRE_ROUND } from '../constants/columnConstants';
import { ROUND_ROBIN } from '../constants/sheetTypes';
import { ROUND } from '../constants/sheetElements';

export function getColumnCharacter({
  columnProfiles,
  columnProfile,
  positionIndex,
  attributeMap,
  columnIndex,
  sheetType
}) {
  let {
    lastConsecutiveValue,
    consecutiveNumbers,
    lastNumericValue,
    containsNumeric,
    containsAlpha,
    allNumeric,
    values,
    column,
    rows
  } = columnProfile;

  if (columnProfile.character) return { character: columnProfile.character };

  // check for erroneous values in position column when reasonable drawSize achieved
  if (allNumeric && !consecutiveNumbers && utilities.isPowerOf2(lastConsecutiveValue)) {
    const indexPlusOne = values.indexOf(lastConsecutiveValue) + 1;
    const valueOverhang = values.length - indexPlusOne;
    if (lastConsecutiveValue / valueOverhang > 4) {
      columnProfile.values = columnProfile.values.slice(0, indexPlusOne);
      columnProfile.rows = columnProfile.rows.slice(0, indexPlusOne);
      columnProfile.lastNumericValue = lastConsecutiveValue;
      columnProfile.consecutiveNumbers = true;

      values = columnProfile.values.slice(0, indexPlusOne);
      lastNumericValue = lastConsecutiveValue;
      consecutiveNumbers = true;

      const maxRow = Math.max(...columnProfile.rows);
      const keysToRemove = Object.keys(columnProfile.keyMap).filter((key) => getRow(key) > maxRow);
      keysToRemove.forEach((key) => {
        delete columnProfile.keyMap[key];
      });
    }
  }

  const numericCheck = consecutiveNumbers && lastNumericValue > 0;

  const meetsMinimumDrawSize = (value) => value > 1 && utilities.isPowerOf2(value);

  // TODO: this would exclude any qualifying rounds which are not power of 2
  const knockOutCheck =
    meetsMinimumDrawSize(lastNumericValue) || (lastNumericValue < values.length && meetsMinimumDrawSize(values.length));

  // preRound and position columns cannot occur beyond 4th column
  if (
    (!columnProfile.attribute || (columnProfile.attribute === ROUND && columnIndex <= 2)) &&
    (sheetType === ROUND_ROBIN ? allNumeric : knockOutCheck) &&
    positionIndex === undefined &&
    columnIndex < 4 &&
    numericCheck
  ) {
    const character = containsAlpha ? PRE_ROUND : POSITION;
    columnProfile.attribute = undefined; // handle preRound identified as ROUND
    columnProfile.character = character;
    if (!attributeMap[column]) attributeMap[column] = character;
    const upperRowBound = character === POSITION && Math.max(...columnProfile.rows);
    return { character, upperRowBound };
  }

  if (containsNumeric && containsAlpha) {
    // check whether there is clear separation between numeric and alpha values
    // and whether numeric values occur before alpha values
    // if this is the case discard the numeric values
    const numericMap = values.map(isNumeric);
    const lastNumeric = numericMap.lastIndexOf(true);
    const firstAlpha = numericMap.indexOf(false);
    if (firstAlpha > lastNumeric) {
      columnProfile.values = values.slice(firstAlpha);
      columnProfile.rows = rows.slice(firstAlpha);
    }
  }

  const { character: roundCharacter } = getRoundCharacter({ attributeMap, columnProfiles, columnProfile });

  if (!columnProfile.character && roundCharacter) {
    columnProfile.character = roundCharacter;
    return { character: columnProfile.character };
  }

  return { character: columnProfile.character };
}
