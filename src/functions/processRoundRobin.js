import { pushGlobalLog } from '../utilities/globalLog';

import { SUCCESS } from '../constants/resultConstants';

export function processRoundRobin({ analysis }) {
  analysis.rowGroupings.forEach((grouping) => {
    const { columns, attributes, rowCount } = grouping;
    pushGlobalLog({ columns, attributes, rowCount });
  });
  console.log(
    // analyzer.rowGroupings
    analysis.columnProfiles.map((v) => v.values)
    // analyzer.columns,
    // analyzer.attributeMap
  );
  return { ...SUCCESS };
}
