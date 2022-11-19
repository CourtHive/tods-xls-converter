import { normalizeDiacritics, normalizeWhiteSpaces } from 'normalize-text';
import { utilities } from 'tods-competition-factory';
import { isObject, removeBits } from '../utilities/convenience';

const { unique, instanceCount } = utilities;

export function numberValue(sheet, reference) {
  return !isNaN(parseInt(getCellValue(sheet[reference]))) ? parseInt(getCellValue(sheet[reference])) : '';
}
export function cellsContaining({ sheet, term }) {
  let references = Object.keys(sheet);
  return references.filter(
    (ref) => (sheet[ref].v + '').toLowerCase().indexOf(normalizeDiacritics(term).toLowerCase()) >= 0
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

export function getCellValue(cell) {
  if (cell?.t === 'n' && containsAlpha(cell.w)) return '';

  let val = cell ? cell.v + '' : '';
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

export function findValueRefs(searchDetails, sheet, options) {
  const normalizedLowerCase = (value) => {
    const text = isObject(value) ? value.text : value;
    const normalizedText = normalizeDiacritics((text || '').toLowerCase());
    return isObject(value) ? { text: normalizedText, options: value.options } : normalizedText;
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

  const refs = Object.keys(sheet).filter((ref) => {
    const transformedValue = transformValue(getCellValue(sheet[ref]));

    const startsWith = (text) => transformedValue.startsWith(text);
    const includes = (text) => transformedValue.includes(text);
    const equals = (text) => transformedValue === text;

    const checkObjectDetail = ({ text, options }) => {
      if (options?.startsWith) {
        return startsWith(text);
      } else if (options?.includes) {
        return includes(text);
      }
    };

    if (objectSearchDetails.some(checkObjectDetail)) return true;

    if (options?.startsWith) {
      return textSearchDetails.some(startsWith);
    } else if (options?.includes) {
      return textSearchDetails.some(includes);
    } else {
      return textSearchDetails.some(equals);
    }
  });

  return refs;

  function transformValue(value) {
    value = value.toLowerCase();
    value = normalizeDiacritics(value);

    if (options?.remove && Array.isArray(options.remove)) {
      value = removeBits(value, options.remove);
    }

    return value;
  }
}

// instance allows specification of which encountered match to extract
export function getTargetValue({ searchText, sheet, rowOffset = 0, columnOffset = 0, options, instance = 1 }) {
  const nameRefs = findValueRefs(searchText, sheet, options);
  if (!Array.isArray(nameRefs) || nameRefs.length < 1) return '';

  const row = getRow(nameRefs[instance - 1]);
  const targetRow = row + rowOffset;
  const column = getCol(nameRefs[instance - 1]);
  const targetColumn = String.fromCharCode(((column && column.charCodeAt()) || 0) + columnOffset);
  const targetRef = `${targetColumn}${targetRow}`;
  const value = getCellValue(sheet[targetRef]);

  const cellRefs = [targetRef, `${column}${row}`];

  return { cellRefs, value: value?.trim() };
}

export function getValueRange({
  columnOffset = 0,
  columnCount = 0,
  rowOffset = 0,
  instance = 1,
  rowCount = 0,
  stopOnEmpty,
  searchText,
  options,
  sheet
}) {
  const nameRefs = findValueRefs(searchText, sheet, options);
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
    cellRefs.push(targetRef);
    const value = getCellValue(sheet[targetRef]);

    if (!value && stopOnEmpty) break;

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
    typeof e === 'object' ? { text: normalizeDiacritics(e.text), options: e.options } : normalizeDiacritics(e);
  const toNormal = (element) => (Array.isArray(element) ? element.map(normal) : normal(element));

  const options = { lowerCase: true, normalize: true, remove: [':'], ...additionalOptions };
  const elementRows = [].concat(
    ...rowElements
      .map((element) => (options.lowerCase ? toLowerCase(element) : element))
      .map((element) => (options.normalize ? toNormal(element) : element))
      .map((element) => {
        const valueRefs = Array.isArray(element)
          ? element.flatMap((e) => findValueRefs(e, sheet, options))
          : findValueRefs(element, sheet, options);
        // remove duplicate instances on the same row
        return unique(valueRefs.map(getRow));
      })
      .filter((f) => f.length)
  );
  const valueCounts = instanceCount(elementRows);
  const elementInstances = Math.max(0, ...Object.values(valueCounts));
  if (elementInstances >= rowDefinition.minimumElements) {
    const targetRows = Object.keys(valueCounts).reduce(
      (p, c) => (valueCounts[c] === elementInstances ? p.concat(+c) : p),
      []
    );
    if (allTargetRows) {
      return targetRows;
    } else if (firstTargetRow) {
      return Math.min(...targetRows);
    } else {
      return Math.max(...targetRows);
    }
  }
}
