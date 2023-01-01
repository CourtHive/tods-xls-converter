import { normalizeDiacritics, normalizeWhiteSpaces } from 'normalize-text';
import { isSkipWord, tidyValue } from '../utilities/convenience';
import { removeBits } from '../utilities/transformers';
import { isObject } from '../utilities/identification';
import { utilities } from 'tods-competition-factory';

const { unique, instanceCount } = utilities;

export const keyRowSort = (a, b) => parseInt(getRow(a)) - parseInt(getRow(b));

export function numberValue(sheet, reference) {
  return !isNaN(parseInt(getCellValue(sheet[reference]))) ? parseInt(getCellValue(sheet[reference])) : '';
}
export function cellsContaining({ sheet, term }) {
  let references = Object.keys(sheet);
  return references.filter(
    (ref) => (cellValueAttribute(sheet[ref]) + '').toLowerCase().indexOf(normalizeDiacritics(term).toLowerCase()) >= 0
  );
}

export function onlyNameChars(value) {
  // eslint-disable-next-line no-useless-escape
  return normalizeWhiteSpaces(value.replace(/[^A-Za-z\-]/g, ' '));
}

export function extractNameField(cellRef) {
  const value = getCellValue(cellRef);
  return onlyNameChars(value);
}

const containsAlpha = (value) => /[a-zA-Z- ]+/.test(value);

export function isDateCell(cell) {
  return cell?.t === 'n' && containsAlpha(cell.w);
}

export function cellValueAttribute(cell) {
  if (cell.t === 'e') return ''; // is an error value
  return (cell.w !== '#REF!' && cell.w) || cell.v;
}

export function getCellValue(cell) {
  if (cell?.t === 'n' && containsAlpha(cell.w)) {
    // number where the formatted value is alpha date without year
    return '';
  }

  let val = cell ? cellValueAttribute(cell) + '' : '';
  val = typeof val === 'string' ? val.trim() : val;
  val = normalizeWhiteSpaces(val);
  val = val.indexOf(',,') >= 0 ? val.replace(',,', ',') : val;
  val =
    val.indexOf(',') >= 0
      ? val
          .split(',')
          .map((v) => v.trim())
          .join(', ')
      : val;
  return normalizeDiacritics(val);
}

export function getRow(reference) {
  const numericPart = reference && /\d+/.exec(reference);
  return numericPart ? parseInt(numericPart[0]) : undefined;
}

export function getCol(reference) {
  return reference ? reference[0] : undefined;
}

export function findRegexRefs({ regex, sheet, profile }) {
  if (!regex || typeof regex !== 'string') return;
  const re = new RegExp(regex);
  const values = [];
  const testedValues = [];
  const refs = Object.keys(sheet).filter((ref) => {
    const value = getCellValue(sheet[ref]).toString().toLowerCase();

    if (profile && isSkipWord(value, profile)) return;
    testedValues.push(value);
    if (re.test(value)) {
      values.push(value);
      return true;
    }
  });

  return { values, refs };
}

export function findValueRefs({ searchDetails, sheet, options, mapValues }) {
  const normalizedLowerCase = (value) => {
    if (!isObject(value)) return normalizeDiacritics(value || '').toLowerCase();
    // objOptions and additionalOptions allow declartions to be in options object or as attributes
    const { text: originalText, options: objOptions, ...additionalOptions } = value;
    const normalizedText = normalizeDiacritics((originalText || '').toLowerCase());
    return { text: normalizedText, options: { ...objOptions, ...additionalOptions } };
  };

  const isArray = Array.isArray(searchDetails);
  const lowercaseSearchDetails = isArray
    ? searchDetails.map(normalizedLowerCase)
    : [normalizedLowerCase(searchDetails)];

  const objectSearchDetails = [];
  const textSearchDetails = [];

  for (const detail of lowercaseSearchDetails) {
    if (isObject(detail)) {
      objectSearchDetails.push(detail);
    } else {
      textSearchDetails.push(detail);
    }
  }

  const refMap = {};

  const refs = Object.keys(sheet).filter((ref) => {
    const value = getCellValue(sheet[ref]);
    const transformedValue = transformValue(value);

    const startsWith = (text) => transformedValue.startsWith(text) || transformedValue === text;
    const endsWith = (text) => transformedValue.endsWith(text) || transformedValue === text;
    const separatedIncludes = (text, requiredSeparator) => transformedValue.split(requiredSeparator).includes(text);
    const includes = (text) => transformedValue.includes(text);
    const equals = (text) => transformedValue === text;

    const checkObjectDetail = ({ text, options }) => {
      if (options?.startsWith) {
        return startsWith(text);
      } else if (options?.endsWith) {
        return endsWith(text);
      } else if (options?.includes) {
        return includes(text);
      }
    };

    if (objectSearchDetails.some(checkObjectDetail)) return true;

    let matchFound;

    if (options?.startsWith) {
      matchFound = textSearchDetails.some(startsWith);
    } else if (options?.includes) {
      if (options.requiredSeparator) {
        matchFound = textSearchDetails.some((text) => separatedIncludes(text, options.requiredSeparator));
      } else {
        matchFound = textSearchDetails.some(includes);
      }
    } else {
      matchFound = textSearchDetails.some(equals);
    }

    if (matchFound && mapValues) refMap[ref] = { value, transformedValue };

    return matchFound;
  });

  return mapValues ? refMap : refs;

  function transformValue(value) {
    value = value.toLowerCase();
    // value = normalizeDiacritics(value); // redundant ~ part of getCellValue

    if (options?.remove && Array.isArray(options.remove)) {
      value = removeBits(value, options.remove);
    }
    if (options?.tidy) {
      value = tidyValue(value);
    }

    return value;
  }
}

