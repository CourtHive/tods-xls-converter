import { processRoundRobin } from './processRoundRobin';
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

export function processSheets() {
  const { workbook, workbookType } = getWorkbook();
  if (!workbook) return { error: MISSING_WORKBOOK };
  if (!workbookType) return { error: UNKNOWN_WORKBOOK_TYPE };

  const { profile } = workbookType;
  for (const sheetName of workbook.SheetNames) {
    processSheet(workbook, profile, sheetName);
  }

  return { ...SUCCESS };
}

export function processSheet(workbook, profile, sheetName) {
  const sheet = workbook.Sheets[sheetName];

  const sheetDefinition = identifySheet({ sheetName, sheet, profile });

  if (!sheetDefinition) {
    return { error: MISSING_SHEET_DEFINITION };
  } else if (sheetDefinition.type === KNOCKOUT) {
    return processKnockOut({
      sheetDefinition,
      sheetName,
      profile,
      sheet
    });
  } else if (sheetDefinition.type === ROUND_ROBIN) {
    return processRoundRobin({
      sheetDefinition,
      sheetName,
      profile,
      sheet
    });
  } else if (sheetDefinition.type === PARTICIPANTS) {
    //
  } else if (sheetDefinition.type === INFORMATION) {
    return extractInfo({
      infoClass: 'tournamentInfo',
      profile,
      sheet
    });
  } else {
    return { info: UNKNOWN_SHEET_TYPE };
  }
}
