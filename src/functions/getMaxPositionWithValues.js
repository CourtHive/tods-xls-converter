export function getMaxPositionWithValues({ columnProfiles, positionColumn, analysis }) {
  const roundColumns = analysis.columns.round || [];

  const positionProfile = columnProfiles.find(({ column }) => column === positionColumn);
  const valuesColumns = columnProfiles.filter(
    ({ column, character }) => column !== positionColumn && !roundColumns.includes(column) && character !== 'result'
  );
  const maxValueRow = Math.max(...valuesColumns.flatMap(({ rows }) => rows));
  const positionRows = positionProfile?.rows || [];
  const maxPositionRow = Math.max(...positionRows.filter((row) => row <= maxValueRow));
  const index = positionRows.indexOf(maxPositionRow);
  const maxPositionWithValues = positionProfile?.values[index];
  const maxPosition = Math.max(...(positionProfile?.values || []));

  return { maxPosition, maxPositionWithValues, maxValueRow, positionProfile, maxPositionRow };
}
