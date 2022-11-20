import { identifyWorkbook } from './functions/identifyWorkbook';
import { processSheets } from './functions/processSheets';
import { printGlobalLog, pushGlobalLog } from './utilities/globalLog';
import { read } from 'xlsx';

import { SUCCESS } from './constants/resultConstants';

let workbook, workbookType;

export function loadWorkbook(buf) {
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
    provider: workbookType.organization,
    keyColors: { provider: 'brightyellow' }
  });

  return { workbookType, ...xlsTODS, ...SUCCESS };
}

export function getWorkbook() {
  return { workbook, workbookType };
}

export function getWorkbookProps() {
  return { ...workbook, workbookType };
}

export const xlsTODS = {
  getWorkbook,
  getWorkbookProps,
  identifyWorkbook,
  loadWorkbook,
  printGlobalLog,
  processSheets
};

export default xlsTODS;
