import { isSkipWord, onlyAlpha, onlyNumeric, validConsecutiveNumbers } from '../utilities/convenience';
import { isNumeric, isScoreLike, isString } from '../utilities/identification';
import { getColumnCharacter } from './getColumnCharacter';
import { utilities } from 'tods-competition-factory';
import { getCheckedValue } from './getCheckedValue';
import { getRow } from './sheetAccess';

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
