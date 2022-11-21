import { setTournamentRecord, setWorkbookType, setWorkbook } from './state';
import { identifyWorkbook } from '../functions/identifyWorkbook';
import { pushGlobalLog } from '../utilities/globalLog';
import { read } from 'xlsx';

import { SUCCESS } from '../constants/resultConstants';

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

  return { workbookType, ...SUCCESS };
}
