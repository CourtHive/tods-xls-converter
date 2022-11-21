import { processDirectory } from '../utilities/processDirectory';
import { it } from 'vitest';

import { INDETERMINATE } from '../constants/sheetTypes';

it('can process a directory', () => {
  const readDir = './src/tests/sheets';

  const sheetNumbers = [];
  const sheetTypes = [INDETERMINATE];
  const sheetLimit = 0;

  const processLimit = 0;
  const startIndex = 0;

  processDirectory({ readDir, processLimit, startIndex, sheetLimit, sheetTypes, sheetNumbers });
});
