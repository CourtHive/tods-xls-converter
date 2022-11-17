import { SUCCESS } from '../constants/resultConstants';
import { getTargetValue } from './sheetAccess';

export function extractInfo({ profile, sheet, infoClass }) {
  const extractObject = {};
  const options = { remove: [':'] };
  const accessors = profile[infoClass];
  if (infoClass && accessors) {
    accessors.forEach((accessor) => {
      if (accessor.columnOffsets && Array.isArray(accessor.columnOffsets)) {
        let values = [];
        accessor.columnOffsets.forEach((columnOffset) => {
          const props = Object.assign(accessor, { sheet, options, columnOffset });
          const value = getTargetValue(props);
          if (value) {
            values.push(processValue({ accessor, value }));
          }
        });
        if (values.length) extractObject[accessor.attribute] = values;
      } else {
        const props = Object.assign(accessor, { sheet, options });
        const value = getTargetValue(props);
        if (value) {
          const result = processValue({ accessor, value });
          if (typeof result === 'object') {
            Object.assign(extractObject, result);
          } else {
            extractObject[accessor.attribute] = result;
          }
        }
      }
    });
  }

  function processValue({ accessor, value }) {
    if (accessor.postProcessor && profile[accessor.postProcessor]) {
      return profile[accessor.postProcessor](value);
    } else {
      return value;
    }
  }

  return { info: extractObject, ...SUCCESS };
}
