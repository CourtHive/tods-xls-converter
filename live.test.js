import { getAudit, getLoggingActive, resetLogging, setLoggingActive } from './src/global/state';
import { printGlobalLog, purgeGlobalLog } from './src/utilities/globalLog';
import { processDirectory } from './src/utilities/processDirectory';
import { utilities } from 'tods-competition-factory';
import { writeFileSync } from 'fs-extra';

setLoggingActive();

it.skip('can process passing', () => {
  const readDir = './examples/sheets/processing';
  const writeDir = './examples/sheets/processed/CR';
  const writeTournamentRecords = false;
  const writeParticipants = false;
  const writeMatchUps = true;
  let writeResultIndex;

  // const sheetTypes = ['ROUND_ROBIN'];
  const sheetTypes = [];
  const sheetNumbers = [];
  const sheetLimit = 0;

  const processLimit = 0;
  const startIndex = 0;

  resetLogging();
  setLoggingActive(true);
  // setLoggingActive(true, 'dev');
  // setLoggingActive(true, 'fileNames');
  // setLoggingActive(true, 'sheetNames');
  // setLoggingActive(true, 'noWinningSide');
  // setLoggingActive(true, 'invalidResult');
  // setLoggingActive(true, 'scores');
  // setLoggingActive(true, 'matchUps');
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
  const readDir = './examples/sheets/testing/SinglePositionMatchUps';
  // const readDir = './examples/sheets/testing';
  const writeDir = './examples/sheets/processed/IND';
  const writeTournamentRecords = false;
  const writeParticipants = false;
  const writeMatchUps = false;
  let writeResultIndex;

  const sheetTypes = [];
  const sheetNumbers = [];
  const sheetLimit = 0;

  const processLimit = 0;
  const startIndex = 0;

  resetLogging();
  setLoggingActive(true);
  setLoggingActive(false, 'singlePositions');
  setLoggingActive(false, 'advanceTargets', {
    roundNumbers: [1],
    roundPositions: [5],
    participantValues: true,
    potentialValues: true,
    sideWeights: false,
    pRank: true
  });
  setLoggingActive(false, 'columnProfiles');
  setLoggingActive(false, 'detail'); // globalLog notices
  setLoggingActive(false, 'dev');
  setLoggingActive(false, 'fileNames');
  setLoggingActive(false, 'finalPositions');
  setLoggingActive(false, 'invalidResult');
  setLoggingActive(false, 'matchUps');
  setLoggingActive(false, 'multipleResults');
  setLoggingActive(false, 'noWinningSide');
  setLoggingActive(false, 'participants');
  setLoggingActive(false, 'scoreAudit'); // when true writes to ./scratch/scoreParsing
  setLoggingActive(false, 'scores');
  setLoggingActive(false, 'sheetNames');

  const result = processDirectory({
    captureProcessedData: false, // set to false to bulk process > 200 files
    // tournamentContext: { startDate: '2022-06-06' },
    processStructures: true,
    includeWorkbooks: false,
    writeTournamentRecords,
    defaultProvider: 'IND',
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

  const auditLog = getAudit();

  if (getLoggingActive('scoreAudit')) {
    const scoreAudit = auditLog.filter((item) => typeof item === 'object' && item.scoreString);
    const csvScores = utilities.JSON2CSV(scoreAudit);
    writeFileSync('./scratch/scoreParsing.csv', csvScores, 'UTF-8');
  }

  if (writeParticipants) {
    const participants = result.participants.filter(({ participantType }) => participantType === 'INDIVIDUAL');
    const csvParticipants = utilities.JSON2CSV(participants, {
      columnAccessors: ['person.personId', 'participantName', 'person.standardFamilyName', 'person.standardGivenName']
    });
    writeFileSync('./scratch/participants.json', JSON.stringify(participants), 'UTF-8');
    writeFileSync('./scratch/participants.csv', csvParticipants, 'UTF-8');
  }

  if (!isNaN(writeResultIndex))
    writeFileSync('./scratch/fileResult.json', JSON.stringify(result.fileResults[writeResultIndex]), 'UTF-8');

  // console.log(result.fileResults[0].sheetAnalysis[2].analysis.info);
});
