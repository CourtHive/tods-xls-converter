import { utilities } from 'tods-competition-factory';
import { getRow } from './sheetAccess';

import { SUCCESS } from '../constants/resultConstants';

export function processRoundRobin({ sheetDefinition, sheet, profile, analysis, info }) {
  if (sheetDefinition && profile && sheet);

  // NOTES:
  // *. First column has names/numbers... these numbers appear to be finishingPositions
  // *. Do all first column names appear in first row?
  // *. What are the row/column ranges for results?
  // *. Go back to each result column and get date/times

  return { analysis, info, hasValues: true, ...SUCCESS };
}

function analyzeValuesMap(analysis) {
  const frequencyColumns = Object.values(analysis.valuesMap);
  const firstColumn = frequencyColumns[0][0];
  const commonFirstColumn = frequencyColumns.every((frequency) => frequency[0] === firstColumn);
  const resultsColumns = frequencyColumns.map((frequency) => frequency.length === 2 && frequency[1]).filter(Boolean);
  const uniqueResultsColumns = utilities.unique(resultsColumns).length === frequencyColumns.length;
  if (!uniqueResultsColumns) return { error: 'Round Robin result columns are not unique' };

  const findColumnProfile = (column) => analysis.columnProfiles.find((profile) => profile.column === column);
  const firstColumnProfile = findColumnProfile(firstColumn);
  const minRow = Math.min(...firstColumnProfile.rows);
  const maxRow = Math.max(...firstColumnProfile.rows) + 1; // buffer, perhaps provider.profile

  // resultColumnRows should all occur between min/max of firstColumnRows
  const resultRows = utilities.unique(
    resultsColumns
      .map(findColumnProfile)
      .map((profile) => {
        const keyMap = profile?.keyMap;
        // remove the first row which contains the player names
        return keyMap ? Object.keys(keyMap).map(getRow).sort(utilities.numericSort).slice(1) : [];
      })
      .flat(Infinity)
      .sort(utilities.numericSort)
  );

  const rowsWithinBounds = resultRows.every((row) => row >= minRow && row <= maxRow);

  return {
    frequencyColumns,
    firstColumn,
    commonFirstColumn,
    resultsColumns,
    rowsWithinBounds,
    uniqueResultsColumns,
    resultRows,
    minRow,
    maxRow
  };
}
