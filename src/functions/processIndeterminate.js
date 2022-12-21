import { getMaxPositionWithValues } from './getMaxPositionWithValues';
import { getPositionColumn } from '../utilities/convenience';
import { processElimination } from './processElimination';
import { pushGlobalLog } from '../utilities/globalLog';

import { POSITION } from '../constants/columnConstants';
import { SUCCESS } from '../constants/resultConstants';
import { KNOCKOUT } from '../constants/sheetTypes';

export function processIndeterminate(props) {
  const { sheetDefinition, sheet, sheetNumber, profile, analysis, info } = props;
  if (sheetDefinition && sheetNumber && profile && sheet) {
    // for the future
  }

  const { positionColumn } = getPositionColumn(analysis.columnProfiles);
  const { columnProfiles } = analysis;

  const { maxPositionWithValues } = getMaxPositionWithValues({ columnProfiles, positionColumn, analysis });

  const hasPosition = Object.values(analysis.attributeMap).includes(POSITION);
  const frequencyValues = Object.values(analysis.columnFrequency);
  const twoOrMoreColumns = frequencyValues.length >= 2;
  const maxFrequencyValue = Math.max(...frequencyValues);
  const viableFrequencyColumn = maxFrequencyValue >= maxPositionWithValues / 2;

  if (hasPosition && twoOrMoreColumns && viableFrequencyColumn) {
    analysis.sheetType = KNOCKOUT;
    const method = `processSheet ${sheetNumber}`;
    pushGlobalLog(
      {
        method,
        keyColors: { sheetName: 'brightcyan', type: 'brightmagenta' },
        type: analysis?.sheetType,
        sheetName: analysis?.sheetName
      },
      undefined,
      method
    );
    return processElimination(props);
  }

  return { analysis, info, hasValues: true, ...SUCCESS };
}
