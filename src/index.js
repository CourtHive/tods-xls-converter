import { printGlobalLog, purgeGlobalLog, pushGlobalLog } from './utilities/globalLog';
import { identifyWorkbook } from './functions/identifyWorkbook';
import { processSheets } from './functions/processSheets';
import { read } from 'xlsx';

import { SUCCESS } from './constants/resultConstants';

let tournamentRecord = {},
  workbookType,
  workbook;

export function loadWorkbook(buf, index) {
  tournamentRecord = {};

  try {
    workbook = read(buf);
  } catch (error) {
    return { error };
  }

  let result = identifyWorkbook(workbook);
  if (result.error) return result;

  workbookType = result.workbookType;
  pushGlobalLog({
    method: 'identifyWorkbook',
    keyColors: { provider: 'brightyellow', index: 'brightyellow' },
    newLine: true,

    provider: workbookType.organization,
    index
  });

  return { workbookType, ...xlsTODS, ...SUCCESS };
}

export function getWorkbook() {
  return { workbook, workbookType };
}

export function getWorkbookProps() {
  return { ...workbook, workbookType };
}

export function getTournamentRecord() {
  return { tournamentRecord };
}

export const xlsTODS = {
  getTournamentRecord,
  getWorkbookProps,
  identifyWorkbook,
  printGlobalLog,
  purgeGlobalLog,
  processSheets,
  loadWorkbook,
  getWorkbook
};

export default xlsTODS;
