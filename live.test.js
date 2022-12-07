import { processDirectory } from './src/utilities/processDirectory';
import { printGlobalLog, purgeGlobalLog } from './src/utilities/globalLog';
import { setLoggingActive } from './src/global/state';
import { writeFileSync } from 'fs-extra';

// test without building against sheets in example directory
it('can process passing', () => {
  const readDir = './examples/sheets/processing';
  const writeResult = false;

  const sheetTypes = [];
  const sheetNumbers = [];
  const sheetLimit = 0;

  const processLimit = 1;
  const startIndex = 0;

  setLoggingActive(true);
  // setLoggingActive(true, 'dev');
  // setLoggingActive(true, 'sheetNames');
  // setLoggingActive(true, 'matchUps');
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

  if (writeResult) writeFileSync('./scratch/fileResult.json', JSON.stringify(result.fileResults[0]), 'UTF-8');
});

it.skip('can process tests', () => {
  const readDir = './examples/sheets/testing';

  const sheetTypes = [];
  const sheetNumbers = [3];
  const sheetLimit = 0;

  const processLimit = 1;
  const startIndex = 0;

  setLoggingActive(true);
  setLoggingActive(true, 'dev');
  setLoggingActive(true, 'sheetNames');
  setLoggingActive(true, 'matchUps');

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
  // console.log( result.fileResults[0].sheetAnalysis[3].analysis?.columnProfiles.map((p) => [p.column, p.attribute || p.character]));
});
