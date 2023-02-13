import { getAudit, getLoggingActive, resetLogging, setLoggingActive } from './src/global/state';
import { dumpInvalid, getInvalid } from './src/functions/scoreParser/scoreParser';
import { printGlobalLog, purgeGlobalLog } from './src/utilities/globalLog';
import { processDirectory } from './src/utilities/processDirectory';
import { utilities } from 'tods-competition-factory';
import { writeFileSync } from 'fs-extra';

import { PERSON_ID, RANKING } from './src/constants/attributeConstants';
import {
  ENTRIES_NOT_ON_POSITION_ROWS,
  INVALID_MATCHUPS_TOTAL,
  MISSING_ID_COLUMN,
  MISSING_NAMES,
  MISSING_SHEET_DEFINITION,
  NO_POSITION_ROWS_FOUND,
  POSITION_PROGRESSION
} from './src/constants/errorConditions';

const NONE = '';

setLoggingActive();

// bogus function to reference potentially unused errorConditions
// and thus to avoid linting complaints!
export function foo() {
  const hoo =
    MISSING_SHEET_DEFINITION &&
    NO_POSITION_ROWS_FOUND &&
    MISSING_NAMES &&
    INVALID_MATCHUPS_TOTAL &&
    MISSING_ID_COLUMN &&
    ENTRIES_NOT_ON_POSITION_ROWS &&
    POSITION_PROGRESSION &&
    NONE;

  const boo = RANKING && PERSON_ID;

  return boo && hoo;
}

it.skip('can process passing', () => {
  const readDir = './examples/sheets/processing';
  const writeDir = './examples/sheets/processed/CR';
  const writeTournamentRecords = false;
  const writeParticipants = false;
  const writeMatchUps = false;
  let writeResultIndex;

  const sheetTypes = []; // e.g. ROUND_ROBIN
  const sheetNumbers = [];
  const sheetLimit = 0;

  const processLimit = 0;
  const startIndex = 0;

  resetLogging();
  setLoggingActive(true);
  setLoggingActive(false, 'errorlog');
  setLoggingActive(false, 'fileNames');
  setLoggingActive(false, 'sheetNames');
  setLoggingActive(false, 'noWinningSide');
  setLoggingActive(false, 'invalidResult');
  setLoggingActive(false, 'scores');
  setLoggingActive(false, 'matchUps');
  const result = processDirectory({
    writeTournamentRecords,
    writeMatchUps,
    processLimit,
    sheetNumbers,
    startIndex,
    sheetLimit,
    sheetTypes,
    writeDir,
    readDir
  });
  if (result);
  printGlobalLog();
  purgeGlobalLog();
  console.log('PASSED', Object.keys(result));

  if (writeParticipants) {
    const participants = result.participants.filter(({ participantType }) => participantType === 'INDIVIDUAL');
    const csvParticipants = utilities.JSON2CSV(participants, {
      columnAccessors: ['participantId', 'participantName', 'person.standardFamilyName', 'person.standardGivenName']
    });
    writeFileSync('./scratch/participants.json', JSON.stringify(participants), 'UTF-8');
    writeFileSync('./scratch/participants.csv', csvParticipants, 'UTF-8');
  }
  if (!isNaN(writeResultIndex))
    writeFileSync('./scratch/fileResult.json', JSON.stringify(result.fileResults[writeResultIndex]), 'UTF-8');
});

