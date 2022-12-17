import { getPositionColumn } from '../utilities/convenience';
import { processKnockOut } from './processKnockout';

import { POSITION } from '../constants/columnConstants';
import { SUCCESS } from '../constants/resultConstants';
import { KNOCKOUT } from '../constants/sheetTypes';

export function processIndeterminate(props) {
  const { sheetDefinition, sheet, sheetNumber, profile, analysis, info } = props;
  if (sheetDefinition && sheetNumber && profile && sheet);

  const hasPosition = Object.values(analysis.attributeMap).includes(POSITION);
  const frequencyValues = Object.values(analysis.columnFrequency);
  const twoOrMoreColumns = frequencyValues.length >= 2;
  const maxFrequencyValue = Math.max(...frequencyValues);
  const { positionColumnProfile } = getPositionColumn(analysis.columnProfiles);
  const positionValuesCount = positionColumnProfile?.values?.length || 0;
  const viableFrequencyColumn = maxFrequencyValue > positionValuesCount / 2;

  if (hasPosition && twoOrMoreColumns && viableFrequencyColumn) {
    analysis.sheetType = KNOCKOUT;
    return processKnockOut(props);
  }

  return { analysis, info, hasValues: true, ...SUCCESS };
}
