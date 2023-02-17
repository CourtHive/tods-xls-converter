import { getLoggingActive, getWorkbook } from '../global/state';
import { participantConstants } from 'tods-competition-factory';
import { processIndeterminate } from './processIndeterminate';
import { processElimination } from './processElimination';
import { processRoundRobin } from './processRoundRobin';
import { pushGlobalLog } from '../utilities/globalLog';
import { getSheetAnalysis } from './getSheetAnalysis';
import { identifySheet } from './identifySheet';
import { extractInfo } from './extractInfo';

import { KNOCKOUT, ROUND_ROBIN, INDETERMINATE } from '../constants/sheetTypes';
import { SUCCESS } from '../constants/resultConstants';
import {
  MISSING_SHEET_DEFINITION,
  MISSING_WORKBOOK,
  NO_RESULTS_FOUND,
  UNKNOWN_WORKBOOK_TYPE
} from '../constants/errorConditions';

const { PAIR } = participantConstants;

export function processSheets({ fileName, config = {} } = {}) {
  const { sheetLimit, sheetNumbers = [] } = config;
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
  const warningLog = {};
  const errorLog = {};

  let totalMatchUps = 0;
  let sheetNumber = 0;

  for (const sheetName of workbook.SheetNames) {
    sheetNumber += 1;
    if (sheetLimit && sheetNumber > sheetLimit) break;
    if (sheetNumbers?.length && !sheetNumbers.includes(sheetNumber)) continue;

    if (getLoggingActive('sheetNames')) console.log({ sheetName, sheetNumber });

    const result = processSheet({
      sheetNumber,
      sheetName,
      fileName,
      workbook,
      config,
      profile
    });

    const {
      participants: structureParticipants,
      ignoredQualifyingMatchUpIds = [],
      structures = [],
      hasValues,
      analysis,
      warnings = [],
      context,
      entries,
      error
    } = result;
    const drawSize = structures?.[structures.length - 1]?.positionAssignments?.length;

    const participantTypes = structureParticipants?.reduce((types, participant) => {
      const participantType = participant.participantType;
      if (!types.includes(participantType)) types.push(participantType);
      return types;
    }, []);

    const isDoubles = participantTypes?.includes(PAIR);

    const structureMatchUps = structures?.flatMap(
      (structure) => structure?.matchUps || structure?.structures?.flatMap(({ matchUps }) => matchUps)
    );

    const scoresCount = structureMatchUps.map(({ score }) => score?.scoreStringSide1).filter(Boolean).length;
    if (structureMatchUps.length && !scoresCount) {
      const message = NO_RESULTS_FOUND;
      warnings.push(message);
      pushGlobalLog({
        keyColors: { message: 'yellow', attributes: 'brightyellow' },
        method: 'warning',
        color: 'yellow',
        message
      });
    }

    const matchUpsCount = (structureMatchUps?.length || 0) - (ignoredQualifyingMatchUpIds.length || 0);
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

    if (warnings?.length) {
      warnings.forEach((warning) => {
        if (logging) console.log({ warning });
        pushGlobalLog({ method: 'warning', color: 'yellow', warning, keyColors: { warning: 'brightyellow' } });
        if (!warningLog[warning]) {
          warningLog[warning] = [sheetName];
        } else {
          warningLog[warning].push(sheetName);
        }
      });
    }
    if (error) {
      if (logging) console.log({ error });
      pushGlobalLog({ method: 'error', color: 'brightred', error, keyColors: { error: 'brightred' }, ...context });
      if (!errorLog[error]) {
        errorLog[error] = [sheetName];
      } else {
        errorLog[error].push(sheetName);
      }
    } else {
      const method = `processSheet ${sheetNumber}`;
      const leader = {
        method,
        keyColors: {
          sheetName: 'brightcyan',
          type: 'brightmagenta',
          matchUpsCount: 'brightgreen',
          drawSize: 'brightgreen',
          format: 'brightmagenta'
        }
      };
      const format = (isDoubles && 'D') || participantTypes ? 'S' : undefined;
      const attrs = format
        ? {
            ...leader,
            type: analysis?.sheetType,
            format,
            sheetName,
            matchUpsCount,
            drawSize
          }
        : {
            ...leader,
            type: analysis?.sheetType,
            sheetName
          };

      pushGlobalLog(attrs, undefined, method);
    }

    if (analysis?.potentialResultValues) resultValues.push(...analysis.potentialResultValues);
    if (analysis?.skippedResults) skippedResults.push(...Object.keys(analysis.skippedResults));
  }

  pushGlobalLog({
    keyColors: { totalMatchUps: 'brightyellow', attributes: 'brightgreen' },
    totalMatchUps
  });

  return { sheetAnalysis, errorLog, warningLog, resultValues, skippedResults, participants, totalMatchUps, ...SUCCESS };
}

export function processSheet({ sheetNumber, sheetName, fileName, workbook, config, profile }) {
  const sheet = workbook.Sheets[sheetName];
  const { sheetTypes = [], processStructures } = config;

  const { hasValues, sheetDefinition } = identifySheet({ sheetName, sheet, profile });

  const sheetType = sheetDefinition?.type || 'UNKNOWN';
  const skipped = sheetTypes.length && sheetType && !sheetTypes.includes(sheetType);
  if (!hasValues?.length || skipped) {
    return { analysis: { skipped }, sheetType, hasValues, ...SUCCESS };
  }

  const method = `processSheet ${sheetNumber}`;
  pushGlobalLog({
    method,
    keyColors: { sheetName: 'brightcyan', type: 'brightmagenta' },
    type: sheetType,
    sheetName
  });
  if (!sheetDefinition) {
    return { warnings: [MISSING_SHEET_DEFINITION] };
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
      config,
      ...props
    });
  } else if (sheetDefinition.type === ROUND_ROBIN) {
    return processRoundRobin({
      analysis,
      config,
      ...props
    });
  } else if (sheetDefinition.type === INDETERMINATE) {
    return processIndeterminate({
      analysis,
      config,
      ...props
    });
  } else {
    return { analysis };
  }
}
