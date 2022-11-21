import { identifyWorkbook } from './functions/identifyWorkbook';
import { processDirectory } from './utilities/processDirectory';
import { processSheets } from './functions/processSheets';
import { factory } from 'tods-competition-factory';
import { loadWorkbook } from './global/loader';
import globalLog from './utilities/globalLog';
import xlsState from './global/state';

export const xlsTODS = {
  identifyWorkbook,
  processDirectory,
  ...globalLog,
  ...xlsState,
  processSheets,
  loadWorkbook,
  factory
};

export default xlsTODS;
