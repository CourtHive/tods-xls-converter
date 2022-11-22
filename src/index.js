import { identifyWorkbook } from './functions/identifyWorkbook';
import { processDirectory } from './utilities/processDirectory';
import { processSheets } from './functions/processSheets';
import { factory } from 'tods-competition-factory';
import { loadWorkbook } from './global/loader';
import globalLog from './utilities/globalLog';
import xlsState from './global/state';

// post processing functions
import { getRowGroupings } from './functions/getRowGroupings';
import { findTarget } from './functions/findTarget';

const f = {
  getRowGroupings,
  findTarget
};

export const xlsTODS = {
  identifyWorkbook,
  processDirectory,
  ...globalLog,
  ...xlsState,
  processSheets,
  loadWorkbook,
  factory,
  f
};

export default xlsTODS;
