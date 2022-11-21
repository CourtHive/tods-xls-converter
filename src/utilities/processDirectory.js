import { utilities } from 'tods-competition-factory';
import { readdirSync, readFileSync } from 'fs-extra';
import { pushGlobalLog } from './globalLog';
import xlsTODS from '..';

export function processDirectory({
  log = { resultValues: false, skippedResults: false, details: true },
  writeTournamentRecords = false,
  writeDir = './',
  readDir = './',

  processLimit = 0,
  startIndex = 0,
  sheetNumbers,
  sheetTypes,
  sheetLimit
}) {
  const isXLS = (filename) => filename.split('.').reverse()[0].startsWith('xls');
  let filenames = readdirSync(readDir).filter(isXLS);
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
  const fileResults = {};
  const errorLog = {};

  let index = 0;
  for (const filename of filenames) {
    const buf = readFileSync(`${readDir}/${filename}`);
    let result = xlsTODS.loadWorkbook(buf, index).processSheets({ filename, sheetNumbers, sheetLimit, sheetTypes });
    fileResults[index] = result;
    index += 1;

    if (result.skippedResults?.length) skippedResults.push(...result.skippedResults);
    if (result.resultValues?.length) resultValues.push(...result.resultValues);

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

    if (writeTournamentRecords && writeDir) {
      const { tournamentRecord } = xlsTODS.getTournamentRecord();
      if (tournamentRecord.tournamentId) {
        // write to file
      }
    }
  }

  if (log.resultValues) console.table(utilities.unique(resultValues));
  if (log.skippedResults && skippedResults.length) {
    console.table(utilities.unique(skippedResults).sort());
  }

  const errorKeys = Object.keys(errorLog);
  const filesWithErrors = errorKeys.map((key) => errorLog[key].length).reduce((a, b) => a + b, 0);
  const totalErrors = errorKeys
    ?.flatMap((key) => errorLog[key].map((file) => file.sheetNames.length))
    .reduce((a, b) => a + b, 0);

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

  if (log.details) {
    xlsTODS.printGlobalLog();
  } else {
    xlsTODS.purgeGlobalLog();
  }

  return { fileResults, resultValues, skippedResults };
}
