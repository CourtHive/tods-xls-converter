import { pushGlobalLog } from '../utilities/globalLog';

import { POSITION } from '../constants/columnConstants';
import { SUCCESS } from '../constants/resultConstants';
import { KNOCKOUT } from '../constants/sheetTypes';

export function processIndeterminate({ sheetDefinition, sheet, sheetNumber, sheetName, profile, analysis, info }) {
  if (sheetDefinition && sheetNumber && profile && sheet);

  const hasPosition = Object.values(analysis.attributeMap).includes(POSITION);
  const frequencyValues = Object.values(analysis.columnFrequency);
  const twoOrMoreColumns = frequencyValues.length >= 2;
  const maxFrequencyValue = Math.max(...frequencyValues);
  const positionColumn = analysis.columnProfiles.find(({ attribute, character }) =>
    [attribute, character].includes(POSITION)
  );
  const positionValuesCount = positionColumn.values.length;
  const viableFrequencyColumn = maxFrequencyValue <= positionValuesCount && maxFrequencyValue > positionValuesCount / 2;

  if (hasPosition && twoOrMoreColumns && viableFrequencyColumn) {
    pushGlobalLog({
      method: 'identified',
      color: 'mustard',
      keyColors: { sheetName: 'brightcyan', type: 'brightmagenta' },
      type: KNOCKOUT,
      sheetName
    });
  }

  return { analysis, info, ...SUCCESS };
}
