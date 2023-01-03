import { isSkipWord, onlyAlpha, onlyNumeric } from '../utilities/convenience';
import { isNumeric, isScoreLike, isString } from '../utilities/identification';
import { getCheckedValue } from './getCheckedValue';
import { getColumnCharacter } from './getColumnCharacter';
import { getRow } from './sheetAccess';

export function getColumnAssessment({
  prospectColumnKeys,
  positionIndex,
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

      const skip =
        profile.skipContains?.some((sv) => rawValue.toLowerCase().includes(sv)) ||
        isSkipWord(rawValue, profile) ||
        hiddenRows.includes(row);

      if (!skip) {
        if (onlyAlpha(rawValue, profile)) {
          assessment.containsAlpha = true;
          assessment.allNumeric = false;
          assessment.allProviderId = false;
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

        if (assessment.allProviderId) {
          assessment.allProviderId = profile?.isProviderId?.(value);
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
      allProviderId: truthiness,
      containsNumeric: false,
      allNumeric: truthiness,
      allAlpha: truthiness,
      lastNumericValue: 0,
      scoreLikeCount: 0,
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
    assessment.allProviderId = undefined;
  }

  // 1 is technically a powerOf2, but it is invalid for a drawSize
  if (assessment?.lastConsecutiveValue < 2) assessment.lastConsecutiveValue = undefined;

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
