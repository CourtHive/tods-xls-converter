import { getTournamentRecord, getWorkbookProps, getWorkbook } from './global/state';
import { printGlobalLog, purgeGlobalLog } from './utilities/globalLog';
import { identifyWorkbook } from './functions/identifyWorkbook';
import { processDirectory } from './utilities/processDirectory';
import { processSheets } from './functions/processSheets';
import { loadWorkbook } from './global/loader';

export const xlsTODS = {
  getTournamentRecord,
  getWorkbookProps,
  identifyWorkbook,
  processDirectory,
  printGlobalLog,
  purgeGlobalLog,
  processSheets,
  loadWorkbook,
  getWorkbook
};

export default xlsTODS;
