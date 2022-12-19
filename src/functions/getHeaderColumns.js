// function confirms that header columns are in expected position

import { findValueRefs, getCellValue, getCol, getRow } from './sheetAccess';
import { pushGlobalLog } from '../utilities/globalLog';
import { tidyValue } from '../utilities/convenience';
import { utilities } from 'tods-competition-factory';

// and adjusts when possible...
export function getHeaderColumns({ sheet, profile, headerRow, columnValues }) {
  const columnsMap = Object.assign({}, profile.columnsMap);

  const headerValueMap = Object.assign(
    {},
    ...Object.keys(columnValues)
      .map((column) => {
        const value = getCellValue(sheet[`${column}${headerRow}`]);
        return value && { [column]: value };
      })
      .filter(Boolean)
  );

  const invalidValueColumns = [];

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
                skipWords.some(
                  (word) => word?.toString().toLowerCase() === tidyValue(value.toString()).toLowerCase()
                ) ||
                check
              );
            });

          if (isValid) {
            extendColumnsMap({ columnsMap, ...obj, column: col });
          } else {
            invalidValueColumns.push(col);
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

  const mappedColumns = invalidValueColumns.concat(utilities.unique(Object.values(columnsMap).flat()));

  const unmappedColumns = Object.keys(headerValueMap)
    .filter((column) => !mappedColumns.includes(column))
    .map((column) => headerValueMap[column]);

  if (unmappedColumns.length) {
    const message = `Unknown Header Columns`;
    pushGlobalLog({
      method: 'warning',
      color: 'brightred',
      keyColors: { message: 'brightyellow', columns: 'cyan' },
      message,
      columns: unmappedColumns.join(', ')
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
