import * as factory from 'tods-competition-factory';
import { readFileSync } from 'fs-extra';
import { loadWorkbook } from '..';

import { expect, it } from 'vitest';

it('can log factory version', () => {
  console.log(factory.version());

  const buf = readFileSync('./src/tests/sheets/I2.xlsx');
  let result = loadWorkbook(buf);
  expect(result.success).toEqual(true);
});
