import { printGlobalLog, purgeGlobalLog, pushGlobalLog } from './utilities/globalLog';
import { identifyWorkbook } from './functions/identifyWorkbook';
import { processSheets } from './functions/processSheets';
import { read } from 'xlsx';

import {
  setTournamentRecord,
  getTournamentRecord,
  getWorkbookProps,
  setWorkbookType,
  getWorkbook,
  setWorkbook
} from './global/state';

import { SUCCESS } from './constants/resultConstants';

export function loadWorkbook(buf, index) {
  setTournamentRecord({});

  let data;

  try {
    data = read(buf);
    setWorkbook(data);
  } catch (error) {
    return { error };
  }

  let result = identifyWorkbook(data);
  if (result.error) return result;

  const workbookType = result.workbookType;
  setWorkbookType(workbookType);

  pushGlobalLog({
    method: 'identifyWorkbook',
    keyColors: { provider: 'brightyellow', index: 'brightyellow' },
    newLine: true,

    provider: workbookType.organization,
    index
  });

  return { workbookType, ...xlsTODS, ...SUCCESS };
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
