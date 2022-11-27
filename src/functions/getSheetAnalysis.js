import { hasNumeric, isString } from '../utilities/identification';
import { getCellValue, getCol, getRow } from './sheetAccess';
import { getColumnAssessment } from './getColumnAssessment';
import { getColumnCharacter } from './getColumnCharacter';
import { getHeaderColumns } from './getHeaderColumns';
import { utilities } from 'tods-competition-factory';
import { getContentFrame } from './getContentFrame';
import { getIsQualifying } from './getIsQualifying';
import { getValuesMap } from './getValuesMap';
import { getCategory } from './getCategory';
import {
  containsExpression,
  getNonBracketedValue,
  getPositionColumn,
  hasBracketedValue,
  isFloatValue,
  keyHasSingleAlpha,
  keyRowSort,
  startsWithIterator,
  tidyValue
} from '../utilities/convenience';

import { PRE_ROUND } from '../constants/columnConstants';

export const getSheetAnalysis = ({
  ignoreCellRefs = [],
  sheetDefinition,
  sheetNumber,
  sheetName,
  sheetType,
  profile,
  sheet,
  info
}) => {
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
    const checkFloats = profile.skipProfile?.skipFloatValues;
    const matchesExpression =
      profile.skipExpressions &&
      profile.skipExpressions.reduce((matchesExpression, expression) => {
        return containsExpression(value, expression) ? true : matchesExpression;
      }, false);
    return !matchesExpression && (!checkFloats || !isFloatValue(value));
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
  columnProfiles.forEach((columnProfile) => getColumnCharacter({ sheetType, columnProfile, attributeMap }));

  // apply any character processing specified by profile
  if (profile.columnCharacter) {
    columnProfiles.forEach((columnProfile) => profile.columnCharacter({ columnProfile, attributeMap }));
  }

  // filter out any columnProfiles which have no values after postProcessing
  columnProfiles = columnProfiles.filter(({ values }) => values.length);

  const { valuesMap, participants, seededParticipants } = getValuesMap({ columnProfiles, profile });
  const columnFrequency = utilities.instanceCount(Object.values(valuesMap).flat());
  const multiColumnValues = Object.keys(valuesMap).filter((key) => valuesMap[key].length > 1);
  const multiColumnFrequency = utilities.instanceCount(multiColumnValues.map((key) => valuesMap[key]).flat());

  const greatestFrequency = Object.keys(columnFrequency).reduce(
    (greatest, column) => (columnFrequency[column] > greatest ? columnFrequency[column] : greatest),
    0
  );
  const frequencyOrder = utilities
    .unique(Object.values(columnFrequency).sort(utilities.numericSort))
    .reverse()
    .flatMap((frequency) => Object.keys(columnFrequency).filter((column) => columnFrequency[column] === frequency));

  const preRoundColumn = columnProfiles.find(({ character }) => character === PRE_ROUND)?.column;
  const positionColumn = getPositionColumn(columnProfiles);
  const targetColumns = Object.keys(multiColumnFrequency).filter(
    (column) => ![preRoundColumn, positionColumn].includes(column)
  );

  const skippedResults = {};
  const resultValueColumns = {};
  const columnResultValues = {};

  const potentialResultValues = columnProfiles
    .filter(({ column }) => targetColumns.includes(column))
    .flatMap(({ column, values }) => {
      return values.map(tidyValue).filter((value) => {
        const potentialResult =
          (hasNumeric(value) || (isString(value) && profile.matchOutcomes.includes(value.toLowerCase()))) &&
          // if there is a bracketed value, ensure nonbracketed value has a numeric component
          (!hasBracketedValue(value) || hasNumeric(getNonBracketedValue(value))) &&
          !multiColumnValues.includes(getNonBracketedValue(value)) &&
          !value.toString().toLowerCase().includes(' am ') &&
          !value.toString().toLowerCase().includes(' pm ') &&
          !startsWithIterator(value) &&
          value.toString().length !== 1;

        if (!potentialResult) {
          if (!skippedResults[value]) {
            skippedResults[value] = [column];
          } else {
            skippedResults[value].push(column);
          }
        }

        if (potentialResult) {
          if (!resultValueColumns[value]) {
            resultValueColumns[value] = [column];
          } else {
            resultValueColumns[value].push(column);
          }
          if (!columnResultValues[column]) {
            columnResultValues[column] = [value];
          } else {
            columnResultValues[column].push(value);
          }
        }
        return potentialResult;
      });
    });

  const category = getCategory({ sheet, sheetName, profile })?.category || info.category;
  const { isQualifying } = getIsQualifying({ sheet, sheetName, profile });

  const result = {
    potentialResultValues,
    multiColumnFrequency,
    columnResultValues,
    resultValueColumns,
    seededParticipants,
    multiColumnValues,
    greatestFrequency,
    columnFrequency,
    skippedResults,
    frequencyOrder,
    columnProfiles,
    attributeMap,
    filteredKeys,
    isQualifying,
    participants,
    sheetNumber,
    columnKeys,
    sheetName,
    sheetType,
    valuesMap,
    avoidRows,
    footerRow,
    headerRow,
    category,
    columns,
    info
  };

  return result;
};
