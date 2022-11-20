import { findRow, getCellValue, getCol, getRow } from './sheetAccess';
import { findRowDefinition } from './findRowDefinition';
import { getHeaderColumns } from './getHeaderColumns';
import { utilities } from 'tods-competition-factory';
import {
  getNonBracketedValue,
  keyHasSingleAlpha,
  onlyNumeric,
  keyRowSort,
  removeBits,
  onlyAlpha,
  isNumeric,
  isObject
} from '../utilities/convenience';

import { FOOTER, HEADER } from '../constants/sheetElements';

export const getSheetAnalysis = ({ ignoreCellRefs = [], sheet, sheetDefinition, profile }) => {
  const rowDefinitions = profile.rowDefinitions;
  const headerRowDefinition = findRowDefinition({
    rowIds: sheetDefinition.rowIds,
    rowDefinitions,
    type: HEADER
  });

  const footerRowDefinition = findRowDefinition({
    rowIds: sheetDefinition.rowIds,
    rowDefinitions,
    type: FOOTER
  });

  const headerRows = findRow({
    rowDefinition: headerRowDefinition,
    allTargetRows: true,
    sheet
  });
  const headerRow = headerRows[0];
  const headerAvoidRows = headerRows.map((headerRow) => {
    const startRange = +headerRow;
    const endRange = +headerRow + (headerRowDefinition.rows || 0);
    return utilities.generateRange(startRange, endRange);
  });

  const footerRows =
    findRow({
      rowDefinition: footerRowDefinition,
      allTargetRows: true,
      sheet
    }) || [];
  const footerRow = footerRows[footerRows.length - 1];
  const footerAvoidRows = footerRows.map((footerRow) => {
    const startRange = +footerRow;
    const endRange = +footerRow + (footerRowDefinition.rows || 0);
    return utilities.generateRange(startRange, endRange);
  });

  const avoidRows = [].concat(...headerAvoidRows, ...footerAvoidRows);

  const columns = getHeaderColumns({ sheet, profile, headerRow });
  const attributeMap = Object.assign(
    {},
    ...Object.keys(columns).flatMap((key) => {
      if (Array.isArray(columns[key])) {
        return columns[key].map((col) => ({ [col]: key }));
      } else {
        return { [columns[key]]: key };
      }
    })
  );

  const isSkipExpression = (value, expression) => {
    const re = new RegExp(expression, 'g');
    return value && re.test(value);
  };
  const isNotSkipExpression = (key) => {
    const value = getCellValue(sheet[key]);
    const matchesExpression =
      profile.skipExpressions &&
      profile.skipExpressions.reduce((matchesExpression, expression) => {
        return isSkipExpression(value, expression) ? true : matchesExpression;
      }, false);
    return !matchesExpression;
  };
  const inRowBand = (key) => {
    const row = key && getRow(key);
    return row && row > headerRow && row < footerRow;
  };

  const getSkipOptions = (skipObj) => {
    const { text, ...options } = skipObj;
    if (text);
    return options;
  };
  const processSkipWord = (skipWord, value) => {
    const text = (isObject(skipWord) ? skipWord?.text || '' : skipWord).toLowerCase();
    const options = isObject(skipWord) ? getSkipOptions(skipWord) : { includes: true };
    const lowerValue = value.toLowerCase();

    const { includes, startsWith, startsWithEndsWith, remove } = options;
    const modifiedValue = remove ? removeBits(lowerValue, remove) : lowerValue;

    if (includes) {
      return modifiedValue.includes(text);
    } else if (startsWith) {
      return modifiedValue.startsWith(text);
    } else if (startsWithEndsWith) {
      const { startsWith, endsWith } = startsWithEndsWith;
      const goodStart = Array.isArray(startsWith)
        ? startsWith.some((start) => modifiedValue.startsWith(start.toString()))
        : modifiedValue.startsWith(startsWith);
      const goodEnd = Array.isArray(endsWith)
        ? endsWith.some((end) => modifiedValue.startsWith(end))
        : modifiedValue.endsWith(endsWith);
      return goodStart && goodEnd;
    }
  };
  const isSkipWord = (value) => (profile.skipWords || []).some((skipWord) => processSkipWord(skipWord, value));
  const getValue = (key) => getCellValue(sheet[key]);
  const isNotSkipWord = (key) => {
    const value = getCellValue(sheet[key]);
    return !isSkipWord(value);
  };
  const isNotIgnored = (key) => !ignoreCellRefs.includes(key);

  const filteredKeys = Object.keys(sheet)
    .filter(isNotIgnored)
    .filter(inRowBand)
    .filter(keyHasSingleAlpha)
    .filter(isNotSkipExpression);

  const assessColumn = (column) => {
    const isColumnKey = (key) => getCol(key) === column;
    const prospectColumnKeys = filteredKeys.filter(isColumnKey).sort(keyRowSort);
    const truthiness = !!prospectColumnKeys.length;

    const assessment = prospectColumnKeys.reduce(
      (assessment, key) => {
        const rawValue = getValue(key).split('.').join(''); // remove '.'
        const value = isNumeric(rawValue) ? parseFloat(rawValue) : rawValue;

        const skip = profile.skipContains?.some((sv) => rawValue.toLowerCase().includes(sv)) || isSkipWord(rawValue);

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

    return assessment;
  };

  const columnKeys = filteredKeys.reduce(
    (keys, key) => (keys.includes(getCol(key)) ? keys : keys.concat(getCol(key))),
    []
  );

  const columnCharacter = (columnProfile) => {
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
  };

  let columnProfiles = columnKeys
    .sort()
    .map(assessColumn)
    .filter(({ values }) => values?.length);

  columnProfiles.forEach(columnCharacter);
  if (profile.columnCharacter) columnProfiles.forEach(profile.columnCharacter);

  columnProfiles = columnProfiles.filter(({ values }) => values.length);

  const commonRows = columnProfiles.reduce((commonRows, columnProfile) => {
    const rowsString = columnProfile.rows.join('|');
    if (!commonRows[rowsString]) {
      commonRows[rowsString] = [columnProfile.column];
    } else {
      commonRows[rowsString].push(columnProfile.column);
    }

    return commonRows;
  }, {});

  const rowGroupings = Object.keys(commonRows).map((key) => {
    const columns = commonRows[key];
    const rows = key
      .split('|')
      .sort(utilities.numericSort)
      .map((row) => parseInt(row));
    const attributes = columns.map((column) => attributeMap[column]).filter(Boolean);
    return { columns, attributes, rowCount: rows?.length, rows };
  });

  const valuesMap = {};
  for (const columnProfile of columnProfiles) {
    const { values, column } = columnProfile;
    for (const uniqueValue of utilities.unique(values.map(getNonBracketedValue))) {
      if (onlyAlpha(uniqueValue, profile) && !profile.matchOutcomes.includes(uniqueValue.toLowerCase())) {
        if (!valuesMap[uniqueValue]) {
          valuesMap[uniqueValue] = [column];
        } else {
          valuesMap[uniqueValue].push(column);
        }
      }
    }
  }

  const multiColumnValues = Object.keys(valuesMap).filter((key) => valuesMap[key].length > 1);
  const columnFrequency = utilities.instanceCount(Object.values(valuesMap).flat());
  const multiColumnFrequency = utilities.instanceCount(multiColumnValues.map((key) => valuesMap[key]).flat());

  return {
    multiColumnFrequency,
    multiColumnValues,
    columnFrequency,
    columnProfiles,
    rowGroupings,
    filteredKeys,
    attributeMap,
    columnKeys,
    commonRows,
    valuesMap,
    avoidRows,
    footerRow,
    headerRow,
    columns,
    isStringValue: (key) => {
      const value = getCellValue(sheet[key]);
      return value && typeof value === 'string';
    },
    isNumericValue: (key) => {
      const value = getCellValue(sheet[key]);
      return value && isNumeric(value);
    },
    targetColumn: (key, column) => getCol(key) === columns[column],
    isNotSkipExpression,
    isSkipExpression,
    isNotSkipWord,
    assessColumn,
    getValue
  };
};
