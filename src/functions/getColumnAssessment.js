import { isNumeric, isScoreLike, isString } from '../utilities/identification';
import { getColumnCharacter } from './getColumnCharacter';
import { pushGlobalLog } from '../utilities/globalLog';
import { utilities } from 'tods-competition-factory';
import { getCheckedValue } from './getCheckedValue';
import { audit } from '../global/state';
import { getRow } from './sheetAccess';
import {
  getValidConsecutiveRanges,
  isSkipWord,
  onlyAlpha,
  onlyNumeric,
  validConsecutiveNumbers
} from '../utilities/convenience';

import { POSITION } from '../constants/columnConstants';

export function getColumnAssessment({
  prospectColumnKeys,
  positionIndex,
  filteredKeys,
  attributeMap,
  columnIndex,
  sheetType,
  profile,
  column,
  sheet
}) {
  const truthiness = !!prospectColumnKeys.length;
  const hiddenRows = sheet['!rows']?.map((row, i) => row?.hidden && i + 1).filter(Boolean) || [];

  // WARNING: DO NOT SORT KEYS
  const assessment = prospectColumnKeys.reduce(
    (assessment, key) => {
      const { value, rawValue } = getCheckedValue({ profile, sheet, key });
      const row = getRow(key);
      const consideredValue = (v) => v && !['0'].includes(v);
      const rowKeys = filteredKeys.filter(
        (rowKey) => getRow(rowKey) === row && consideredValue(getCheckedValue({ profile, sheet, key: rowKey }).value)
      );
      const charLength = value.toString().length;
      if (charLength > assessment.greatestLength) assessment.greatestLength = charLength;

      const singleValueRow = rowKeys.length === 1 && 'ABC'.split('').includes(column);
      const ignoreSingleValueRow = singleValueRow && !utilities.isPowerOf2(prospectColumnKeys.length);
      if (singleValueRow) assessment.singleValueRows.push(row);

      const skip =
        profile.skipContains?.some((sv) => rawValue.toLowerCase().includes(sv)) ||
        isSkipWord(rawValue, profile) ||
        hiddenRows.includes(row) ||
        ignoreSingleValueRow;

      if (!skip) {
        if (onlyAlpha(rawValue, profile)) {
          assessment.containsAlpha = true;
          assessment.allNumeric = false;
        } else if (onlyNumeric(rawValue, profile)) {
          assessment.containsNumeric = true;
          assessment.allAlpha = false;
          if (assessment.consecutiveNumbers) {
            const stillConsecutive =
              parseFloat(value) > assessment.lastNumericValue && assessment.values.length + 1 >= parseFloat(value);
            if (stillConsecutive) assessment.lastConsecutiveValue = value;
            assessment.consecutiveNumbers = stillConsecutive;
          }
          assessment.lastNumericValue = value;
        } else if (value) {
          assessment.allNumeric = false;
          assessment.allAlpha = false;
        }

        if (
          isScoreLike(value) ||
          (isString(value) && value.split(' ').some((part) => profile.matchOutcomes?.includes(part)))
        )
          assessment.scoreLikeCount += 1;

        if (!['', 'undefined'].includes(value)) {
          assessment.values.push(value);
          assessment.keyMap[key] = value;
          assessment.rows.push(row);
        }
      }

      return assessment;
    },
    {
      attribute: attributeMap[column],
      consecutiveNumbers: truthiness,
      containsNumeric: false,
      allNumeric: truthiness,
      allAlpha: truthiness,
      lastNumericValue: 0,
      scoreLikeCount: 0,
      singleValueRows: [],
      greatestLength: 0,
      keyMap: {},
      values: [],
      rows: [],
      column
    }
  );

  const containsNumeric = assessment.values.some(isNumeric);
  if (!containsNumeric) {
    assessment.lastConsecutiveValue = undefined;
    assessment.lastNumericValue = undefined;
    assessment.consecutiveNumbers = false;
  }

  // 1 is technically a powerOf2, but it is invalid for a drawSize
  if (assessment?.lastConsecutiveValue < 2) assessment.lastConsecutiveValue = undefined;

  // determine whether position column contains erroneous values due to rows being deleted or hidden
  if (assessment?.allNumeric && assessment.consecutiveNumbers && !utilities.isPowerOf2(assessment.values.length)) {
    const trimmedRows = assessment.rows.filter((row) => !assessment.singleValueRows.includes(row));
    if (utilities.isPowerOf2(trimmedRows.length)) {
      const valuesToTrim = assessment.singleValueRows
        .map((row) => assessment.values[assessment.rows.indexOf(row)])
        .filter(Boolean);
      const trimmedValues = assessment.values.filter((value) => !valuesToTrim.includes(value));
      if (validConsecutiveNumbers(trimmedValues)) {
        assessment.values = trimmedValues;
        assessment.rows = trimmedRows;
        assessment.lastConsecutiveValue = Math.max(...trimmedValues);
        assessment.lastNumericValue = Math.max(...trimmedValues);
        assessment.consecutiveNumbers = true;
        assessment.singleValueRows.forEach((row) => {
          const key = `${column}${row}`;
          delete assessment.keyMap[key];
        });
      }
    }
  }

  if (column === 'A' && !assessment.consecutiveNumbers && utilities.isPowerOf2(assessment.lastConsecutiveValue)) {
    const { consecutiveRanges } = getValidConsecutiveRanges(assessment.values);
    if (consecutiveRanges?.length) {
      const primaryRange = consecutiveRanges[0];
      const secondaryRanges = consecutiveRanges.slice(1);
      const lastPrimary = primaryRange[primaryRange.length - 1];
      const lastIndex = lastPrimary.index;
      assessment.values = assessment.values.slice(0, lastIndex + 1);
      assessment.rows = assessment.rows.slice(0, lastIndex + 1);
      assessment.lastNumericValue = lastPrimary.value;
      assessment.secondaryRanges = secondaryRanges;
      assessment.consecutiveNumbers = true;
      assessment.containsAlpha = false;
      assessment.attribute = POSITION;
      assessment.scoreLikeCount = 0;
      assessment.allNumeric = true;

      const lastRow = Math.max(...assessment.rows);
      for (const key of Object.keys(assessment.keyMap)) {
        const row = getRow(key);
        if (row > lastRow) delete assessment.keyMap[key];
      }

      audit({ additionalDraws: secondaryRanges.length });

      const message = 'Mutiple Draws in Sheet';
      pushGlobalLog({
        method: 'notice',
        color: 'brightred',
        keyColors: { message: 'brightred', attributes: 'brightmagenta' },
        message
      });
    } else {
      const getMissingNumbers = (a, l = true) =>
        Array.from(Array(Math.max(...a)).keys())
          .map((n, i) => (a.indexOf(i) < 0 && (!l || i > Math.min(...a)) ? i : null))
          .filter((f) => f);
      const missingNumbers =
        assessment.values?.length > 2 &&
        assessment.values.every((value) => isNumeric(value)) &&
        getMissingNumbers(assessment.values);
      // for each missing value check that surrounding value are present in assessment.values
      // e.g. for 17 check for the presence of 16, 18
      // derive the rows for surrounding values and check for row with values between the two
      // if present, add the missing value and the missing row
      // when all missingNumbers have been addressed successfully, check for valid positionRows
      let rowsAdded = 0;
      for (const missingNumber of missingNumbers || []) {
        const adjacent = [missingNumber - 1, missingNumber + 1].filter((number) => number);
        const relevantRows = adjacent.map((number) => {
          const index = assessment.values.indexOf(number);
          const row = assessment.rows[index];
          return row;
        });
        if (relevantRows.length === 2) {
          const possibleRows = filteredKeys
            .map((key) => {
              const row = getRow(key);
              return row > relevantRows[0] && row < relevantRows[1] ? row : undefined;
            })
            .filter(Boolean);
          const midRow = relevantRows[0] + (relevantRows[1] - relevantRows[0]) / 2;
          const missingRow = possibleRows.includes(midRow) && midRow;
          if (missingRow) {
            assessment.values.push(missingNumber);
            assessment.values.sort(utilities.numericSort);
            assessment.rows.push(utilities.missingRow);
            assessment.rows.sort();
            assessment.keyMap[`A${missingRow}`] = missingNumber;
            rowsAdded += 1;
          }
        }
      }

      if (rowsAdded) {
        if (validConsecutiveNumbers(assessment.values)) {
          assessment.consecutiveNumbers = true;
          assessment.scoreLikeCount = 0;
          assessment.attribute = POSITION;
        }
      }
    }
  }

  // apply any character processing specified by profile
  if (profile.columnCharacter) {
    const character = profile.columnCharacter({ columnProfile: assessment, attributeMap });
    assessment.character = character;
  }

  const { character, upperRowBound } = getColumnCharacter({
    columnProfile: assessment,
    positionIndex,
    attributeMap,
    columnIndex,
    sheetType
  });
  if (character && !assessment.character) assessment.character = character;

  return { assessment, upperRowBound };
}
