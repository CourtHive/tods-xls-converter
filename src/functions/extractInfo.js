import { findRegexRefs, getCellValue, getCol, getTargetValue, getValueRange } from './sheetAccess';
import { isSkipWord, keyHasSingleAlpha } from '../utilities/convenience';
import { utilities } from 'tods-competition-factory';
import { postProcessors } from './postProcessors';

import { SUCCESS } from '../constants/resultConstants';

export function extractInfo({ profile, sheet, infoClass }) {
  const accessors = profile[infoClass];
  const options = { remove: [':'] };
  const extractObject = {};
  const cellRefs = [];

  const columns = utilities.unique(Object.keys(sheet).filter(keyHasSingleAlpha).map(getCol)).sort();

  if (infoClass && accessors) {
    accessors.forEach((accessor) => {
      const accessorCellRefs =
        (accessor.cellRef && [accessor.cellRef]) || (Array.isArray(accessor.cellRefs) && accessor.cellRefs);
      if (accessorCellRefs?.length) {
        const results = accessorCellRefs
          .map((cellRef) => getCellValue(sheet[cellRef]))
          .filter((result) => result?.length > 3);
        extractObject[accessor.attribute] = results[0];
      } else if (accessor.regex) {
        const { values } = findRegexRefs({ sheet, ...accessor, profile });
        if (values.length) {
          const re = new RegExp(accessor.regex);
          const extractedValues = utilities.unique(
            values.map((value) => value.match(re)?.[1]).map((value) => processValue({ accessor, value }))
          );

          if (accessor.multipleValues) {
            extractObject[accessor.attribute] = extractedValues;
          } else if (extractedValues.length === 1) {
            extractObject[accessor.attribute] = extractedValues[0];
          }
        }
      } else {
        if (accessor.options) {
          Object.assign(accessor.options, options);
        } else {
          Object.assign(accessor, { options });
        }

        if (accessor.rowCount || accessor.columnCount) {
          const props = Object.assign({}, accessor, { sheet, columns });
          const { values, cellRefs: refs } = getValueRange(props);
          const value = values?.filter(Boolean).filter((value) => !isSkipWord(value, profile));
          if (value) {
            extractObject[accessor.attribute] = processValue({ accessor, value });
            cellRefs.push(...refs);
          }
        } else if (accessor.columnOffsets && Array.isArray(accessor.columnOffsets)) {
          let values = [];
          accessor.columnOffsets.forEach((columnOffset) => {
            const props = Object.assign({}, accessor, { sheet, columnOffset });
            const { value, cellRefs: refs } = getTargetValue(props);
            if (value) {
              values.push(processValue({ accessor, value }));
              cellRefs.push(...refs);
            }
          });
          if (values?.length) extractObject[accessor.attribute] = values;
        } else {
          const props = Object.assign({}, accessor, { sheet });
          const { value, cellRefs: refs } = getTargetValue(props);
          if (value) {
            const result = processValue({ accessor, value });
            extractObject[accessor.attribute] = result;
            cellRefs.push(...refs);
          }
        }
      }
    });
  }

  function processValue({ accessor, value }) {
    if (accessor.postProcessor) {
      if (typeof accessor.postProcessor === 'string') {
        if (profile[accessor.postProcessor]) {
          return profile[accessor.postProcessor](value);
        } else if (postProcessors[accessor.postProcessor]) {
          return postProcessors[accessor.postProcessor](value);
        }
      } else if (typeof accessor.postProcessor === 'function') {
        return accessor.postProcessor(value);
      }
    } else {
      return value;
    }
  }

  return { cellRefs, info: extractObject, ...SUCCESS };
}
