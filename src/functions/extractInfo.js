import { getCellValue, getTargetValue, getValueRange } from './sheetAccess';
import { postProcessors } from './postProcessors';

import { SUCCESS } from '../constants/resultConstants';

export function extractInfo({ profile, sheet, infoClass }) {
  const extractObject = {};
  const options = { remove: [':'] };
  const accessors = profile[infoClass];
  if (infoClass && accessors) {
    accessors.forEach((accessor) => {
      if (accessor.cellRef) {
        const result = getCellValue(sheet[accessor.cellRef]);
        extractObject[accessor.attribute] = result;
      } else {
        if (accessor.options) {
          Object.assign(accessor.options, options);
        } else {
          Object.assign(accessor, { options });
        }
        if (accessor.rowCount || accessor.columnCount) {
          const props = Object.assign({}, accessor, { sheet });
          const value = getValueRange(props)?.filter(Boolean);
          extractObject[accessor.attribute] = processValue({ accessor, value });
        } else if (accessor.columnOffsets && Array.isArray(accessor.columnOffsets)) {
          let values = [];
          accessor.columnOffsets.forEach((columnOffset) => {
            const props = Object.assign({}, accessor, { sheet, columnOffset });
            const value = getTargetValue(props);
            if (value) {
              values.push(processValue({ accessor, value }));
            }
          });
          if (values?.length) extractObject[accessor.attribute] = values;
        } else {
          const props = Object.assign({}, accessor, { sheet });
          const value = getTargetValue(props);
          if (value) {
            const result = processValue({ accessor, value });
            extractObject[accessor.attribute] = result;
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

  return { info: extractObject, ...SUCCESS };
}
