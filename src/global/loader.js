import { identifyWorkbook } from '../functions/identifyWorkbook';
import { setWorkbookType, setWorkbook } from './state';
import { pushGlobalLog } from '../utilities/globalLog';
import { read } from 'xlsx';

import { SUCCESS } from '../constants/resultConstants';
import { workbookTypes } from '../config/workbookTypes';

export function loadWorkbook(buf, index, defaultProvider) {
  let data, workbookType;

  try {
    data = read(buf);
    setWorkbook(data);
  } catch (error) {
    return { error };
  }

  if (!defaultProvider) {
    let result = identifyWorkbook(data);
    if (result.error) return result;

    workbookType = result.workbookType;
  } else {
    workbookType = workbookTypes.find((type) => type.organization === defaultProvider);
  }

  setWorkbookType(workbookType);

  pushGlobalLog({
    method: 'identifyWorkbook',
    keyColors: { provider: 'brightyellow', index: 'brightyellow' },
    newLine: true,

    provider: workbookType?.organization || 'UNKNOWN',
    index
  });

  return { workbookType, ...SUCCESS };
}
