// function confirms that header columns are in expected position

import { findValueRefs, getCol, getRow } from './sheetAccess';
import { tidyValue } from '../utilities/convenience';

// and adjusts when possible...
export function getHeaderColumns({ sheet, profile, headerRow, columnValues }) {
  const columnsMap = Object.assign({}, profile.columnsMap);
  if (profile.headerColumns) {
    profile.headerColumns.forEach((obj) => {
      const getRef = (details) => {
        const options = { tidy: true };
        let searchDetails;

        if (typeof details === 'object') {
          const { text, options: objOptions, ...additionalOptions } = details;
          Object.assign(options, additionalOptions, objOptions);
          searchDetails = text;
        } else {
          searchDetails = details;
        }

        const ref = findValueRefs({ searchDetails, sheet, options }).reduce(
          (p, c) => (getRow(c) === parseInt(headerRow) ? c : p),
          undefined
        );
        const col = ref && getCol(ref);

        if (col) {
          const re = obj.valueRegex && new RegExp(obj.valueRegex);
          const skipWords = obj.skipWords || profile.skipWords || [];
          const isValid =
            !re ||
            columnValues[col]?.every((value) => {
              const check = re.test(value);
              return (
                !value ||
                skipWords.some((word) => word.toLowerCase() === tidyValue(value.toString()).toLowerCase()) ||
                check
              );
            });

          if (isValid) {
            extendColumnsMap({ columnsMap, ...obj, column: col });
            /*
            if (Array.isArray(columnsMap[obj.attr])) {
              columnsMap[obj.attr].push(col);
            } else {
              if (columnsMap[obj.attr]) {
                if (!obj.limit) columnsMap[obj.attr] = [columnsMap[obj.attr], col];
              } else {
                columnsMap[obj.attr] = col;
              }
            }
            */
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

export function extendColumnsMap({ columnsMap, attribute, column, limit }) {
  if (Array.isArray(columnsMap[attribute])) {
    columnsMap[attribute].push(column);
  } else {
    if (columnsMap[attribute]) {
      if (!limit) columnsMap[attribute] = [columnsMap[attribute], column];
    } else {
      columnsMap[attribute] = column;
    }
  }
}
