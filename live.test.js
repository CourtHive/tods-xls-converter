import { processDirectory } from './src/utilities/processDirectory';
import { printGlobalLog } from './src/utilities/globalLog';
import { setLoggingActive } from './src/global/state';
import { it } from 'vitest';

import { INDETERMINATE } from './src/constants/sheetTypes';

// test without building against sheets in example directory
it('can process a directory', () => {
  const readDir = './examples/sheets';

  const sheetTypes = [INDETERMINATE];
  const sheetNumbers = [];
  const sheetLimit = 0;

  const processLimit = 2;
  const startIndex = 12;

  setLoggingActive(true);
  processDirectory({ readDir, processLimit, startIndex, sheetLimit, sheetTypes, sheetNumbers });
  printGlobalLog(true);
});
