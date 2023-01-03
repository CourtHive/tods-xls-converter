import { workbookTypes } from '../config/workbookTypes';
import { isString } from '../utilities/identification';
import { tidyLower } from '../utilities/convenience';

import { MISSING_WORKBOOK } from '../constants/errorConditions';
import { SUCCESS } from '../constants/resultConstants';

export function identifyWorkbook(workbook) {
  if (!workbook) return { error: MISSING_WORKBOOK };

  const { Strings, SheetNames } = workbook;

  let workbookType = workbookTypes.find((currentType) => {
    const { identifiers: typeIdentifiers } = currentType;
    const identifiers = typeIdentifiers?.map((identifier) => {
      const obj = typeof identifier === 'object' ? { ...identifier, text: identifier.text?.toLowerCase() } : identifier;
      return isString(identifier) ? identifier.toLowerCase() : obj;
    });

    if (Strings && identifiers) {
      // BEST: search all cells in a workbook for a unique identifying string
      const containsIdentifier = Strings.some((str) => {
        const value = typeof str?.t === 'string' ? str.t.toLowerCase() : str.t;
        return identifiers.some((identifier) => {
          if (typeof identifier === 'object') {
            const { text, ...options } = identifier;
            if (options.startsWith) {
              return value?.startsWith(text);
            } else if (options.splitIncludes) {
              return value
                ?.toString()
                .split(' ')
                .some((part) => tidyLower(part) === tidyLower(text));
            } else if (options.includes) {
              return value?.includes(text);
            } else if (options.endsWith) {
              return value?.endsWith(text);
            } else if (text === value) {
              return true;
            }
          } else {
            return identifier === value;
          }
        });
      });
      if (containsIdentifier) return true;
    }
  });

  if (workbookType) return { workbookType, ...SUCCESS };

  workbookType = workbookTypes.find((currentType) => {
    const { mustContainSheetNames } = currentType;

    if (mustContainSheetNames) {
      // OK: search all SheetNames in a workbook for required list of SheetNames
      const containsRequiredSheets = mustContainSheetNames.some((sheetName) => SheetNames.includes(sheetName));
      if (containsRequiredSheets) return true;
    }
  });

  if (workbookType) return { workbookType, ...SUCCESS };

  workbookType = workbookTypes.find((currentType) => {
    const { sheetNameMatcher } = currentType;

    // OK: use a custom method for matching SheetNames
    const matchesFound = sheetNameMatcher && sheetNameMatcher(SheetNames);
    return matchesFound;
  });

  return { workbookType, ...SUCCESS };
}
