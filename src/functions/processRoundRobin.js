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
