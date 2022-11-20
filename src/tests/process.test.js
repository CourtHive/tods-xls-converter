import { readFileSync, readdirSync } from 'fs-extra';
import { utilities } from 'tods-competition-factory';
import xlsTODS from '..';

// import { generateTournamentId } from '../utilities/hashing';
// import { generateMatchUpId } from '../utilities/hashing';

import { expect, it } from 'vitest';

it('can log factory version', () => {
  const rootDir = './src/tests/sheets';

  const isXLS = (filename) => filename.split('.').reverse()[0].startsWith('xls');
  const filenames = readdirSync(rootDir).filter(isXLS);

  const skippedResults = [];
  const resultValues = [];

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

    /*
    const tournamentId = generateTournamentId();
    console.log({ tournamentId });

    const matchUpAttributes = { roundNumber: 1, roundPosition: 1, drawSize: 32, participantNames: ['Ray', 'Charles'] };
    const matchUpId = generateMatchUpId(matchUpAttributes);
    console.log({ matchUpId });
    */
  }
  console.table(utilities.unique(resultValues));
  if (skippedResults.length) {
    console.table(utilities.unique(skippedResults).sort());
  }
  xlsTODS.printGlobalLog();
});
