import { identifyWorkbook } from './functions/identifyWorkbook';
import { processDirectory } from './utilities/processDirectory';
import { processSheets } from './functions/processSheets';
import * as factory from 'tods-competition-factory';
import { loadWorkbook } from './global/loader';
import globalLog from './utilities/globalLog';
import xlsState from './global/state';

// post processing functions
import { getRoundRobinValues } from './functions/processRoundRobin';
import { getRowGroupings } from './functions/getRowGroupings';
import { contextAnalisys } from './utilities/transformers';
import { findTarget } from './functions/findTarget';

const f = {
  getRoundRobinValues,
  contextAnalisys,
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
