import { printGlobalLog, purgeGlobalLog } from './src/utilities/globalLog';
import { getAudit, getLoggingActive, resetLogging, setLoggingActive } from './src/global/state';
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
  const readDir = './examples/sheets/testing';
  const writeDir = './examples/sheets/processed/IND';
  const writeTournamentRecords = false;
  const writeParticipants = false;
  const writeMatchUps = true;
  let writeResultIndex;

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
  // setLoggingActive(true, 'matchUps');
  // setLoggingActive(true, 'noWinningSide');
  // setLoggingActive(true, 'invalidResult');
  // setLoggingActive(true, 'multiple results');
  // setLoggingActive(true, 'scores');
  // setLoggingActive(true, 'score-audit');
  // setLoggingActive(true, 'matchUps');
  // setLoggingActive(true, 'finalPositions');
  // setLoggingActive(true, 'participants');

  const result = processDirectory({
    captureProcessedData: true, // set to false to bulk process > 200 files
    // tournamentContext: { startDate: '2022-06-06' },
    processStructures: true,
    includeWorkbooks: true,
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

  if (getLoggingActive('score-audit')) {
    const auditLog = getAudit();
    const csvScores = utilities.JSON2CSV(auditLog);
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
