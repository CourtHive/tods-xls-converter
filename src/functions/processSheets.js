import { processRoundRobin } from './processRoundRobin';
import { pushGlobalLog } from '../utilities/globalLog';
import { getSheetAnalysis } from './getSheetAnalysis';
import { processKnockOut } from './processKnockout';
import { identifySheet } from './identifySheet';
import { extractInfo } from './extractInfo';
import { getWorkbook } from '..';

import { INFORMATION, PARTICIPANTS, KNOCKOUT, ROUND_ROBIN } from '../constants/sheetTypes';
import { SUCCESS } from '../constants/resultConstants';
import {
  MISSING_SHEET_DEFINITION,
  MISSING_WORKBOOK,
  UNKNOWN_SHEET_TYPE,
  UNKNOWN_WORKBOOK_TYPE
} from '../constants/errorConditions';

export function processSheets({ sheetLimit, sheetNumbers = [] } = {}) {
  const { workbook, workbookType } = getWorkbook();
  if (!workbook) return { error: MISSING_WORKBOOK };
  if (!workbookType) return { error: UNKNOWN_WORKBOOK_TYPE };

  const { profile } = workbookType;

  const scoreValues = [];
  let sheetNumber = 0;

  for (const sheetName of workbook.SheetNames) {
    sheetNumber += 1;
    if (sheetLimit && sheetNumber > sheetLimit) break;

    if (sheetNumbers?.length && !sheetNumbers.includes(sheetNumber)) continue;
    const result = processSheet(workbook, profile, sheetName);
    if (result.error) {
      pushGlobalLog({ method: 'processSheet', sheetName, error: result.error });
    }

    const { analysis } = result;
    scoreValues.push(...analysis.potentialScoreValues);

    const { headerRow, footerRow } = analysis;
    console.log({ headerRow, footerRow });
    console.log(
      analysis.multiColumnValues,
      analysis.valuesMap,
      analysis.rowGroupings
      // analysis.columnProfiles.map((v) => v.values)
      // analysis.columnProfiles
      // analysis.columns,
      // analysis.attributeMap
    );
  }

  return { scoreValues, ...SUCCESS };
}

export function processSheet(workbook, profile, sheetName) {
  const sheet = workbook.Sheets[sheetName];

  const sheetDefinition = identifySheet({ sheetName, sheet, profile });

  if (sheetDefinition) {
    pushGlobalLog({
      method: 'processSheet',
      sheetName,
      type: sheetDefinition.type,
      keyColors: { sheetName: 'brightcyan', type: 'brightmagenta' }
    });
  } else {
    return { error: MISSING_SHEET_DEFINITION };
  }

  const { cellRefs, info } = extractInfo({ profile, sheet, infoClass: sheetDefinition.infoClass });

  const analysis = getSheetAnalysis({
    ignoreCellRefs: cellRefs,
    sheetDefinition,
    profile,
    sheet,
    info
  });

  if (sheetDefinition.type === KNOCKOUT) {
    return processKnockOut({
      sheetDefinition,
      sheetName,
      analysis,
      profile,
      sheet,
      info
    });
  } else if (sheetDefinition.type === ROUND_ROBIN) {
    return processRoundRobin({
      sheetDefinition,
      sheetName,
      analysis,
      profile,
      sheet,
      info
    });
  } else if (sheetDefinition.type === PARTICIPANTS) {
    //
  } else if (sheetDefinition.type === INFORMATION) {
    //
  } else {
    return { info: UNKNOWN_SHEET_TYPE };
  }
}
