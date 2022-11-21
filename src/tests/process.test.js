import { pushGlobalLog } from '../utilities/globalLog';
import { readFileSync, readdirSync } from 'fs-extra';
// import { utilities } from 'tods-competition-factory';
import xlsTODS from '..';

// import { generateTournamentId } from '../utilities/hashing';
// import { generateMatchUpId } from '../utilities/hashing';

import { expect, it } from 'vitest';

it('can log factory version', () => {
  const rootDir = './src/tests/sheets';
  const processLimit = 0;
  const startIndex = 0;

  const isXLS = (filename) => filename.split('.').reverse()[0].startsWith('xls');
  let filenames = readdirSync(rootDir).filter(isXLS);
  const workbookCount = filenames.length;

  const processing =
    processLimit && startIndex + processLimit < workbookCount ? processLimit : workbookCount - startIndex;

  pushGlobalLog({
    method: 'processWorkbooks',
    keyColors: { attributes: 'brightgreen' },
    color: 'brightcyan',
    lineAfter: true,
    separator: ':',
    newLine: true,
    divider: 70,

    workbookCount,
    processing
  });

  if (processLimit) filenames = filenames.slice(startIndex, startIndex + processLimit);

  const skippedResults = [];
  const resultValues = [];
  const errorLog = {};

  for (const filename of filenames) {
    const buf = readFileSync(`${rootDir}/${filename}`);
    let result = xlsTODS.loadWorkbook(buf).processSheets({ filename });
    // let result = xlsTODS.loadWorkbook(buf).processSheets({ filename, sheetLimit: 1 });
    // let result = xlsTODS.loadWorkbook(buf).processSheets({ filename, sheetNumbers: [3] });
    expect(result.success).toEqual(true);

    if (result.resultValues?.length) resultValues.push(...result.resultValues);
    // console.log({ resultValues: utilities.unique(result.resultValues) });

    if (result.skippedResults?.length) {
      skippedResults.push(...result.skippedResults);
      // console.log({ skippedResults: utilities.unique(result.skippedResults).sort() });
    }

    if (result.errorLog) {
      Object.keys(result.errorLog).forEach((key) => {
        const sheetNames = result.errorLog[key];
        if (!errorLog[key]) {
          errorLog[key] = [{ filename, sheetNames }];
        } else {
          errorLog[key].push({ filename, sheetNames });
        }
      });
    }

    /*
    const tournamentId = generateTournamentId();
    console.log({ tournamentId });

    const matchUpAttributes = { roundNumber: 1, roundPosition: 1, drawSize: 32, participantNames: ['Ray', 'Charles'] };
    const matchUpId = generateMatchUpId(matchUpAttributes);
    console.log({ matchUpId });
    */
  }

  /*
  console.table(utilities.unique(resultValues));
  if (skippedResults.length) {
    console.table(utilities.unique(skippedResults).sort());
  }
  */

  const errorKeys = Object.keys(errorLog);
  if (errorKeys.length) {
    const filesWithErrors = errorKeys.map((key) => errorLog[key].length).reduce((a, b) => a + b, 0);
    const totalErrors = errorKeys
      .flatMap((key) => errorLog[key].map((file) => file.sheetNames.length))
      .reduce((a, b) => a + b);

    pushGlobalLog({
      method: 'processingComplete',
      keyColors: { attributes: 'brightgreen' },
      color: 'brightcyan',
      separator: ':',
      newLine: true,
      divider: 70,

      filesWithErrors,
      totalErrors
    });
  }

  xlsTODS.printGlobalLog();
});
