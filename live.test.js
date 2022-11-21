import { processDirectory } from './src/utilities/processDirectory';
import { printLog } from './src/utilities/globalLog';
import { it } from 'vitest';

import { INDETERMINATE } from './src/constants/sheetTypes';

// test without building against sheets in example directory
it('can process a directory', () => {
  const readDir = './examples/sheets';

  const log = { details: true };

  const sheetTypes = [INDETERMINATE];
  const sheetNumbers = [];
  const sheetLimit = 0;

  const processLimit = 0;
  const startIndex = 0;

  let result = processDirectory({ readDir, processLimit, startIndex, sheetLimit, sheetTypes, sheetNumbers, log });
  printLog(result.processLog);
});
