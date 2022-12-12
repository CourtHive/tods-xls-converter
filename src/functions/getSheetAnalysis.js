import { hasNumeric, isString } from '../utilities/identification';
import { getColumnAssessment } from './getColumnAssessment';
import { getRoundCharacter } from './getRoundCharacter';
import { extendColumnsMap, getHeaderColumns } from './getHeaderColumns';
import { utilities } from 'tods-competition-factory';
import { getIsQualifying } from './getIsQualifying';
import { getCol, getRow } from './sheetAccess';
import { getSheetKeys } from './getSheetKeys';
import { getValuesMap } from './getValuesMap';
import { getCategory } from './getCategory';
import {
  getNonBracketedValue,
  getPositionColumn,
  hasBracketedValue,
  keyRowSort,
  startsWithIterator,
  tidyValue
} from '../utilities/convenience';

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
  const { headerRow, footerRow, avoidRows, filteredKeys, columnKeys, columnValues, rowRange } = getSheetKeys({
    sheetDefinition,
    ignoreCellRefs,
    profile,
    sheet
  });

  const columns = getHeaderColumns({ sheet, profile, headerRow, columnValues });

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

  const assessColumn = (column, columnIndex) => {
    const isColumnKey = (key) => getCol(key) === column;
    const isNotAvoidRow = (key) => !avoidRows.includes(getRow(key));
    const prospectColumnKeys = filteredKeys.filter(isNotAvoidRow).filter(isColumnKey).sort(keyRowSort);
    const { assessment, upperRowBound } = getColumnAssessment({
      prospectColumnKeys,
      attributeMap,
      columnIndex,
      sheetType,
      profile,
      column,
      sheet
    });
    if (upperRowBound) {
      const avoidRange = utilities.generateRange(upperRowBound + 1, rowRange.to);
      avoidRows.push(...avoidRange);
    }
    if (assessment.character) {
      extendColumnsMap({ columnsMap: columns, attribute: assessment.character, column });
    }
    return assessment;
  };

  let columnProfiles = columnKeys
    .sort()
    .map(assessColumn)
    .filter(({ values }) => values?.length);

  // post-process columnProfiles
  columnProfiles.forEach((columnProfile, columnIndex) => {
    const { character } = getRoundCharacter({
      columnProfiles,
      columnProfile,
      attributeMap,
      columnIndex,
      sheetType
    });
    if (character && !columns[character]) {
      if (!columnProfile.character) columnProfile.character = character;
      extendColumnsMap({ columnsMap: columns, attribute: character, column: columnProfile.column });
    }
  });

  // filter out any columnProfiles which have no values after postProcessing
  columnProfiles = columnProfiles.filter(({ values }) => values.length);

  const { valuesMap, participants, seededParticipants } = getValuesMap({ columnProfiles, profile, avoidRows });
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

  const { positionColumn } = getPositionColumn(columnProfiles);
  const positionColumnIndex = columnKeys.indexOf(positionColumn);

  const targetColumns = Object.keys(multiColumnFrequency).filter(
    (column) => columnKeys.indexOf(column) > positionColumnIndex
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
