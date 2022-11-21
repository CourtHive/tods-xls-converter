import { processDirectory } from '../utilities/processDirectory';
import { it } from 'vitest';

it('can process a directory', () => {
  const readDir = './src/tests/sheets';
  const processLimit = 0;
  const startIndex = 0;

  processDirectory({ readDir, processLimit, startIndex });
});
