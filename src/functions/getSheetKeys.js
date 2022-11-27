import { containsExpression, isFloatValue, keyHasSingleAlpha } from '../utilities/convenience';
import { getCellValue, getCol, getRow } from './sheetAccess';
import { getContentFrame } from './getContentFrame';

export function getSheetKeys({ sheet, sheetDefinition, profile, ignoreCellRefs = [] }) {
  const { headerRow, footerRow, avoidRows } = getContentFrame({ sheet, profile, sheetDefinition });

  const isNotSkipExpression = (key) => {
    const value = getCellValue(sheet[key]);
    const checkFloats = profile.skipProfile?.skipFloatValues;
    const matchesExpression =
      profile.skipExpressions &&
      profile.skipExpressions.reduce((matchesExpression, expression) => {
        return containsExpression(value, expression) ? true : matchesExpression;
      }, false);
    return !matchesExpression && (!checkFloats || !isFloatValue(value));
  };

  const inRowBand = (key) => {
    const row = key && getRow(key);
    return row && row > headerRow && row < footerRow;
  };
  const isNotIgnored = (key) => !ignoreCellRefs.includes(key);
  const filteredKeys = Object.keys(sheet)
    .filter(isNotIgnored)
    .filter(inRowBand)
    .filter(keyHasSingleAlpha)
    .filter(isNotSkipExpression);

  const columnKeys = filteredKeys.reduce(
    (keys, key) => (keys.includes(getCol(key)) ? keys : keys.concat(getCol(key))),
    []
  );

  return { filteredKeys, columnKeys, avoidRows, headerRow, footerRow };
}
