export function getMaxPositionWithValues({ columnProfiles, positionColumn, analysis }) {
  const roundColumns = analysis.columns.round || [];

  const positionProfile = columnProfiles.find(({ column }) => column === positionColumn);
  const positionRows = positionProfile?.rows || [];

  // valuesColumns are participantDetail columns... some providers do not have them.
  const valuesColumns = columnProfiles.filter(
    ({ column, character }) => column !== positionColumn && !roundColumns.includes(column) && character !== 'result'
  );
  const maxValueRow = Math.max(...valuesColumns.flatMap(({ rows }) => rows), 0);
  const maxPositionRow = Math.max(...positionRows.filter((row) => !maxValueRow || row <= maxValueRow));
  const valuesCount = valuesColumns.flatMap((c) => c.values).length;
  const rows = columnProfiles.flatMap((c) => c.rows);
  const valuesPerRow = valuesCount / rows.length;
  const index = positionRows.indexOf(maxPositionRow);
  const maxPositionWithValues = positionProfile?.values[index];
  const maxPosition = Math.max(...(positionProfile?.values || []));

  return { maxPosition, maxPositionWithValues, maxValueRow, positionProfile, maxPositionRow, valuesPerRow };
}
