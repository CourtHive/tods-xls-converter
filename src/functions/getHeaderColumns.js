// function confirms that header columns are in expected position

import { findValueRefs, getCol, getRow } from './sheetAccess';

// and adjusts when possible...
export function getHeaderColumns({ sheet, profile, headerRow, columnValues }) {
  const columnsMap = Object.assign({}, profile.columnsMap);
  if (profile.headerColumns) {
    profile.headerColumns.forEach((obj) => {
      const getRef = (text) => {
        const ref = findValueRefs({ searchDetails: text, sheet, options: { tidy: true } }).reduce(
          (p, c) => (getRow(c) === parseInt(headerRow) ? c : p),
          undefined
        );
        const col = ref && getCol(ref);

        if (col) {
          const re = obj.valueRegex && new RegExp(obj.valueRegex);
          const isValid =
            !re ||
            columnValues[col]?.every((value) => {
              const check = re.test(value);
              return !value || check;
            });

          if (isValid) {
            if (Array.isArray(columnsMap[obj.attr])) {
              columnsMap[obj.attr].push(col);
            } else {
              if (columnsMap[obj.attr]) {
                if (!obj.limit) columnsMap[obj.attr] = [columnsMap[obj.attr], col];
              } else {
                columnsMap[obj.attr] = col;
              }
            }
          }
        }
      };

      const searchText = obj.header;
      if (Array.isArray(searchText)) {
        searchText.forEach(getRef);
      } else {
        getRef(searchText);
      }
    });
  }
  return columnsMap;
}
