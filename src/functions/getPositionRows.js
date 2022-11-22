import { utilities } from 'tods-competition-factory';
import { getRow } from './sheetAccess';

export function getPositionRows({ columnProfiles, positionColumn, preRoundColumn }) {
  const profile = columnProfiles.find((profile) => [positionColumn, preRoundColumn].includes(profile.column));
  const { column, keyMap, lastNumericValue } = profile;
  const getRef = (row) => `${column}${row}`;

  const range = utilities.generateRange(1, lastNumericValue + 1);
  const existingPositions = Object.values(keyMap).filter((value) => range.includes(value));
  const missingPositions = range.filter((position) => !existingPositions.includes(position));
  const knownRows = Object.keys(keyMap)
    .map((key) => !isNaN(parseInt(keyMap[key])) && getRow(key))
    .filter(Boolean);

  if (!missingPositions) return { positionRows: knownRows.map(getRef) };

  const keyedRows = Object.keys(keyMap).map(getRow);
  const minRow = Math.min(...keyedRows);
  const maxRow = Math.max(...keyedRows);
  const rowDifference = maxRow - minRow;
  const rowStep = rowDifference / (lastNumericValue - 1);
  const missingPositionRows = missingPositions.map((position) => (position - 1) * rowStep + minRow);
  const allRows = [...knownRows, ...missingPositionRows].sort(utilities.numericSort);

  console.log({
    minRow,
    maxRow,
    rowStep,
    missingPositions,
    missingPositionRows,
    knownRows,
    allRows,
    refs: allRows.map(getRef)
  });

  return { positionRows: allRows.map(getRef) };
}
