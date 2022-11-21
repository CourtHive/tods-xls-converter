import { workbookTypes } from '../config/workbookTypes';

import { MISSING_WORKBOOK } from '../constants/errorConditions';
import { SUCCESS } from '../constants/resultConstants';

export function identifyWorkbook(workbook) {
  if (!workbook) return { error: MISSING_WORKBOOK };

  const { Strings, SheetNames } = workbook;

  const workbookType = workbookTypes.find((currentType) => {
    const { identifyingStrings, mustContainSheetNames, sheetNameMatcher } = currentType;

    if (identifyingStrings) {
      // BEST: search all cells in a workbook for a unique identifying string
      const containsIdentifyingString = Strings.some((str) =>
        identifyingStrings.some((identifier) => str?.t?.startsWith(identifier))
      );
      if (containsIdentifyingString) return true;
    }

    if (mustContainSheetNames) {
      // OK: search all SheetNames in a workbook for required list of SheetNames
      const containsRequiredSheets = mustContainSheetNames.some((sheetName) => SheetNames.includes(sheetName));
      if (containsRequiredSheets) return true;
    }

    // OK: use a custom method for matching SheetNames
    const matchesFound = sheetNameMatcher && sheetNameMatcher(SheetNames);
    return matchesFound;
  });

  return { workbookType, ...SUCCESS };
}
