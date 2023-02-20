import { utilities } from 'tods-competition-factory';
import { getRow } from './sheetAccess';

import { NO_POSITION_ROWS_FOUND } from '../constants/errorConditions';

export function getPositionRefs({ columnProfiles, positionColumn, preRoundColumn, avoidRows, positionLimit }) {
  const columnProfile = columnProfiles.find((columnProfile) =>
    [positionColumn, preRoundColumn].includes(columnProfile.column)
  );

  if (!columnProfile) {
    return { error: NO_POSITION_ROWS_FOUND };
  }

  const { column, keyMap } = columnProfile;
  const lastPosition = positionLimit || columnProfile.lastNumericValue;
  const getRef = (row) => `${column}${row}`;

  const range = utilities.generateRange(1, lastPosition + 1);
  const existingPositions = Object.values(keyMap).filter((value) => range.includes(value));
  const missingPositions = range.filter((position) => !existingPositions.includes(position));
  const knownRows = Object.keys(keyMap)
    .map((key) => !isNaN(parseInt(keyMap[key])) && getRow(key))
    .filter((row) => !avoidRows.includes(row))
    .filter(Boolean);

  if (!missingPositions) {
    const roundRows = getRoundRows(allRows);
    return { positionRefs: knownRows.map(getRef), roundRows };
  }

  // difference between knownRows and keyedRows is that keyedRows could include non-numeric (preRound) values
  const keyedRows = Object.keys(keyMap)
    .map(getRow)
    .filter((row) => !avoidRows.includes(row));

  const missingPositionRows = utilities
    .chunkArray(
      keyedRows.filter((row) => !knownRows.includes(row)),
      2
    )
    .map((pair) => {
      const diff = pair[1] - pair[0];
      return diff === 2 ? pair[0] + 1 : pair[0] + Math.round(diff / 2);
    });
  const allRows = [...knownRows, ...missingPositionRows].sort(utilities.numericSort);

  const preRoundParticipantRows = keyedRows.filter((row) => !knownRows.includes(row));
  const roundRows = getRoundRows(allRows);

  return { positionRefs: allRows.map(getRef), roundRows, preRoundParticipantRows };
}

function getRoundRows(rows) {
  const roundRows = [];
  let pairedRows = utilities.chunkArray(rows, 2);
  roundRows.push(pairedRows);
  while (pairedRows.length > 1) {
    const nextColumn = pairedRows.map(getMidPoint);
    pairedRows = utilities.chunkArray(nextColumn, 2);
    roundRows.push(pairedRows);
  }

  return roundRows;
}

function getMidPoint(rows) {
  const isOdd = (x) => x % 2;
  const diff = Math.abs(rows[1] - rows[0]);
  const step = isOdd(diff) ? Math.floor(diff / 2) : diff / 2;
  return Math.min(...rows) + step;
}
