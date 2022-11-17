import { workbookTypes } from '../config/workbookTypes';

import { MISSING_WORKBOOK } from '../constants/errorConditions';
import { SUCCESS } from '../constants/resultConstants';

export function identifyWorkbook(workbook) {
  if (!workbook) return { error: MISSING_WORKBOOK };

  const sheetNames = workbook.SheetNames;
  const workbookType = workbookTypes.reduce((type, currentType) => {
    const containsRequiredSheets = currentType.mustContainSheetNames.some((sheetName) =>
      sheetNames.includes(sheetName)
    );

    const sheetNameMatcher = currentType.sheetNameMatcher;
    const matchesFound = sheetNameMatcher && sheetNameMatcher(sheetNames);
    return containsRequiredSheets || matchesFound ? currentType : type;
  }, undefined);

  return { workbookType, ...SUCCESS };
}
