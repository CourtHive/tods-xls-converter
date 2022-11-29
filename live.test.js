import { processDirectory } from './src/utilities/processDirectory';
import { printGlobalLog, purgeGlobalLog } from './src/utilities/globalLog';
import { setLoggingActive } from './src/global/state';
import { writeFileSync } from 'fs-extra';
import { it } from 'vitest';

// test without building against sheets in example directory
it('can process passing', () => {
  const readDir = './examples/sheets/processing';
  const writeResult = false;

  const sheetTypes = [];
  const sheetNumbers = [];
  const sheetLimit = 0;

  const processLimit = 1;
  const startIndex = 0;

  // setLoggingActive(true);
  const result = processDirectory({
    processLimit,
    sheetNumbers,
    startIndex,
    sheetLimit,
    sheetTypes,
    readDir
  });
  if (result);
  printGlobalLog();
  purgeGlobalLog();
  console.log('PASSED', Object.keys(result));
  // console.log(result.fileResults[0].sheetAnalysis[12].analysis.isQualifying);

  if (writeResult) writeFileSync('./scratch/fileResult.json', JSON.stringify(result.fileResults[0]), 'UTF-8');
});

it('can process tests', () => {
  const readDir = './examples/sheets/testing';

  const sheetTypes = [];
  const sheetNumbers = [1];
  const sheetLimit = 0;

  const processLimit = 0;
  const startIndex = 3;

  setLoggingActive(true);
  setLoggingActive(true, 'dev');

  const result = processDirectory({
    processStructures: true,
    processLimit,
    sheetNumbers,
    startIndex,
    sheetLimit,
    sheetTypes,
    readDir
  });
  if (result);
  printGlobalLog();
  // console.log(result.fileResults[0].sheetAnalysis[12].analysis.isQualifying);
});
