import { matchUpStatusConstants, tournamentEngine, utilities } from 'tods-competition-factory';
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'fs-extra';
import { generateDrawId, generateEventId, generateTournamentId } from './hashing';
import { getLoggingActive, getWorkbook } from '../global/state';
import { processSheets } from '../functions/processSheets';
import { writeTODS08CSV } from './writeTODS08CSV';
import { loadWorkbook } from '../global/loader';
import { pushGlobalLog } from './globalLog';

const { BYE, WALKOVER, DOUBLE_WALKOVER } = matchUpStatusConstants;

export function processDirectory({
  writeTournamentRecords = false,
  writeMatchUps = false,
  writeDir = './',
  readDir = './',

  useFileCreationDate = true,
  tournamentContext = {},
  matchUpContext = {},

  captureProcessedData = true,
  processStructures = true,
  includeWorkbooks,
  processLimit = 0,
  startIndex = 0,
  sheetNumbers,
  sheetTypes,
  sheetLimit
}) {
  const isXLS = (fileName) => fileName.split('.').reverse()[0].startsWith('xls');
  let fileNames = readdirSync(readDir).filter(isXLS);
  const workbookCount = fileNames.length;

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
    fileNames = fileNames.slice(startIndex, startIndex + processLimit);
  } else if (startIndex) {
    fileNames = fileNames.slice(startIndex);
  }

  const allParticipantsMap = {};
  const skippedResults = [];
  const resultValues = [];
  const allMatchUps = [];
  const fileResults = {};
  const errorLog = {};

  let tournamentRecords = [];
  let totalMatchUps = 0;

  let index = 0;
  for (const fileName of fileNames) {
    if (getLoggingActive('sheetNames') || getLoggingActive('fileNames')) console.log({ fileName, index });
    const buf = readFileSync(`${readDir}/${fileName}`);
    const stat = statSync(`${readDir}/${fileName}`);

    let result = loadWorkbook(buf, index);
    const { workbookType } = result;
    const additionalContent = includeWorkbooks ? getWorkbook() : {};
    result = processSheets({ fileName, sheetNumbers, sheetLimit, sheetTypes, processStructures });
    if (captureProcessedData) {
      fileResults[index] = { fileName, ...result, ...additionalContent };
    }
    index += 1;

    const { participants: participantsMap } = result;
    const tournamentParticipants = participantsMap ? Object.values(participantsMap) : [];
    const individualParticipants = tournamentParticipants.flatMap(({ individualParticipants }) => {
      return individualParticipants || [];
    });
    tournamentParticipants.push(...individualParticipants);
    if (getLoggingActive('participants'))
      console.log(tournamentParticipants, { participantsCount: tournamentParticipants.length });

    if (captureProcessedData) {
      Object.assign(allParticipantsMap, participantsMap);
    }

    const { tournamentId } = generateTournamentId({ attributes: [fileName] });

    const profile = workbookType?.profile;

    tournamentEngine.setState({
      participants: tournamentParticipants,
      ...tournamentContext,
      tournamentId
    });

    if (profile?.fileDateParser) {
      const dateString = profile.fileDateParser(fileName);
      tournamentEngine.setTournamentDates({ startDate: dateString, endDate: dateString });
    }

    const eventsMap = {};
    const tournamentInfo = {};

    if (result.sheetAnalysis) {
      Object.values(result.sheetAnalysis).forEach((sheet) => {
        const { structures = [], analysis = {}, entries } = sheet;
        const startDate = analysis.info?.startDate;
        const gender = analysis.gender || analysis.info?.gender;
        const category = analysis.category || analysis.info?.category;
        const eventKey = (gender && category && `${gender}|${category}`) || gender || category;
        const { drawId, error } = generateDrawId({
          attributes: [...structures.map(({ structureId }) => structureId), tournamentId]
        });

        if (drawId) {
          const drawDefinition = {
            drawName: analysis.sheetName,
            drawType: analysis.drawType,
            structures,
            entries,
            drawId
          };
          if (!eventsMap[eventKey]) {
            eventsMap[eventKey] = { drawDefinitions: [drawDefinition], gender, category, startDate };
          } else {
            eventsMap[eventKey].drawDefinitions.push(drawDefinition);
          }
        } else {
          console.log({ error, structures });
        }

        if (analysis.info) {
          const { tournamentName, startDate } = analysis.info;
          if (tournamentName) tournamentInfo.tournamentName = tournamentName;
          if (startDate && !tournamentInfo.startDate) tournamentInfo.startDate = startDate;
        }
      });

      Object.keys(eventsMap).forEach((key) => {
        const event = eventsMap[key];
        const { category, gender, startDate, drawDefinitions } = event;
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

        const structuresCount = drawDefinitions
          ?.map(({ structures }) => structures.length)
          .reduce((a, b) => (a || 0) + (b || 0), 0);

        if (structuresCount) {
          const result = tournamentEngine.addEvent({
            event: {
              category: { ageCategoryCode: category },
              endDate: startDate,
              drawDefinitions,
              extensions,
              eventName,
              startDate,
              eventId,
              entries,
              gender
            }
          });
          if (result.error) console.log(result);
        }
      });
    }

    const { tournamentName, startDate } = tournamentInfo || {};

    if (tournamentName) {
      tournamentEngine.setTournamentName({ tournamentName });
    }
    if (startDate) {
      const { startDate: existingStartDate } = tournamentEngine.getTournamentInfo();
      if (!existingStartDate) tournamentEngine.setTournamentDates({ startDate, endDate: startDate });
    } else {
      const message = `No Date Found`;
      const contextDate = matchUpContext?.startDate || tournamentContext?.startDate;
      const filedate = useFileCreationDate && !contextDate ? stat.birthtime : undefined;

      pushGlobalLog({
        method: 'notice',
        color: 'brightred',
        keyColors: { message: 'yellow', attributes: 'brightred', context: 'brightgreen', filedate: 'brightgreen' },
        message,
        contextDate,
        filedate
      });

      const foundDate = contextDate || utilities.dateTime.extractDate(filedate?.toISOString());
      if (foundDate) {
        const result = tournamentEngine.setTournamentDates({ startDate: foundDate, endDate: foundDate });
        if (result.error) console.log(result);
      }
    }

    const matchUps = tournamentEngine.allTournamentMatchUps({
      context: { tournamentName, level: 'REG', identifierType: profile?.identifierType, ...matchUpContext }
    }).matchUps;

    if (getLoggingActive('finalPositions')) {
      const finals = matchUps.filter((matchUp) => matchUp.roundName === 'Final');
      console.log(finals.map((m) => [m.eventName, m.drawPositions]));
    }

    if (captureProcessedData) {
      allMatchUps.push(...matchUps);
    }

    totalMatchUps += result.totalMatchUps || 0;

    if (captureProcessedData) {
      if (result.skippedResults?.length) skippedResults.push(...result.skippedResults);
      if (result.resultValues?.length) resultValues.push(...result.resultValues);
    }

    if (result.errorLog) {
      Object.keys(result.errorLog).forEach((key) => {
        const sheetNames = result.errorLog[key];
        if (!errorLog[key]) {
          errorLog[key] = [{ fileName, sheetNames }];
        } else {
          errorLog[key].push({ fileName, sheetNames });
        }
      });
    }

    const tournamentRecord = tournamentEngine.getState().tournamentRecord;

    if (captureProcessedData) {
      tournamentRecords.push(tournamentRecord);
    }

    if (writeTournamentRecords && writeDir) {
      if (tournamentRecord.tournamentId) {
        let { tournamentId, tournamentName } = tournamentRecord;
        tournamentName = tournamentName || tournamentId.split('.')[0];
        const startDate = tournamentRecord?.startDate;
        if (startDate) tournamentName = startDate + '-' + tournamentName;

        while (existsSync(`${writeDir}/${tournamentName}.tods.json`)) {
          const re = /(.*)\((\d+)\)$/;
          const parsed = re.test(tournamentName) && tournamentName.match(re);
          let increment = parsed?.[2] ? +parsed[2] + 1 : 1;
          tournamentName = (parsed ? parsed[1] : tournamentName) + `(${increment})`;
        }

        writeFileSync(`${writeDir}/${tournamentName}.tods.json`, JSON.stringify(tournamentRecord), 'UTF-8');
      }
    }
  }

  if (writeMatchUps && writeDir) {
    const filteredMatchUps = allMatchUps.filter(
      (matchUp) =>
        ![BYE, WALKOVER, DOUBLE_WALKOVER].includes(matchUp.matchUpStatus) &&
        matchUp.drawPositions.length === 2 &&
        matchUp.winningSide
    );
    writeTODS08CSV({ matchUps: filteredMatchUps, writeDir });
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

  return {
    participants: Object.values(allParticipantsMap),
    tournamentRecords,
    skippedResults,
    resultValues,
    allMatchUps,
    fileResults
  };
}
