import { hasNumeric, isNumeric, isScoreLike, isString } from '../utilities/identification';
import { extendColumnsMap, getHeaderColumns } from './getHeaderColumns';
import { getColumnAssessment } from './getColumnAssessment';
import { getCol, getRow, keyRowSort } from './sheetAccess';
import { getRoundCharacter } from './getRoundCharacter';
import { pushGlobalLog } from '../utilities/globalLog';
import { utilities } from 'tods-competition-factory';
import { getIsQualifying } from './getIsQualifying';
import { getLoggingActive } from '../global/state';
import { getSheetKeys } from './getSheetKeys';
import { getValuesMap } from './getValuesMap';
import { getCategory } from './getCategory';
import {
  getNonBracketedValue,
  getPositionColumn,
  hasBracketedValue,
  startsWithIterator,
  tidyValue
} from '../utilities/convenience';

import { LAST_NAME } from '../constants/attributeConstants';
import { POSITION } from '../constants/columnConstants';
import { ROUND_ROBIN } from '../constants/sheetTypes';

export const getSheetAnalysis = ({
  ignoreCellRefs = [],
  sheetDefinition,
  sheetNumber,
  sheetName,
  sheetType,
  fileName,
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

  const attributeMap = {};
  const processKey = (column, key) => {
    if (!attributeMap[column]) {
      attributeMap[column] = key;
    }
  };
  Object.keys(columns).forEach((key) => {
    if (Array.isArray(columns[key])) {
      columns[key].forEach((column) => processKey(column, key));
    } else {
      processKey(columns[key], key);
    }
  });

  let positionIndex;

  const assessColumn = (column, columnIndex) => {
    const isColumnKey = (key) => getCol(key) === column;
    const isNotAvoidRow = (key) => !avoidRows.includes(getRow(key));
    const prospectColumnKeys = filteredKeys.filter(isNotAvoidRow).filter(isColumnKey).sort(keyRowSort);
    const { assessment, upperRowBound } = getColumnAssessment({
      prospectColumnKeys,
      positionIndex,
      filteredKeys,
      attributeMap,
      columnIndex,
      sheetType,
      profile,
      column,
      sheet
    });

    if (assessment.character === POSITION) positionIndex = columnIndex;

    if (upperRowBound) {
      const upperBoundAdd = sheetType === ROUND_ROBIN ? 2 : 1; // TODO: provider config
      const avoidRange = utilities.generateRange(upperRowBound + upperBoundAdd, rowRange.to);
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

  columnProfiles.forEach((profile) => {
    const keyIndex = columnKeys.indexOf(profile.column);
    const priorColumn = columnKeys[keyIndex - 1];
    const priorProfile = columnProfiles.find(({ column }) => column === priorColumn);
    const consideredValues = priorProfile?.values.filter((value) => !isScoreLike(value));
    const repeatValues =
      consideredValues?.length &&
      profile.values.every((value) => consideredValues.includes(value)) &&
      profile.values.length < consideredValues.length / 2 &&
      profile.rows.every((row) => priorProfile.rows.includes(row));
    const subsequentColumn = columnKeys[keyIndex + 1];
    const subsequentProfile = columnProfiles.find(({ column }) => column === subsequentColumn);
    if (
      repeatValues &&
      subsequentProfile?.values?.length &&
      ![priorProfile.attribute, priorProfile.character].includes(POSITION)
    ) {
      const message = `Repeated Round Values`;
      pushGlobalLog({
        method: 'notice',
        color: 'brightyellow',
        keyColors: { message: 'cyan', attributes: 'brightyellow', column: 'brightred' },
        message,
        column: profile.column
      });
      console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%5', { repeatValues });
      profile.values = [];
    }
  });

  const log = getLoggingActive('columnProfiles');
  if (isNumeric(log?.index)) {
    console.log(columnProfiles[log.index]);
  } else if (log?.column) {
    console.log(columnProfiles.find(({ column }) => column === log.column));
  } else if (log) {
    console.log({ columnProfiles });
  }

  // filter out any columnProfiles which have no values after postProcessing
  columnProfiles = columnProfiles.filter(({ values }) => values.length);

  const { valuesMap, participants, seededParticipants } = getValuesMap({ columnProfiles, profile, avoidRows });
  const columnFrequency = utilities.instanceCount(Object.values(valuesMap).flat());
  const multiColumnValues = Object.keys(valuesMap).filter((key) => valuesMap[key].length > 1);
  const multiColumnFrequency = utilities.instanceCount(multiColumnValues.map((key) => valuesMap[key]).flat());

  if (getLoggingActive('columnFrequency')) console.log({ columnFrequency, multiColumnFrequency, multiColumnValues });

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

  if (!columns[LAST_NAME]) {
    const potentialNameColumnProfiless = columnProfiles.filter(({ character, attribute }) => !character && !attribute);
    const maxColumnFrequency = Math.max(...Object.values(columnFrequency));
    const maxFrequencyColumn = Object.keys(columnFrequency).find((key) => columnFrequency[key] === maxColumnFrequency);
    const nominatedNameColumn = potentialNameColumnProfiless.find(({ column }) => column === maxFrequencyColumn);
    if (nominatedNameColumn) {
      if (nominatedNameColumn.values.length > 1) {
        nominatedNameColumn.attribute = LAST_NAME;
        attributeMap[maxFrequencyColumn] = LAST_NAME;
        columns[LAST_NAME] = maxFrequencyColumn;

        const message = `Name column identified`;
        pushGlobalLog({
          method: 'notice',
          color: 'brightgreen',
          keyColors: { message: 'brightgreen', attributes: 'magenta', column: 'brightgreen' },
          message,
          column: maxFrequencyColumn
        });
      }
    }
  }

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
    fileName,
    columns,
    info
  };

  return result;
};
