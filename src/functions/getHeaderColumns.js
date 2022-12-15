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

export function extendColumnsMap({ columnsMap, attr, column, limit }) {
  if (Array.isArray(columnsMap[attr])) {
    columnsMap[attr].push(column);
  } else {
    if (columnsMap[attr]) {
      if (!limit) columnsMap[attr] = [columnsMap[attr], column];
    } else {
      columnsMap[attr] = column;
    }
  }
}
