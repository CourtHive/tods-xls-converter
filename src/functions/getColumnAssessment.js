import { isNumeric, isSkipWord, onlyAlpha, onlyNumeric } from '../utilities/convenience';
import { getCellValue, getRow } from './sheetAccess';

export function getColumnAssessment({ sheet, attributeMap, prospectColumnKeys, profile, column }) {
  const truthiness = !!prospectColumnKeys.length;

  const assessment = prospectColumnKeys.reduce(
    (assessment, key) => {
      const rawValue = getCellValue(sheet[key]).split('.').join(''); // remove '.'
      const value = isNumeric(rawValue) ? parseFloat(rawValue) : rawValue;

      const skip =
        profile.skipContains?.some((sv) => rawValue.toLowerCase().includes(sv)) || isSkipWord(rawValue, profile);

      if (!skip) {
        if (onlyAlpha(rawValue, profile)) {
          assessment.containsAlpha = true;
          assessment.allNumeric = false;
        } else if (onlyNumeric(rawValue, profile)) {
          assessment.containsNumeric = true;
          assessment.allAlpha = false;
          if (assessment.consecutiveNumbers) {
            assessment.consecutiveNumbers = parseFloat(value) > assessment.lastNumericValue;
          }
          assessment.lastNumericValue = value;
          if (assessment.allProviderId) {
            assessment.allProviderId = profile?.isProviderId?.(value);
          }
        } else if (value) {
          assessment.allNumeric = false;
          assessment.allAlpha = false;
        }

        if (value !== '') {
          assessment.values.push(value);
          assessment.keyMap[key] = value;
          assessment.rows.push(getRow(key));
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
      keyMap: {},
      values: [],
      rows: [],
      column
    }
  );

  const containsNumeric = assessment.values.some(isNumeric);
  if (assessment.consecutiveNumbers && !containsNumeric) {
    assessment.consecutiveNumbers = false;
  }

  return assessment;
}
