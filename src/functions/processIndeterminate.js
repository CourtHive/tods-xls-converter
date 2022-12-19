import { getPositionColumn } from '../utilities/convenience';
import { processElimination } from './processElimination';

import { POSITION } from '../constants/columnConstants';
import { SUCCESS } from '../constants/resultConstants';
import { KNOCKOUT } from '../constants/sheetTypes';

export function processIndeterminate(props) {
  const { sheetDefinition, sheet, sheetNumber, profile, analysis, info } = props;
  if (sheetDefinition && sheetNumber && profile && sheet);

  const { positionColumn } = getPositionColumn(analysis.columnProfiles);
  const positionProfile = analysis.columnProfiles.find(({ column }) => column === positionColumn);
  const valuesColumns = analysis.columnProfiles.filter(({ column }) => column !== positionColumn);
  const maxValueRow = Math.max(...valuesColumns.flatMap(({ rows }) => rows));
  const maxPositionRow = Math.max(...positionProfile.rows.filter((row) => row <= maxValueRow));
  const index = positionProfile.rows.indexOf(maxPositionRow);
  const maxPositionWithValues = positionProfile.values[index];

  const hasPosition = Object.values(analysis.attributeMap).includes(POSITION);
  const frequencyValues = Object.values(analysis.columnFrequency);
  const twoOrMoreColumns = frequencyValues.length >= 2;
  const maxFrequencyValue = Math.max(...frequencyValues);
  const viableFrequencyColumn = maxFrequencyValue > maxPositionWithValues / 2;

  if (hasPosition && twoOrMoreColumns && viableFrequencyColumn) {
    analysis.sheetType = KNOCKOUT;
    return processElimination(props);
  }

  return { analysis, info, hasValues: true, ...SUCCESS };
}