// instance allows specification of which encountered match to extract
export function getTargetValue({ searchText, sheet, rowOffset = 0, columnOffset = 0, options, instance = 1 }) {
  const nameRefs = findValueRefs({ searchDetails: searchText, sheet, options });
  if (!Array.isArray(nameRefs) || nameRefs.length < 1) {
    return '';
  }

  const getInstance = (instance) => {
    const row = getRow(nameRefs[instance - 1]);
    const targetRow = row + rowOffset;
    const column = getCol(nameRefs[instance - 1]);
    const targetColumn = String.fromCharCode(((column && column.charCodeAt()) || 0) + columnOffset);
    const targetRef = `${targetColumn}${targetRow}`;
    const value = getCellValue(sheet[targetRef])?.trim();
    const cellRefs = [targetRef, `${column}${row}`];

    return { cellRefs, value };
  };

  if (instance) {
    return getInstance(instance);
  } else {
    // when instance is 0 it searches for first value across all instances
    const valueInstance = nameRefs.map((ref, i) => getInstance(i + 1)).find(({ value }) => value) || {};
    return valueInstance;
  }
}

export function getValueRange({
  preserveNonCounter,
  columnCountMinimum,
  columnOffset = 0,
  columnCount = 0,
  rowOffset = 0,
  instance = 1,
  rowCount = 0,
  stopOnEmpty,
  searchText,
  columns,
  options,
  sheet
}) {
  const nameRefs = findValueRefs({ searchDetails: searchText, sheet, options });
  if (!Array.isArray(nameRefs) || nameRefs.length < 1) return '';

  const column = getCol(nameRefs[instance - 1]);
  const row = getRow(nameRefs[instance - 1]);

  const cellRefs = [`${column}${row}`];

  // cannot have both rowCount and columnCount; must have one
  if ((rowCount && columnCount) || (rowCount && columnCount)) return [];

  const range = utilities.generateRange(0, rowCount || columnCount);

  const values = [];

  for (const increment of range) {
    const targetRow = row + rowOffset + (rowCount ? increment : 0);
    const column = getCol(nameRefs[instance - 1]);
    const targetColumn = String.fromCharCode(
      ((column && column.charCodeAt()) || 0) + columnOffset + (columnCount ? increment : 0)
    );
    const targetRef = `${targetColumn}${targetRow}`;
    let value = getCellValue(sheet[targetRef]);

    if (!value && stopOnEmpty && (!columnCountMinimum || range.indexOf(increment)) >= columns.length - 2) {
      // columns.length - 2 should be equal to drawPositions / 4
      // This is to account for data in the round column that is not relevant to progression
      break;
    }
    if (preserveNonCounter) {
      if (value.includes(' ')) {
        continue;
      }
    }

    cellRefs.push(targetRef);
    values.push(value);
  }

  return { values, cellRefs };
}

export function findRow({ firstTargetRow, allTargetRows, rowDefinition, sheet, options: additionalOptions }) {
  const rowElements = rowDefinition && rowDefinition.elements;
  if (!rowElements) return;

  const toLower = (e) => (typeof e === 'object' ? { text: e.text.toLowerCase(), options: e.options } : e.toLowerCase());
  const toLowerCase = (element) => (Array.isArray(element) ? element.map(toLower) : toLower(element));

  const normal = (e) =>
    typeof e === 'object'
      ? { text: normalizeDiacritics(e.text || ''), options: e.options }
      : normalizeDiacritics(e || '');
  const toNormal = (element) => (Array.isArray(element) ? element.map(normal) : normal(element));

  const options = { lowerCase: true, normalize: true, remove: [':'], ...additionalOptions };
  const elementRows = [].concat(
    ...rowElements
      .map((element) => {
        element = options.lowerCase ? toLowerCase(element) : element;
        element = options.normalize ? toNormal(element) : element;

        const valueRefs = Array.isArray(element)
          ? element.flatMap((e) => findValueRefs({ searchDetails: e, sheet, options }))
          : findValueRefs({ searchDetails: element, sheet, options });
        // remove duplicate instances on the same row
        return unique(valueRefs.map(getRow));
      })
      .filter((f) => f.length)
  );
  const valueCounts = instanceCount(elementRows);
  const elementInstances = Math.max(0, ...Object.values(valueCounts));

  if (elementInstances >= rowDefinition.minimumElements) {
    const targetRows = Object.keys(valueCounts).reduce(
      (p, c) => (valueCounts[c] >= rowDefinition.minimumElements ? p.concat(+c) : p),
      []
    );
    if (allTargetRows) {
      return targetRows;
    } else if (firstTargetRow) {
      return Math.min(...targetRows);
    } else if (rowDefinition.rowBuffer) {
      return Math.min(...targetRows) + rowDefinition.rowBuffer;
    } else {
      return Math.max(...targetRows);
    }
  }
}
