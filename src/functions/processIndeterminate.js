import { getMaxPositionWithValues } from './getMaxPositionWithValues';
import { getPositionColumn } from '../utilities/convenience';
import { processElimination } from './processElimination';
import { pushGlobalLog } from '../utilities/globalLog';

import { POSITION } from '../constants/columnConstants';
import { SUCCESS } from '../constants/resultConstants';
import { KNOCKOUT } from '../constants/sheetTypes';
import { FIRST_NAME, LAST_NAME } from '../constants/attributeConstants';

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
  const maxFrequencyValue = Math.max(...frequencyValues);
  const viableFrequencyColumn = maxFrequencyValue >= maxPositionWithValues / 2;

  const nameColumns = analysis.columnProfiles
    .filter((profile) => [LAST_NAME, FIRST_NAME].includes(profile.attribute))
    .map(({ column }) => column);

  if (hasPosition && (viableFrequencyColumn || (positionColumn && nameColumns.length))) {
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
