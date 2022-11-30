import { processIndeterminate } from './processIndeterminate';
import { processRoundRobin } from './processRoundRobin';
import { pushGlobalLog } from '../utilities/globalLog';
import { getSheetAnalysis } from './getSheetAnalysis';
import { processKnockOut } from './processKnockout';
import { identifySheet } from './identifySheet';
import { getLoggingActive, getWorkbook } from '../global/state';
import { extractInfo } from './extractInfo';

import { INFORMATION, PARTICIPANTS, KNOCKOUT, ROUND_ROBIN, INDETERMINATE } from '../constants/sheetTypes';
import { SUCCESS } from '../constants/resultConstants';
import {
  MISSING_SHEET_DEFINITION,
  MISSING_WORKBOOK,
  UNKNOWN_SHEET_TYPE,
  UNKNOWN_WORKBOOK_TYPE
} from '../constants/errorConditions';

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

    const { participants: structureParticipants, structures = [], hasValues, analysis, error } = result;

    const matchUpsCount = structures?.flatMap(
      (structure) => structure?.matchUps || structure?.structures?.flatMap(({ matchUps }) => matchUps)
    )?.length;
    totalMatchUps += matchUpsCount || 0;

    sheetAnalysis[sheetNumber] = { sheetName, hasValues, analysis, structures };

    Object.assign(participants, structureParticipants);

    if (analysis && (!analysis?.skipped || !hasValues)) {
      const { isQualifying, category, sheetType } = analysis;
      const { gender, matchUpType } = analysis?.info || {};
      if (logging) {
        console.log({ sheetName, sheetNumber, sheetType, isQualifying, category, matchUpType, gender, matchUpsCount });
      }
    }

    if (error) {
      if (logging) console.log({ error });
      const method = `processSheet ${sheetNumber}`;
      pushGlobalLog({ method, sheetName, error, keyColors: { error: 'brightred' } });
      if (!errorLog[error]) {
        errorLog[error] = [sheetName];
      } else {
        errorLog[error].push(sheetName);
      }
    }

    if (analysis?.potentialResultValues) resultValues.push(...analysis.potentialResultValues);
    if (analysis?.skippedResults) skippedResults.push(...Object.keys(analysis.skippedResults));
  }

  pushGlobalLog({
    keyColors: { totalMatchUps: 'brightyellow', attributes: 'brightgreen' },
    totalMatchUps
  });

  /*
    if (analysis?.tournamentDetails) {
      // this should consider info.tournamentName, info.director if consistent across sheets
      const { tournamentId } = generateTournamentId({ attributes: [analysis.tournamentDetails] });
      console.log({ tournamentId });
    }
  */

  // TODO: combine structures into drawDefinitions/events
  // *. requires category which can be parsed from sheetNames or sheet info

  // Now group structures by category and singles/doubles and generate events/drawDefinitions

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
      type: sheetDefinition.type,
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
