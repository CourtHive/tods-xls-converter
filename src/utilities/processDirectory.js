import { readdirSync, readFileSync, writeFileSync, existsSync, statSync, moveSync } from 'fs-extra';
import { matchUpStatusConstants, tournamentEngine, utilities } from 'tods-competition-factory';
import { generateDrawId, generateEventId, generateTournamentId } from './hashing';
import { getAudit, getLoggingActive, getWorkbook } from '../global/state';
import { getInvalid } from '../functions/scoreParser/scoreParser';
import { processSheets } from '../functions/processSheets';
import { writeTODS08CSV } from './writeTODS08CSV';
import { loadWorkbook } from '../global/loader';
import { pushGlobalLog } from './globalLog';

import { MISSING_ID_COLUMN, NO_RESULTS_FOUND } from '../constants/errorConditions';
const { BYE, WALKOVER, DOUBLE_WALKOVER } = matchUpStatusConstants;

export function processDirectory(config) {
  const {
    writeTournamentRecords = false,
    moveErrorFiles = false,
    writeMatchUps = false,
    writeDir = './',
    readDir = './',
    writeXLSX,

    useFileCreationDate = true,
    tournamentContext = {},
    matchUpContext = {},

    captureProcessedData = true,
    requireProviderIds,
    includeWorkbooks,
    processLimit = 0,
    startIndex = 0
  } = config;

  const isXLS = (fileName) => fileName.toLowerCase().split('.').reverse()[0].startsWith('xls');
  if (!existsSync(readDir)) {
    console.log('no such directory', { readDir });
    return;
  }
  let fileNames = readdirSync(readDir).filter(isXLS).sort();
  const workbookCount = fileNames.length;

  const filesWithSinglePositions = [];
  const logging = getLoggingActive('errorLog');

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
  const warningLog = {};
  const errorLog = {};

  let tournamentRecords = [];
  let sheetsProcessed = 0;
  let totalMatchUps = 0;

  let index = 0;
  for (const fileName of fileNames) {
    if (getLoggingActive('sheetNames') || getLoggingActive('fileNames')) console.log({ fileName, index });

    const filePath = `${readDir}/${fileName}`;
    const buf = readFileSync(filePath);
    const stat = statSync(filePath);

    let result = loadWorkbook(buf, index, config.defaultProvider);
    const { workbookType } = result;
    const additionalContent = includeWorkbooks ? getWorkbook() : {};
    result = processSheets({ fileName, config });

    if (result.sheetAnalysis) {
      const processedSheets = Object.values(result.sheetAnalysis).filter(
        ({ hasValues, analysis }) => hasValues && !analysis?.skipped
      ).length;
      sheetsProcessed += processedSheets;
    }

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
    const participantLog = getLoggingActive('participants');
    if (participantLog) {
      const consideredParticipants = participantLog.participantType
        ? tournamentParticipants.filter(({ participantType }) => participantType === participantLog.participantType)
        : tournamentParticipants;

      if (participantLog.idsOnly) {
        const individualParticipantIds = consideredParticipants.flatMap((p) =>
          p.participantType === 'INDIVIDUAL'
            ? p.person?.personId
            : p.individualParticipants.map((i) => i?.person?.personId)
        );
        console.log({ individualParticipantIds });
      } else {
        console.log(consideredParticipants, { participantsCount: consideredParticipants.length });
      }
    }

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
              endDate: startDate || tournamentInfo.startDate,
              drawDefinitions,
              extensions,
              eventName,
              startDate: startDate || tournamentInfo.startDate,
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
        keyColors: { message: 'yellow', attributes: 'cyan', context: 'brightgreen', filedate: 'brightgreen' },
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
      context: { tournamentName, level: 'REG', identifierType: profile?.identifierType, ...matchUpContext, fileName }
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

    let firstError;
    if (result.errorLog) {
      const errorKeys = Object.keys(result.errorLog) || [];
      firstError = errorKeys.filter((error) => error !== config?.errorType)[0];
      errorKeys.forEach((key) => {
        const sheetNames = result.errorLog[key];
        if (!errorLog[key]) {
          errorLog[key] = [{ fileName, sheetNames }];
        } else {
          errorLog[key].push({ fileName, sheetNames });
        }
      });
    }

    if (result.warningLog) {
      const warningKeys = Object.keys(result.warningLog) || [];
      warningKeys.forEach((key) => {
        const sheetNames = result.warningLog[key];
        if (!warningLog[key]) {
          warningLog[key] = [{ fileName, sheetNames }];
        } else {
          warningLog[key].push({ fileName, sheetNames });
        }
      });
    }

    if (moveErrorFiles) {
      if (firstError) {
        const fileDest = `${readDir}/${firstError}/${fileName}`;
        const result = moveSync(filePath, fileDest);
        if (result) console.log({ fileDest, result });
      } else if (!totalMatchUps) {
        const fileDest = `${readDir}/${NO_RESULTS_FOUND}/${fileName}`;
        const result = moveSync(filePath, fileDest);
        if (result) console.log({ fileDest, result });
      }
    }

    tournamentEngine.getMatchUpDependencies();
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

    const auditLog = getAudit();
    const singlePositions = auditLog.filter(
      (item) => typeof item === 'object' && item.singlePositions && item.fileName === fileName
    );
    if (singlePositions.length) {
      filesWithSinglePositions.push({ fileName, singlePositions });
      // TODO: move file to subDirectory
    }
  }

  const errorKeys = Object.keys(errorLog);
  const totalErrors = errorKeys
    .map((key) => {
      const sheetsCount = errorLog[key].flatMap(({ sheetNames }) => sheetNames?.length || 0).reduce((a, b) => a + b, 0);
      return sheetsCount || errorLog[key].length;
    })
    .reduce((a, b) => a + b, 0);
  const errorsByType = Object.assign({}, ...errorKeys.map((key) => ({ [key]: errorLog[key].length })));

  const warningKeys = Object.keys(warningLog);
  const totalWarnings = warningKeys
    .map((key) => {
      const sheetsCount = warningLog[key]
        .flatMap(({ sheetNames }) => sheetNames?.length || 0)
        .reduce((a, b) => a + b, 0);
      return sheetsCount || warningLog[key].length;
    })
    .reduce((a, b) => a + b, 0);
  const warningsByType = Object.assign({}, ...warningKeys.map((key) => ({ [key]: warningLog[key].length })));

  const filteredMatchUps = [];

  let insufficientDrawPositions = 0;
  let systemGeneratedIDs = 0;
  let noWinningSide = 0;
  let byeMatchUps = 0;
  let walkovers = 0;

  allMatchUps.forEach((matchUp) => {
    const participantIds = matchUp.sides
      ?.flatMap(({ participant }) => participant?.individualParticipants || participant)
      .filter(Boolean)
      .map(({ participantId }) => participantId);
    const allValidParticipantIds = participantIds?.every((pid) => !pid?.startsWith('p-'));

    const { matchUpStatus } = matchUp;

    if (matchUpStatus === BYE) {
      byeMatchUps += 1;
    } else if (matchUpStatus === DOUBLE_WALKOVER) {
      walkovers += 1;
    } else if (!matchUp.winningSide) {
      noWinningSide += 1;
    } else if (matchUp.drawPositions.length !== 2) {
      insufficientDrawPositions += 1;
    } else if (requireProviderIds && !allValidParticipantIds) {
      systemGeneratedIDs += 1;
    } else if (matchUpStatus === WALKOVER) {
      walkovers += 1;
    } else {
      filteredMatchUps.push(matchUp);
    }
  });

  const notExportedCount = byeMatchUps + walkovers + noWinningSide + insufficientDrawPositions + systemGeneratedIDs;

  const invalidScores = getInvalid();
  const report = {
    filesProcessed: fileNames.length,
    sheetsSuccessfullyProcessed: sheetsProcessed,
    insufficientDrawPositions,
    systemGeneratedIDs,
    noWinningSide,
    byeMatchUps,
    walkovers,
    exportedMatchUps: filteredMatchUps.length,
    notExportedCount,
    totalMatchUps,
    invalidScores: invalidScores.length,
    errorTypes: errorKeys.length,
    filesWithErrorsByType: errorsByType,
    totalErrors,
    filesWithWarningsByType: warningsByType,
    totalWarnings
  };
  const auditLog = getAudit();
  const additionalDraws = auditLog.map(({ additionalDraws }) => additionalDraws || 0).reduce((a, b) => a + b, 0);
  if (additionalDraws) report.additionalDraws = additionalDraws;
  const sheetsMissingIdColumn = auditLog.filter(({ type }) => type === MISSING_ID_COLUMN);
  const missingIdColumnMatchUps = sheetsMissingIdColumn
    .map(({ matchUpsCount }) => matchUpsCount)
    .reduce((a, b) => a + b, 0);
  if (sheetsMissingIdColumn.length) {
    report.sheetsMissingIdColumn = sheetsMissingIdColumn.length;
    report.missingIdColumnMatchUps = missingIdColumnMatchUps;
  }
  const unknownColumns = utilities.unique(auditLog.flatMap(({ unmappedColumns }) => unmappedColumns).filter(Boolean));
  if (unknownColumns) {
    report.unknownColumns = unknownColumns;
  }

  if (logging) console.log(report);

  if (writeMatchUps && writeDir) {
    writeTODS08CSV({ matchUps: filteredMatchUps, writeDir, writeXLSX });

    report.timeStamp = new Date().toISOString();
    if (config.errorType) report.errorType = config.errorType;

    const reportFile = `${writeDir}/report.json`;
    const existingReport = existsSync(reportFile) && readFileSync(reportFile, 'UTF-8');
    const existingJSON = existingReport && JSON.parse(existingReport);
    const existingReportValue = existingJSON && (Array.isArray(existingJSON) ? existingJSON : [existingJSON]);
    if (existingReportValue) existingReportValue.push(report);
    const reportValue = existingReportValue || [report];
    const reportString = JSON.stringify(reportValue, null, 2);
    writeFileSync(`${writeDir}/report.json`, reportString, 'UTF-8');
  }

  pushGlobalLog({
    method: 'processingComplete',
    keyColors: { attributes: 'brightgreen' },
    color: 'brightcyan',
    separator: '.',
    newLine: true,
    divider: 80,

    sheetsProcessed,
    totalMatchUps,
    totalErrors
  });

  pushGlobalLog({
    method: 'REPORT',
    keyColors: { attributes: 'brightcyan' },
    color: 'brightyellow',
    separator: ':',
    newLine: true,
    divider: 80,

    filesWithSinglePositions: filesWithSinglePositions.length
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
