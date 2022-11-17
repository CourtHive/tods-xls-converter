import { identifyWorkbook } from './functions/identifyWorkbook';
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

  return { workbookType, xls, ...SUCCESS };
}

export const xls = {
  loadWorkbook,
  identifyWorkbook,
};

export default xls;
