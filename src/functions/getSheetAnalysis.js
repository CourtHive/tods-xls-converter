import {
  containsExpression,
  getNonBracketedValue,
  hasNumeric,
  isString,
  keyHasSingleAlpha,
  keyRowSort,
  tidyValue
} from '../utilities/convenience';
import { getCellValue, getCol, getRow } from './sheetAccess';
import { getColumnAssessment } from './getColumnAssessment';
import { getColumnCharacter } from './getColumnCharacter';
import { getHeaderColumns } from './getHeaderColumns';
import { utilities } from 'tods-competition-factory';
import { getValuesMap } from './getValuesMap';

import { getContentFrame } from './getContentFrame';

export const getSheetAnalysis = ({ ignoreCellRefs = [], sheet, sheetDefinition, profile }) => {
  const { headerRow, footerRow, avoidRows } = getContentFrame({ sheet, profile, sheetDefinition });
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

  const isNotSkipExpression = (key) => {
    const value = getCellValue(sheet[key]);
    const matchesExpression =
      profile.skipExpressions &&
      profile.skipExpressions.reduce((matchesExpression, expression) => {
        return containsExpression(value, expression) ? true : matchesExpression;
      }, false);
    return !matchesExpression;
  };

  const inRowBand = (key) => {
    const row = key && getRow(key);
    return row && row > headerRow && row < footerRow;
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
    return getColumnAssessment({ sheet, attributeMap, prospectColumnKeys, profile, column });
  };

  const columnKeys = filteredKeys.reduce(
    (keys, key) => (keys.includes(getCol(key)) ? keys : keys.concat(getCol(key))),
    []
  );

  let columnProfiles = columnKeys
    .sort()
    .map(assessColumn)
    .filter(({ values }) => values?.length);

  // post-process columnProfiles
  columnProfiles.forEach((columnProfile) => getColumnCharacter({ columnProfile, attributeMap }));

  // apply any character processing specified by profile
  if (profile.columnCharacter) {
    columnProfiles.forEach((columnProfile) => profile.columnCharacter({ columnProfile, attributeMap }));
  }

  // filter out any columnProfiles which have no values after postProcessing
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

  const valuesMap = getValuesMap({ columnProfiles, profile });
  const columnFrequency = utilities.instanceCount(Object.values(valuesMap).flat());
  const multiColumnValues = Object.keys(valuesMap).filter((key) => valuesMap[key].length > 1);
  const multiColumnFrequency = utilities.instanceCount(multiColumnValues.map((key) => valuesMap[key]).flat());

  const targetColumns = Object.keys(multiColumnFrequency);
  const potentialScoreValues = columnProfiles
    .filter(({ column }) => targetColumns.includes(column))
    .flatMap(({ values }) =>
      values
        .map(tidyValue)
        .filter(
          (value) =>
            (hasNumeric(value) || (isString(value) && profile.matchOutcomes.includes(value.toLowerCase()))) &&
            !multiColumnValues.includes(getNonBracketedValue(value))
        )
    );

  return {
    potentialScoreValues,
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
    columns
  };
};
