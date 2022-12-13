import { getLoggingActive, getWorkbook } from '../global/state';
import { processIndeterminate } from './processIndeterminate';
import { tournamentEngine } from 'tods-competition-factory';
import { processRoundRobin } from './processRoundRobin';
import { pushGlobalLog } from '../utilities/globalLog';
import { getSheetAnalysis } from './getSheetAnalysis';
import { processKnockOut } from './processKnockout';
import { identifySheet } from './identifySheet';
import { extractInfo } from './extractInfo';

import { INFORMATION, PARTICIPANTS, KNOCKOUT, ROUND_ROBIN, INDETERMINATE } from '../constants/sheetTypes';
import { SUCCESS } from '../constants/resultConstants';
import {
  MISSING_SHEET_DEFINITION,
  MISSING_WORKBOOK,
  UNKNOWN_SHEET_TYPE,
  UNKNOWN_WORKBOOK_TYPE
} from '../constants/errorConditions';

const invalidNames = [];
const invalidResults = ['RET X LES'];

export function processSheets({ sheetLimit, sheetNumbers = [], filename, sheetTypes, processStructures } = {}) {
  const { workbook, workbookType } = getWorkbook();
  const logging = getLoggingActive('dev');

  if (!workbook) return { error: MISSING_WORKBOOK };
  const sheetCount = workbook.SheetNames.length;

  if (!workbookType) {
    pushGlobalLog({
      keyColors: { filename: 'brightgreen', sheetCount: 'brightgreen' },
      divider: 80,
      sheetCount,
      filename
    });
    return { error: UNKNOWN_WORKBOOK_TYPE };
  }

  const { profile } = workbookType;

  if (profile?.fileDateParser) {
    const dateString = profile.fileDateParser(filename);
    tournamentEngine.setTournamentDates({ startDate: dateString, endDate: dateString });
  }

  pushGlobalLog({
    keyColors: { filename: 'brightgreen', sheetCount: 'brightgreen' },
    divider: 80,
    sheetCount,
    filename
  });

  const skippedResults = [];
  const sheetAnalysis = {};
  const participants = {};
  const resultValues = [];
  const errorLog = {};

  let totalMatchUps = 0;
  let sheetNumber = 0;

  for (const sheetName of workbook.SheetNames) {
    sheetNumber += 1;
    if (sheetLimit && sheetNumber > sheetLimit) break;
    if (sheetNumbers?.length && !sheetNumbers.includes(sheetNumber)) continue;

    if (getLoggingActive('sheetNames')) console.log({ sheetName, sheetNumber });

    const result = processSheet({
      processStructures,
      sheetNumber,
      sheetTypes,
      sheetName,
      filename,
      workbook,
      profile
    });

    const { participants: structureParticipants, structures = [], entries, hasValues, analysis, error } = result;

    const invalidParticipant = structureParticipants?.find(({ participantName }) =>
      invalidNames.includes(participantName)
    );
    if (invalidParticipant)
      console.log({ sheetName, filename }, invalidParticipant?.individualParticipants || invalidParticipant);

    const structureMatchUps = structures?.flatMap(
      (structure) => structure?.matchUps || structure?.structures?.flatMap(({ matchUps }) => matchUps)
    );

    const invalidResult = structureMatchUps.filter(({ result }) => invalidResults.includes(result));
    if (getLoggingActive('invalidResult')) console.log({ filename, sheetName, invalidResult });

    const matchUpsCount = structureMatchUps?.length;
    const twoDrawPositionsCount = structureMatchUps?.filter(({ drawPositions }) => drawPositions?.length === 2).length;
    const winningSideCount = structureMatchUps?.filter(({ winningSide }) => winningSide).length;

    totalMatchUps += matchUpsCount || 0;

    sheetAnalysis[sheetNumber] = { sheetName, hasValues, analysis, structures, entries };

    if (structureParticipants?.length) {
      Object.assign(
        participants,
        ...structureParticipants.map((participant) => ({ [participant.participantId]: participant }))
      );
    }

    if (analysis && (!analysis?.skipped || !hasValues)) {
      const { isQualifying, category, sheetType } = analysis;
      const { gender, matchUpType } = analysis?.info || {};
      if (logging) {
        console.log({
          sheetName,
          sheetNumber,
          sheetType,
          isQualifying,
          category,
          matchUpType,
          gender,
          matchUpsCount,
          twoDrawPositionsCount,
          winningSideCount
        });
      }
    }

    if (error) {
      if (logging) console.log({ error });
      pushGlobalLog({ method: 'error', color: 'brightred', error, keyColors: { error: 'red' } });
      if (!errorLog[error]) {
        errorLog[error] = [sheetName];
      } else {
        errorLog[error].push(sheetName);
      }
    } else {
      const method = `processSheet ${sheetNumber}`;
      pushGlobalLog(
        {
          method,
          keyColors: { sheetName: 'brightcyan', type: 'brightmagenta' },
          type: analysis?.sheetType,
          sheetName,
          matchUpsCount
        },
        undefined,
        method
      );
    }

    if (analysis?.potentialResultValues) resultValues.push(...analysis.potentialResultValues);
    if (analysis?.skippedResults) skippedResults.push(...Object.keys(analysis.skippedResults));
  }

  pushGlobalLog({
    keyColors: { totalMatchUps: 'brightyellow', attributes: 'brightgreen' },
    totalMatchUps
  });

  return { sheetAnalysis, errorLog, resultValues, skippedResults, participants, totalMatchUps, ...SUCCESS };
}

export function processSheet({
  processStructures,
  sheetTypes = [],
  sheetNumber,
  sheetName,
  filename,
  workbook,
  profile
}) {
  const sheet = workbook.Sheets[sheetName];

  const { hasValues, sheetDefinition } = identifySheet({ sheetName, sheet, profile });

  const sheetType = sheetDefinition?.type;
  const skipped = sheetTypes.length && sheetType && !sheetTypes.includes(sheetType);
  if (!hasValues || skipped) {
    return { analysis: { skipped }, sheetType, hasValues, ...SUCCESS };
  }

  if (sheetDefinition) {
    const method = `processSheet ${sheetNumber}`;
    pushGlobalLog({
      method,
      keyColors: { sheetName: 'brightcyan', type: 'brightmagenta' },
      type: sheetType,
      sheetName
    });
  } else {
    return { error: MISSING_SHEET_DEFINITION };
  }

  const { cellRefs, info } = extractInfo({ profile, sheet, infoClass: sheetDefinition.infoClass });

  const props = {
    sheetDefinition,
    sheetNumber,
    sheetName,
    sheetType,
    filename,
    profile,
    sheet,
    info
  };

  const analysis = getSheetAnalysis({
    ignoreCellRefs: cellRefs,
    ...props
  });

  if (!processStructures) {
    return {
      analysis
    };
  }

  if (sheetDefinition.type === KNOCKOUT) {
    return processKnockOut({
      analysis,
      ...props
    });
  } else if (sheetDefinition.type === ROUND_ROBIN) {
    return processRoundRobin({
      analysis,
      ...props
    });
  } else if (sheetDefinition.type === INDETERMINATE) {
    return processIndeterminate({
      analysis,
      ...props
    });
  } else if (sheetDefinition.type === PARTICIPANTS) {
    return { analysis };
  } else if (sheetDefinition.type === INFORMATION) {
    return { analysis };
  } else {
    return { info: UNKNOWN_SHEET_TYPE };
  }
}
