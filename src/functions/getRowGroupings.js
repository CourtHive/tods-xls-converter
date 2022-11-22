import { utilities } from 'tods-competition-factory';

export function getRowGroupings({ attributeMap, columnProfiles }) {
  const commonRows = columnProfiles.reduce((commonRows, columnProfile) => {
    const rowsString = columnProfile.rows.join('|');
    if (!commonRows[rowsString]) {
      commonRows[rowsString] = [columnProfile.column];
    } else {
      commonRows[rowsString].push(columnProfile.column);
    }

    return commonRows;
  }, {});

  const rowGroupings = Object.keys(commonRows).map((key) => {
    const columns = commonRows[key];
    const rows = key
      .split('|')
      .sort(utilities.numericSort)
      .map((row) => parseInt(row));
    const attributes = columns.map((column) => attributeMap[column]).filter(Boolean);
    return { columns, attributes, rowCount: rows?.length, rows };
  });

  return { commonRows, rowGroupings };
}
