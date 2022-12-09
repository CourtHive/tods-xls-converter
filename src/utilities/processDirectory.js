import { getLoggingActive, getTournamentRecord, getWorkbook } from '../global/state';
import { tournamentEngine } from 'tods-competition-factory';
import { processSheets } from '../functions/processSheets';
import { readdirSync, readFileSync } from 'fs-extra';
import { loadWorkbook } from '../global/loader';
import { pushGlobalLog } from './globalLog';

export function processDirectory({
  writeTournamentRecords = false,
  writeDir = './',
  readDir = './',

  processStructures = true,
  includeWorkbooks,
  processLimit = 0,
  startIndex = 0,
  sheetNumbers,
  sheetTypes,
  sheetLimit
}) {
  const isXLS = (filename) => filename.split('.').reverse()[0].startsWith('xls');
  let filenames = readdirSync(readDir).filter(isXLS);
  const workbookCount = filenames.length;

  const logging = getLoggingActive('dev');

  const processing =
    processLimit && startIndex + processLimit < workbookCount ? processLimit : workbookCount - startIndex;

  pushGlobalLog({
    method: 'processWorkbooks',
    keyColors: { attributes: 'brightgreen' },
    color: 'brightcyan',
    lineAfter: true,
    separator: ':',
    newLine: true,
    divider: 80,

    workbookCount,
    processing
  });

  if (processLimit) {
    filenames = filenames.slice(startIndex, startIndex + processLimit);
  } else if (startIndex) {
    filenames = filenames.slice(startIndex);
  }

  const allParticipantsMap = {};
  const skippedResults = [];
  const resultValues = [];
  const fileResults = {};
  const errorLog = {};

  let totalMatchUps = 0;

  let index = 0;
  for (const filename of filenames) {
    if (getLoggingActive('sheetNames')) console.log({ filename, index });
    const buf = readFileSync(`${readDir}/${filename}`);
    let result = loadWorkbook(buf, index);
    const additionalContent = includeWorkbooks ? getWorkbook() : {};
    result = processSheets({ filename, sheetNumbers, sheetLimit, sheetTypes, processStructures });
    fileResults[index] = { filename, ...result, ...additionalContent };
    index += 1;

    const { participants: participantsMap } = result;
    const tournamentParticipants = participantsMap ? Object.values(participantsMap) : [];
    Object.assign(allParticipantsMap, participantsMap);

    tournamentEngine.setState({
      participants: tournamentParticipants,
      tournamentId: filename
    });

    const allWorkbookMatchUps = [];
    if (result.sheetAnalysis) {
      Object.values(result.sheetAnalysis).forEach(({ structures = [] }) => {
        const { matchUps = [] } = tournamentEngine.allDrawMatchUps({
          drawDefinition: { structures },
          inContext: true
        });
        allWorkbookMatchUps.push(...matchUps);
      });
    }
    if (allWorkbookMatchUps.length) {
      // console.log(allWorkbookMatchUps.length);
    }

    totalMatchUps += result.totalMatchUps || 0;
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
      const { tournamentRecord } = getTournamentRecord();
      if (tournamentRecord.tournamentId) {
        // write to file
      }
    }
  }

  const errorKeys = Object.keys(errorLog);
  const errorTypes = errorKeys.map((key) => errorLog[key].length).reduce((a, b) => a + b, 0);
  const totalErrors = errorKeys
    ?.flatMap((key) => errorLog[key].map((file) => file.sheetNames.length))
    .reduce((a, b) => a + b, 0);

  const sheetsProcessed = Object.values(fileResults)
    .map(
      ({ sheetAnalysis = {} }) =>
        Object.values(sheetAnalysis).filter(({ hasValues, analysis }) => hasValues && !analysis?.skipped).length
    )
    .reduce((a, b) => a + b, 0);

  if (logging) console.log({ sheetsProcessed, totalMatchUps, errorTypes, totalErrors });

  pushGlobalLog({
    method: 'processingComplete',
    keyColors: { attributes: 'brightgreen' },
    color: 'brightcyan',
    separator: ':',
    newLine: true,
    divider: 80,

    sheetsProcessed,
    totalMatchUps,
    totalErrors
  });

  return { fileResults, resultValues, skippedResults, participants: Object.values(allParticipantsMap) };
}
