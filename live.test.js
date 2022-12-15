import { printGlobalLog, purgeGlobalLog } from './src/utilities/globalLog';
import { processDirectory } from './src/utilities/processDirectory';
import { utilities } from 'tods-competition-factory';
import { setLoggingActive } from './src/global/state';
import { writeFileSync } from 'fs-extra';

it.skip('can process passing', () => {
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

  // setLoggingActive(true);
  // setLoggingActive(true, 'dev');
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

it.only('can process tests', () => {
  const readDir = './examples/sheets/testing';
  const writeDir = './examples/sheets/processed/IND';
  const writeTournamentRecords = false;
  const writeParticipants = false;
  const writeMatchUps = false;
  let writeResultIndex;

  const sheetTypes = [];
  const sheetNumbers = [1];
  const sheetLimit = 0;

  const processLimit = 1;
  const startIndex = 0;

  setLoggingActive(true);
  setLoggingActive(true, 'dev');
  setLoggingActive(true, 'sheetNames');
  setLoggingActive(true, 'matchUps');
  // setLoggingActive(true, 'noWinningSide');
  // setLoggingActive(true, 'invalidResult');
  // setLoggingActive(true, 'scores');
  // setLoggingActive(true, 'matchUps');

  const result = processDirectory({
    processStructures: true,
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

  // console.log( result.fileResults[0].sheetAnalysis[3].analysis?.columnProfiles.map((p) => [p.column, p.attribute || p.character]));
});
