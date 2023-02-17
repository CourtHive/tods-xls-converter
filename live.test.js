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

it.only('can process passing', () => {
  const readDir = './examples/sheets/CostaRica/final';
  const writeDir = './examples/sheets/processed/CR/final';

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
  const config = {
    writeTournamentRecords: false,
    writeResultIndex: undefined,
    writeParticipants: true,
    processStructures: true,
    defaultProvider: 'CR',
    writeMatchUps: true,
    writeXLSX: true,
    processLimit,
    sheetNumbers,
    startIndex,
    sheetLimit,
    sheetTypes,
    writeDir,
    readDir
  };
  const result = processDirectory(config);
  if (result) processResult({ result, config });
  /*
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
    */
});

it.skip('can process tests', () => {
  const errorType = NONE;
  const subDir = errorType && `/${errorType}`;
  const year = '2016';
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
  const writeMatchUps = true;
  const writeXLSX = false; // optional output for matchUps; if true then no .csv output is produced
  let writeResultIndex;

  // sheet processing config
  const sheetTypes = [];
  const sheetNumbers = [];
  const sheetLimit = 0;

  // workbook processing config
  const processLimit = 100;
  const startIndex = 0;

  resetLogging();
  setLoggingActive(false);
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
  setLoggingActive(false, 'columnProfiles', { index: undefined, column: undefined });
  setLoggingActive(false, 'columnValues', { roundNumber: 1 });
  setLoggingActive(false, 'detail'); // globalLog notices
  setLoggingActive(true, 'errorLog');
  setLoggingActive(false, 'fileNames');
  setLoggingActive(false, 'finalPositions');
  setLoggingActive(false, 'matchUps', { roundNumber: 2, roundPosition: undefined });
  setLoggingActive(false, 'multipleResults');
  setLoggingActive(false, 'noWinningSide'); // currently ROUND_ROBIN only
  setLoggingActive(false, 'participants', { participantType: undefined, idsOnly: false });
  setLoggingActive(true, 'scoreAudit'); // when true writes to ./scratch/scoreParsing
  setLoggingActive(false, 'scores');
  setLoggingActive(false, 'sheetNames');

  const config = {
    captureProcessedData: true, // set to false to bulk process > 200 files
    // tournamentContext: { startDate: '2022-06-06' },
    progressedPositions: true, // Boolean whether or not to check for positions progressed rather than participant names
    requireProviderIds: true,
    processStructures: true,
    includeWorkbooks: false,
    writeTournamentRecords,
    defaultProvider: 'IND',
    writeParticipants,
    writeResultIndex,
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
  };
  const result = processDirectory(config);
  if (result) processResult({ result, config });
});

function processResult({ result, config }) {
  printGlobalLog();
  purgeGlobalLog();

  const auditLog = getAudit();

  const invalidScores = getInvalid();
  if (invalidScores?.length) {
    const csvInvalid = utilities.JSON2CSV(invalidScores);
    writeFileSync(`${config.writeDir}/invalidScores.csv`, csvInvalid, 'UTF-8');
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
    writeFileSync(`${config.writeDir}/uniqueScores.csv`, csvUnique, 'UTF-8');
    const csvScores = utilities.JSON2CSV(scoreAudit);
    writeFileSync(`${config.writeDir}/scoreParsing.csv`, csvScores, 'UTF-8');
  }

  if (config.writeParticipants) {
    const participants = result.participants.filter(({ participantType }) => participantType === 'INDIVIDUAL');
    const csvParticipants = utilities.JSON2CSV(participants, {
      columnAccessors: ['person.personId', 'participantName', 'person.standardFamilyName', 'person.standardGivenName']
    });
    writeFileSync(`${config.writeDir}/participants.json`, JSON.stringify(participants), 'UTF-8');
    writeFileSync(`${config.writeDir}//participants.csv`, csvParticipants, 'UTF-8');
  }

  if (!isNaN(config.writeResultIndex))
    writeFileSync(
      `${config.writeDir}/fileResult.json`,
      JSON.stringify(result.fileResults[config.writeResultIndex]),
      'UTF-8'
    );

  // console.log(result.fileResults[0].sheetAnalysis[2].analysis.info);
}
