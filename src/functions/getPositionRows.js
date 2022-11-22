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

  if (!missingPositions) {
    const positionProgression = getPositionProgression(allRows);
    return { positionRows: knownRows.map(getRef), positionProgression };
  }

  const keyedRows = Object.keys(keyMap).map(getRow);
  const minRow = Math.min(...keyedRows);
  const maxRow = Math.max(...keyedRows);
  const rowDifference = maxRow - minRow;
  const rowStep = rowDifference / (lastNumericValue - 1);
  const missingPositionRows = missingPositions.map((position) => (position - 1) * rowStep + minRow);
  const allRows = [...knownRows, ...missingPositionRows].sort(utilities.numericSort);

  const positionProgression = getPositionProgression(allRows);

  return { positionRows: allRows.map(getRef), positionProgression };
}

function getPositionProgression(rows) {
  const positionProgression = [];
  let pairedRows = utilities.chunkArray(rows, 2);
  positionProgression.push(pairedRows);
  while (pairedRows.length > 1) {
    const nextColumn = pairedRows.map(getMidPoint);
    pairedRows = utilities.chunkArray(nextColumn, 2);
    positionProgression.push(pairedRows);
  }

  return positionProgression;
}

function getMidPoint(rows) {
  const isOdd = (x) => x % 2;
  const diff = Math.abs(rows[1] - rows[0]);
  const step = isOdd(diff) ? Math.floor(diff / 2) : diff / 2;
  return Math.min(...rows) + step;
}
