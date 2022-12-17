import { printGlobalLog, purgeGlobalLog } from './src/utilities/globalLog';
import { resetLogging, setLoggingActive } from './src/global/state';
import { processDirectory } from './src/utilities/processDirectory';
import { utilities } from 'tods-competition-factory';
import { writeFileSync } from 'fs-extra';

setLoggingActive;

it('can process passing', () => {
  const readDir = './examples/sheets/processing';
  const writeDir = './examples/sheets/processed/CR';
  const writeTournamentRecords = false;
  const writeParticipants = false;
  const writeMatchUps = false;
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

  const processLimit = 1;
  const startIndex = 0;

  resetLogging();
  setLoggingActive(true);
  // setLoggingActive(true, 'dev');
  // setLoggingActive(true, 'sheetNames');
  // setLoggingActive(true, 'matchUps');
  // setLoggingActive(true, 'noWinningSide');
  // setLoggingActive(true, 'invalidResult');
  // setLoggingActive(true, 'scores');
  // setLoggingActive(true, 'matchUps');

  const result = processDirectory({
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
