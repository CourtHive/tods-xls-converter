// import { pushGlobalLog } from '../utilities/globalLog';

import { SUCCESS } from '../constants/resultConstants';

export function processRoundRobin({ sheetDefinition, sheet, profile, analysis, info }) {
  if (sheetDefinition && profile && sheet);

  /*
  analysis.rowGroupings.forEach((grouping) => {
    const { columns, attributes, rowCount } = grouping;
    pushGlobalLog({ columns, attributes, rowCount });
  });
  */

  return { analysis, info, ...SUCCESS };
}
