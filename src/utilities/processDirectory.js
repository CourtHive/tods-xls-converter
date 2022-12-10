import { tournamentEngine, utilities } from 'tods-competition-factory';
import { readdirSync, readFileSync, writeFileSync } from 'fs-extra';
import { getLoggingActive, getWorkbook } from '../global/state';
import { generateDrawId, generateEventId, generateTournamentId } from './hashing';
import { processSheets } from '../functions/processSheets';
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

    const { tournamentId } = generateTournamentId({ attributes: [filename] });

    tournamentEngine.setState({
      participants: tournamentParticipants,
      tournamentId
    });

    const eventsMap = {};
    const tournamentInfo = {};

    if (result.sheetAnalysis) {
      Object.values(result.sheetAnalysis).forEach((sheet) => {
        const { structures = [], analysis = {}, entries } = sheet;
        const gender = analysis.gender || analysis.info?.gender;
        const category = analysis.category || analysis.info?.category;
        const eventKey = (gender && category && `${gender}|${category}`) || gender || category;
        const { drawId, error } = generateDrawId({
          attributes: [...structures.map(({ structureId }) => structureId), tournamentId]
        });

        if (drawId) {
          const drawDefinition = { drawId, structures, entries, drawName: analysis.sheetName };
          if (!eventsMap[eventKey]) {
            eventsMap[eventKey] = { drawDefinitions: [drawDefinition], gender, category };
          } else {
            eventsMap[eventKey].drawDefinitions.push(drawDefinition);
          }
        } else {
          console.log({ error, structures });
        }

        if (analysis.info) {
          const { tournamentName } = analysis.info;
          if (tournamentName) tournamentInfo.tournamentName = tournamentName;
          const newDate = utilities.dateTime.formatDate(new Date());
          tournamentEngine.setTournamentDates({ startDate: newDate, endDate: newDate });
        }
      });

      Object.keys(eventsMap).forEach((key) => {
        const event = eventsMap[key];
        const { category, gender, drawDefinitions } = event;
        const eventName = (key !== 'undefined' && key.split('|').join(' ')) || drawDefinitions?.[0]?.drawName;
        const { eventId } = generateEventId({ attributes: drawDefinitions.map(({ drawId }) => drawId) });
        const entriesMap = Object.assign(
          {},
          ...drawDefinitions.flatMap(({ entries }) =>
            entries?.map((entry) => ({ [entry.participantId]: entry })).filter(Boolean)
          )
        );
        const entries = Object.values(entriesMap);

        const flights = drawDefinitions?.map(({ entries, drawId, drawName }, i) => ({
          drawEntries: entries,
          flightNumber: i + 1,
          drawName,
          drawId
        }));

        const extensions = flights?.length ? [{ name: 'flightProfile', value: { flights } }] : [];

        const result = tournamentEngine.addEvent({
          event: {
            category: { ageCategoryCode: category },
            drawDefinitions,
            extensions,
            eventName,
            eventId,
            entries,
            gender
          }
        });
        if (result.error) console.log(result);
      });
    }

    if (tournamentInfo.tournamentName) {
      tournamentEngine.setTournamentName(tournamentInfo);
    }

    const tournamentMatchUps = tournamentEngine.allTournamentMatchUps().matchUps;
    if (tournamentMatchUps.length) {
      /*
      const participantId = tournamentMatchUps[0].sides[0].participantId;
      const participants = tournamentEngine.getTournamentParticipants().tournamentParticipants;
      const participant = participants.find((p) => p.participantId === participantId);
      console.log({ participantId, participant });
      */
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
      const { tournamentRecord } = tournamentEngine.getState();
      if (tournamentRecord.tournamentId) {
        let { tournamentId, tournamentName } = tournamentRecord;
        tournamentName = tournamentName || tournamentId.split('.')[0];

        writeFileSync(`${writeDir}/${tournamentName}.tods.json`, JSON.stringify(tournamentRecord), 'UTF-8');
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
