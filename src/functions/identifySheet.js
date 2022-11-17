import { findRow } from './sheetAccess';

export function identifySheet({ sheet, profile }) {
  const sheetDefinitions = profile.sheetDefinitions;
  const rowDefinitions = profile.rowDefinitions;
  const rowIds = rowDefinitions
    .reduce((rowIds, rowDefinition) => {
      const row = findRow({ sheet, rowDefinition });
      return row ? rowIds.concat(rowDefinition.id) : rowIds;
    }, [])
    .filter(Boolean);
  const identifiedDefinition = sheetDefinitions.reduce((sheetDefinition, currentDefinition) => {
    const exactMatch = currentDefinition.rowIds.reduce((result, rowId) => rowIds.includes(rowId) && result, true);
    return exactMatch ? currentDefinition : sheetDefinition;
  }, undefined);
  return identifiedDefinition;
}
