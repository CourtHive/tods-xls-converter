import { readFileSync, readdirSync } from 'fs-extra';
import { utilities } from 'tods-competition-factory';
import xlsTODS from '..';

import { generateTournamentId } from '../utilities/hashing';
// import { generateMatchUpId } from '../utilities/hashing';

import { expect, it } from 'vitest';

it('can log factory version', () => {
  const rootDir = './src/tests/sheets';

  const isXLS = (fileName) => fileName.split('.').reverse()[0].startsWith('xls');
  const filenames = readdirSync(rootDir).filter(isXLS);

  for (const filename of filenames) {
    const buf = readFileSync(`${rootDir}/${filename}`);
    // let result = xlsTODS.loadWorkbook(buf).processSheets();
    // let result = xlsTODS.loadWorkbook(buf).processSheets({ sheetLimit: 1 });
    let result = xlsTODS.loadWorkbook(buf).processSheets({ sheetNumbers: [3] });
    expect(result.success).toEqual(true);

    console.log({ scoreValues: utilities.unique(result.scoreValues) });

    const tournamentId = generateTournamentId();
    console.log({ tournamentId });

    /*
    const matchUpAttributes = { roundNumber: 1, roundPosition: 1, drawSize: 32, participantNames: ['Ray', 'Charles'] };
    const matchUpId = generateMatchUpId(matchUpAttributes);
    console.log({ matchUpId });
    */
  }
  xlsTODS.printGlobalLog();
});
