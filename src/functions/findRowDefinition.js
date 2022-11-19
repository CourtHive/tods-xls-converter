export function findRowDefinition({ rowDefinitions, rowIds, type }) {
  return rowDefinitions.reduce((definition, currentDefinition) => {
    if (currentDefinition.type !== type) return definition;
    if (!rowIds.includes(currentDefinition.id)) return definition;
    return currentDefinition;
  }, undefined);
}
