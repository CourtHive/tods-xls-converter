import { SUCCESS } from '../constants/resultConstants';

export function processRoundRobin({ sheetDefinition, sheet, profile, analysis, info }) {
  if (sheetDefinition && profile && sheet);

  return { analysis, info, hasValues: true, ...SUCCESS };
}
