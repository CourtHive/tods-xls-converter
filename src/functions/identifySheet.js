import { findRow, getCellValue } from './sheetAccess';

import { SUCCESS } from '../constants/resultConstants';
import { BLANK } from '../constants/sheetTypes';

const excludeValues = ['undefined'];

export function identifySheet({ sheet, sheetName, profile }) {
  const hasValues = Object.keys(sheet)
    .map((ref) => {
      const value = getCellValue(sheet[ref]);
      const consideredValue = !excludeValues.includes(value) && value;
      return consideredValue;
    })
    .filter(Boolean);

  if (!hasValues?.length) {
    return { hasValues };
  } else if (hasValues.length < 6) {
    return { sheetDefinition: { type: BLANK, rowIds: [] }, hasValues };
  }

  // profile.sheetDefinitions should be ordered such that least certain matches occur last
  const sheetDefinitions = profile.sheetDefinitions;

  const lowerSheetName = sheetName.toLowerCase();
  const sheetNameMatch = sheetDefinitions.find((definition) =>
    definition.sheetNames?.some((name) => lowerSheetName?.includes(name))
  );

  const rowDefinitions = profile.rowDefinitions;
  const rowIds = rowDefinitions
    .reduce((rowIds, rowDefinition) => {
      const row = findRow({ sheet, rowDefinition });
      return row ? rowIds.concat(rowDefinition.id) : rowIds;
    }, [])
    .filter(Boolean);

  const identifiedDefinition =
    sheetNameMatch ||
    sheetDefinitions.find((currentDefinition) => {
      const exactMatch = currentDefinition.rowIds.reduce((result, rowId) => rowIds.includes(rowId) && result, true);
      return exactMatch;
    });

  return { sheetDefinition: identifiedDefinition, hasValues, ...SUCCESS };
}
