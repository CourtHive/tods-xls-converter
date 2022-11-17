// function confirms that header columns are in expected position

import { findValueRefs, getCol, getRow } from './sheetAccess';

// and adjusts when possible...
export function getHeaderColumns({ sheet, profile, headerRow }) {
  const columnsMap = Object.assign({}, profile.columnsMap);
  if (profile.headerColumns) {
    profile.headerColumns.forEach((obj) => {
      const searchText = obj.header;
      const ref = findValueRefs(searchText, sheet).reduce(
        (p, c) => (getRow(c) === parseInt(headerRow) ? c : p),
        undefined
      );
      const col = ref && getCol(ref);
      if (col) columnsMap[obj.attr] = col;
    });
  }
  return columnsMap;
}
