import { getLoggingActive, getWorkbook } from '../global/state';
import { participantConstants } from 'tods-competition-factory';
import { processIndeterminate } from './processIndeterminate';
import { processElimination } from './processElimination';
import { processRoundRobin } from './processRoundRobin';
import { pushGlobalLog } from '../utilities/globalLog';
import { getSheetAnalysis } from './getSheetAnalysis';
import { identifySheet } from './identifySheet';
import { extractInfo } from './extractInfo';

import { MISSING_SHEET_DEFINITION, MISSING_WORKBOOK, UNKNOWN_WORKBOOK_TYPE } from '../constants/errorConditions';
import { KNOCKOUT, ROUND_ROBIN, INDETERMINATE } from '../constants/sheetTypes';
import { SUCCESS } from '../constants/resultConstants';

const { PAIR } = participantConstants;

const invalidResults = ['76(3) 67(5) 60'];
const invalidNames = [];

export function processSheets({ sheetLimit, sheetNumbers = [], fileName, sheetTypes, processStructures } = {}) {
  const { workbook, workbookType } = getWorkbook();
  const logging = getLoggingActive('dev');

  if (!workbook) return { error: MISSING_WORKBOOK };
  const sheetCount = workbook.SheetNames.length;

  if (!workbookType) {
    pushGlobalLog({
      keyColors: { fileName: 'brightgreen', sheetCount: 'brightgreen' },
      divider: 80,
      sheetCount,
      fileName: fileName.slice(0, 40)
    });
    return { error: UNKNOWN_WORKBOOK_TYPE };
  }

  const { profile } = workbookType;

  pushGlobalLog({
    keyColors: { fileName: 'brightgreen', sheetCount: 'brightgreen' },
    divider: 80,
    sheetCount,
    fileName: fileName.slice(0, 40)
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
      fileName,
      workbook,
      profile
    });

    const {
      participants: structureParticipants,
      structures = [],
      entries,
      hasValues,
      analysis,
      warning,
      error
    } = result;

    const invalidParticipant = structureParticipants?.find(({ participantName }) =>
      invalidNames.includes(participantName)
    );

    const participantTypes = structureParticipants.reduce((types, participant) => {
      const participantType = participant.participantType;
      if (!types.includes(participantType)) types.push(participantType);
      return types;
    }, []);

    const isDoubles = participantTypes.includes(PAIR);

    if (invalidParticipant)
      console.log({ sheetName, fileName }, invalidParticipant?.individualParticipants || invalidParticipant);

    const structureMatchUps = structures?.flatMap(
      (structure) => structure?.matchUps || structure?.structures?.flatMap(({ matchUps }) => matchUps)
    );

    const invalidResult = structureMatchUps.filter(({ result }) => invalidResults.includes(result));
    if (invalidResult.length && getLoggingActive('invalidResult')) console.log({ fileName, sheetName }, invalidResult);

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
    } else if (warning) {
      if (logging) console.log({ warning });
      pushGlobalLog({ method: 'warning', color: 'yellow', warning, keyColors: { warning: 'yellow' } });
    } else {
      const method = `processSheet ${sheetNumber}`;
      pushGlobalLog(
        {
          method,
          keyColors: {
            sheetName: 'brightcyan',
            type: 'brightmagenta',
            matchUpsCount: 'brightgreen',
            format: 'brightmagenta'
          },
          type: analysis?.sheetType,
          format: isDoubles ? 'D' : 'S',
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
  fileName,
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
    fileName,
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
    return processElimination({
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
  } else {
    return { analysis };
  }
}
