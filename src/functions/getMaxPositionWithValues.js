export function getMaxPositionWithValues({ columnProfiles, positionColumn, analysis }) {
  const roundColumns = analysis.columns.round || [];

  const positionProfile = columnProfiles.find(({ column }) => column === positionColumn);
  const valuesColumns = columnProfiles.filter(
    ({ column }) => column !== positionColumn && !roundColumns.includes(column)
  );
  const maxValueRow = Math.max(...valuesColumns.flatMap(({ rows }) => rows));
  const maxPositionRow = Math.max(...positionProfile.rows.filter((row) => row <= maxValueRow));
  const index = positionProfile.rows.indexOf(maxPositionRow);
  const maxPositionWithValues = positionProfile.values[index];
  const maxPosition = Math.max(...positionProfile.values);

  return { maxPosition, maxPositionWithValues, maxValueRow, positionProfile, maxPositionRow };
}