it('can process tests', () => {
  const errorType = POSITION_PROGRESSION;
  const subDir = errorType && `/${errorType}`;
  const year = '2022';
  if (subDir || year) {
    // do nothing!
  }

  // const readDir = './examples/sheets/testing/';
  // const writeDir = `./examples/sheets/processed/testing`;
  const readDir = `./examples/sheets/India/years/${year}${subDir}`;
  const writeDir = `./examples/sheets/processed/IND/${year}`;
  const writeTournamentRecords = false;
  const writeParticipants = false;
  const moveErrorFiles = false;
  const writeMatchUps = false;
  const writeXLSX = false; // optional output for matchUps; if true then now .csv output is produced
  let writeResultIndex;

  // sheet processing config
  const sheetTypes = [];
  const sheetNumbers = [5];
  const sheetLimit = 0;

  // workbook processing config
  const processLimit = 1;
  const startIndex = 0;

  resetLogging();
  setLoggingActive(true);
  setLoggingActive(false, 'singlePositions');
  setLoggingActive(false, 'advanceTargets', {
    roundNumbers: [1],
    roundPositions: [2],
    participantValues: true,
    potentialValues: true,
    sideWeights: true,
    pRank: false
  });
  setLoggingActive(false, 'headerColumns', { attr: 'round', column: 'A' });
  setLoggingActive(false, 'columnFrequency');
  setLoggingActive(false, 'columnProfiles', { index: undefined, column: 'F' });
  setLoggingActive(false, 'columnValues', { roundNumber: 1 });
  setLoggingActive(false, 'detail'); // globalLog notices
  setLoggingActive(true, 'errorLog');
  setLoggingActive(false, 'fileNames');
  setLoggingActive(false, 'finalPositions');
  setLoggingActive(false, 'matchUps', { roundNumber: 1, roundPosition: undefined });
  setLoggingActive(false, 'multipleResults');
  setLoggingActive(false, 'noWinningSide'); // currently ROUND_ROBIN only
  setLoggingActive(false, 'participants', { participantType: undefined, idsOnly: false });
  setLoggingActive(true, 'scoreAudit'); // when true writes to ./scratch/scoreParsing
  setLoggingActive(false, 'scores');
  setLoggingActive(false, 'sheetNames');

  const result = processDirectory({
    captureProcessedData: true, // set to false to bulk process > 200 files
    // tournamentContext: { startDate: '2022-06-06' },
    processStructures: true,
    includeWorkbooks: false,
    writeTournamentRecords,
    defaultProvider: 'IND',
    moveErrorFiles,
    writeMatchUps,
    processLimit,
    sheetNumbers,
    startIndex,
    sheetLimit,
    sheetTypes,
    writeXLSX,
    errorType,
    writeDir,
    readDir
  });
  if (result) {
    printGlobalLog();
    purgeGlobalLog();

    const auditLog = getAudit();

    const invalidScores = getInvalid();
    if (invalidScores?.length) {
      const csvInvalid = utilities.JSON2CSV(invalidScores);
      writeFileSync(`${writeDir}/invalidScores.csv`, csvInvalid, 'UTF-8');
      dumpInvalid();
    }

    if (getLoggingActive('scoreAudit')) {
      const scoreAudit = auditLog.filter((item) => typeof item === 'object' && item.scoreString);
      const uniqueMap = scoreAudit.reduce((unique, item) => {
        const { scoreString } = item;
        if (!unique[scoreString]) unique[scoreString] = { scoreString, count: 0 };
        unique[scoreString].count += 1;
        return unique;
      }, {});
      const csvUnique = utilities.JSON2CSV(Object.values(uniqueMap));
      writeFileSync(`${writeDir}/uniqueScores.csv`, csvUnique, 'UTF-8');
      const csvScores = utilities.JSON2CSV(scoreAudit);
      writeFileSync(`${writeDir}/scoreParsing.csv`, csvScores, 'UTF-8');
    }

    if (writeParticipants) {
      const participants = result.participants.filter(({ participantType }) => participantType === 'INDIVIDUAL');
      const csvParticipants = utilities.JSON2CSV(participants, {
        columnAccessors: ['person.personId', 'participantName', 'person.standardFamilyName', 'person.standardGivenName']
      });
      writeFileSync(`${writeDir}/participants.json`, JSON.stringify(participants), 'UTF-8');
      writeFileSync(`${writeDir}//participants.csv`, csvParticipants, 'UTF-8');
    }

    if (!isNaN(writeResultIndex))
      writeFileSync(`${writeDir}/fileResult.json`, JSON.stringify(result.fileResults[writeResultIndex]), 'UTF-8');

    // console.log(result.fileResults[0].sheetAnalysis[2].analysis.info);
  }
});
