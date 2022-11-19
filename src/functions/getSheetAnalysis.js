import { findRow, getCellValue, getCol, getRow } from './sheetAccess';
import { findRowDefinition } from './findRowDefinition';
import { getHeaderColumns } from './getHeaderColumns';
import { utilities } from 'tods-competition-factory';
import { isNumeric } from '../utilities/convenience';

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

  const onlyAlpha = (value) => profile.considerAlpha?.includes(value) || /^[a-zA-Z- ]+$/.test(value);
  const onlyNumeric = (value) => profile.considerNumeric?.includes(value) || isNumeric(value);

  const isSingleAlpha = (key) => key && key.length > 1 && isNumeric(key[1]);
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
  const isSkipWord = (value) =>
    (profile.skipWords || []).map((skipWord) => skipWord.toLowerCase()).includes(value.toLowerCase());
  const getValue = (key) => getCellValue(sheet[key]);
  const isNotSkipWord = (key) => {
    const value = getCellValue(sheet[key]);
    return !isSkipWord(value);
  };
  const isNotIgnored = (key) => !ignoreCellRefs.includes(key);

  const filteredKeys = Object.keys(sheet)
    .filter(isNotIgnored)
    .filter(inRowBand)
    .filter(isSingleAlpha)
    .filter(isNotSkipExpression);

  const assessColumn = (column) => {
    const isColumnKey = (key) => getCol(key) === column;
    const prospectColumnKeys = filteredKeys.filter(isColumnKey);
    const truthiness = !!prospectColumnKeys.length;

    const assessment = prospectColumnKeys.reduce(
      (assessment, key) => {
        // remove '.'
        const rawValue = getValue(key).split('.').join('');
        const value = isNumeric(rawValue) ? parseFloat(rawValue) : rawValue;

        const skip = profile.skipContains?.some((sv) => rawValue.toLowerCase().includes(sv)) || isSkipWord(rawValue);

        if (!skip) {
          if (onlyAlpha(rawValue)) {
            assessment.containsAlpha = true;
            assessment.allNumeric = false;
            assessment.consecutiveNumbers = false;
          } else if (onlyNumeric(rawValue)) {
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
            assessment.consecutiveNumbers = false;
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

  const getColumnCharacter = (columnProfile) => {
    const { consecutiveNumbers, containsNumeric, containsAlpha, values, lastNumericValue, column } = columnProfile;
    if (
      consecutiveNumbers &&
      lastNumericValue > 0 &&
      (utilities.isPowerOf2(lastNumericValue) ||
        (lastNumericValue < values.length && utilities.isPowerOf2(values.length)))
    ) {
      const character = 'position';
      columnProfile.character = character;
      if (!attributeMap[column]) attributeMap[column] = character;
    }

    if (containsNumeric && containsAlpha) {
      // check whether there is clear separation between numeric and alpha values
      // and whether numeric values occur before alpha values
      const numericMap = values.map(isNumeric);
      const lastNumeric = numericMap.lastIndexOf(true);
      const firstAlpha = numericMap.indexOf(false);
      console.log({ lastNumeric, firstAlpha });
      if (firstAlpha > lastNumeric) columnProfile.values = values.slice(firstAlpha);
    }
  };

  const columnProfiles = columnKeys
    .sort()
    .map(assessColumn)
    .filter(({ values }) => values?.length);

  columnProfiles.forEach(getColumnCharacter);

  const commonRows = columnProfiles.reduce((commonRows, columnProfile) => {
    const rowsString = columnProfile.rows.sort().join('|');
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

  return {
    columns,
    avoidRows,
    columnKeys,
    filteredKeys,
    columnProfiles,
    attributeMap,
    rowGroupings,
    commonRows,
    headerRow,
    footerRow,
    isStringValue: (key) => {
      const value = getCellValue(sheet[key]);
      return value && typeof value === 'string';
    },
    isNumericValue: (key) => {
      const value = getCellValue(sheet[key]);
      return value && isNumeric(value);
    },
    // ensure that the key is of the form [A-Z][#], not 'AA1', for example
    isSingleAlpha,
    targetColumn: (key, column) => getCol(key) === columns[column],
    isNotSkipExpression,
    isSkipExpression,
    isNotSkipWord,
    assessColumn,
    getValue
  };
};
