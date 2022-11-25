import { processIndeterminate } from './processIndeterminate';
import { processRoundRobin } from './processRoundRobin';
import { pushGlobalLog } from '../utilities/globalLog';
import { getSheetAnalysis } from './getSheetAnalysis';
import { processKnockOut } from './processKnockout';
import { identifySheet } from './identifySheet';
import { getWorkbook } from '../global/state';
import { extractInfo } from './extractInfo';

import { INFORMATION, PARTICIPANTS, KNOCKOUT, ROUND_ROBIN, INDETERMINATE } from '../constants/sheetTypes';
import { SUCCESS } from '../constants/resultConstants';
import {
  MISSING_SHEET_DEFINITION,
  MISSING_WORKBOOK,
  UNKNOWN_SHEET_TYPE,
  UNKNOWN_WORKBOOK_TYPE
} from '../constants/errorConditions';

export function processSheets({ sheetLimit, sheetNumbers = [], filename, sheetTypes } = {}) {
  const { workbook, workbookType } = getWorkbook();

  if (!workbook) return { error: MISSING_WORKBOOK };
  if (!workbookType) return { error: UNKNOWN_WORKBOOK_TYPE };

  const { profile } = workbookType;

  const sheetCount = workbook.SheetNames.length;
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
  const structures = [];
  const errorLog = {};
  let sheetNumber = 0;

  for (const sheetName of workbook.SheetNames) {
    sheetNumber += 1;
    if (sheetLimit && sheetNumber > sheetLimit) break;
    if (sheetNumbers?.length && !sheetNumbers.includes(sheetNumber)) continue;

    console.log({ sheetName, sheetNumber });

    const {
      participants: structureParticipants,
      structures: sheetStructures,
      hasValues,
      analysis,
      skipped,
      error
    } = processSheet({
      sheetNumber,
      sheetTypes,
      sheetName,
      filename,
      workbook,
      profile
    });

    sheetAnalysis[sheetNumber] = { sheetName, hasValues, analysis };

    Object.assign(participants, structureParticipants);

    if (!skipped) {
      if (sheetStructures) structures.push(...sheetStructures);
    }

    if (error) {
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

  return { sheetAnalysis, errorLog, resultValues, skippedResults, structures, participants, ...SUCCESS };
}

export function processSheet({ workbook, profile, sheetName, sheetNumber, filename, sheetTypes = [] }) {
  const sheet = workbook.Sheets[sheetName];

  const { hasValues, sheetDefinition } = identifySheet({ sheetName, sheet, profile });

  const sheetType = sheetDefinition?.type;
  const skipped = sheetTypes.length && sheetType && !sheetTypes.includes(sheetType);
  if (!hasValues || skipped) return { analysis: { skipped }, sheetType, hasValues, ...SUCCESS };

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
    //
  } else if (sheetDefinition.type === PARTICIPANTS) {
    //
  } else if (sheetDefinition.type === INFORMATION) {
    //
  } else {
    return { info: UNKNOWN_SHEET_TYPE };
  }
}
