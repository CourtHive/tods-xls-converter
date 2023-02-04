// function confirms that header columns are in expected position

import { findValueRefs, getCellValue, getCol, getRow } from './sheetAccess';
import { audit, getLoggingActive } from '../global/state';
import { pushGlobalLog } from '../utilities/globalLog';
import { tidyValue } from '../utilities/convenience';
import { utilities } from 'tods-competition-factory';

// and adjusts when possible...
export function getHeaderColumns({ sheet, profile, headerRow, columnValues }) {
  const columnsMap = Object.assign({}, profile.columnsMap);

  // map of spreadsheet column (A, B, C...) to the name given to the column
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
  const duplicates = [];

  const logging = getLoggingActive('headerColumns');

  if (profile.headerColumns) {
    // profile.headerColumns provides details for identifying which player attribute is found in which column
    profile.headerColumns.forEach((obj) => {
      // getRef takes search details and looks for header cells with values which match
      // and optionally validates the data in the column
      const getRef = (searchDetails) => {
        const options = { tidy: true };

        const rowTolerance = (ref) => {
          const row = getRow(ref);
          const hRow = parseInt(headerRow);
          const diff = Math.abs(row - hRow);
          return diff <= 1;
        };
        const vRefs = findValueRefs({ searchDetails, sheet, options, log: obj.log });
        const cols = vRefs.filter(rowTolerance).map(getCol);

        const log = logging?.attr === obj.attr;
        if (log) console.log({ searchDetails, vRefs, cols, headerRow });

        cols.forEach((col) => {
          const re = obj.valueRegex && new RegExp(obj.valueRegex);
          const skipWords = obj.skipWords || profile.skipWords || [];
          let checked = 0;
          const validityTest = columnValues[col]?.map((value) => {
            const check = re?.test(value);
            if (log && (!logging.column || logging.column === col)) console.log({ value, check });
            if (check) checked += 1;
            const valid =
              !value ||
              skipWords.some((word) => word?.toString().toLowerCase() === tidyValue(value.toString()).toLowerCase()) ||
              check;
            return valid;
          });
          const valueCheck = !re || validityTest?.every((test) => test);

          const checkedPct = columnValues[col]?.length && checked / columnValues[col].length;
          const validityThreshold = obj.valueMatchThreshold && checkedPct > obj.valueMatchThreshold;

          // it is valid if there ISs a threshold which is met or if there IS NOT a threshold and valueCheck passes
          // This is particularly relevant to PERSON_ID column resolution
          const isValid = validityThreshold || (!obj.valueMatchThreshold && valueCheck);

          if (isValid) {
            extendColumnsMap({ columnsMap, ...obj, column: col, duplicates });
          } else {
            invalidValueColumns.push(col);
          }
        });
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
    .filter((column) => !mappedColumns.includes(column) && !duplicates.includes(column))
    .map((column) => headerValueMap[column]);

  if (unmappedColumns.length) {
    audit({ unmappedColumns });
    const message = `Unknown Header Columns`;
    pushGlobalLog({
      method: 'warning',
      color: 'yellow',
      keyColors: { message: 'brightyellow', columns: 'cyan' },
      message,
      headerRow,
      columns: unmappedColumns.join(', ')
    });
  }

  return columnsMap;
}

export function extendColumnsMap({ columnsMap, attr, column, limit, duplicates }) {
  if (Array.isArray(columnsMap[attr])) {
    columnsMap[attr].push(column);
    columnsMap[attr].sort();
  } else {
    if (columnsMap[attr]) {
      if (!limit) {
        columnsMap[attr] = [columnsMap[attr], column];
      } else if (duplicates) {
        duplicates.push(column);
      }
    } else {
      columnsMap[attr] = column;
    }
  }
}
