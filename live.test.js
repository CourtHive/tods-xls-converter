import { processDirectory } from './src/utilities/processDirectory';
import { setLoggingActive } from './src/global/state';
import { it } from 'vitest';

// import { KNOCKOUT } from './src/constants/sheetTypes';

// test without building against sheets in example directory
it('can process a directory', () => {
  const readDir = './examples/sheets';

  const sheetTypes = [];
  const sheetNumbers = [];
  const sheetLimit = 0;

  const processLimit = 0;
  const startIndex = 0;

  setLoggingActive(true);
  const result = processDirectory({ readDir, processLimit, startIndex, sheetLimit, sheetTypes, sheetNumbers });
  if (result);
  // console.log(result.fileResults[0].sheetAnalysis[12].analysis.isQualifying);
});
