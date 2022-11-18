import * as factory from 'tods-competition-factory';
import { readFileSync, readdirSync } from 'fs-extra';

import xlsTODS from '..';

import { generateMatchUpId } from '../utilities/hashing';

import { expect, it } from 'vitest';

it('can log factory version', () => {
  console.log(factory.version());

  const rootDir = './src/tests/sheets';

  const isXLS = (fileName) => fileName.split('.').reverse()[0].startsWith('xls');
  const filenames = readdirSync(rootDir).filter(isXLS);

  for (const filename of filenames) {
    const buf = readFileSync(`${rootDir}/${filename}`);
    let result = xlsTODS.loadWorkbook(buf).processSheets();
    expect(result.success).toEqual(true);

    /*
    const matchUpAttributes = { roundNumber: 1, roundPosition: 1, drawSize: 32, participantNames: ['Ray', 'Charles'] };
    const matchUpId = generateMatchUpId(matchUpAttributes);
    console.log({ matchUpId });
    */
  }
  xlsTODS.printGlobalLog();
});
