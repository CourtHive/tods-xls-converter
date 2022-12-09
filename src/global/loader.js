import { identifyWorkbook } from '../functions/identifyWorkbook';
import { setWorkbookType, setWorkbook } from './state';
import { pushGlobalLog } from '../utilities/globalLog';
import { read } from 'xlsx';

import { SUCCESS } from '../constants/resultConstants';

export function loadWorkbook(buf, index) {
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

    provider: workbookType?.organization || 'UNKNOWN',
    index
  });

  return { workbookType, ...SUCCESS };
}
