import { findRowDefinition } from './findRowDefinition';
import { utilities } from 'tods-competition-factory';
import { findRow } from './sheetAccess';

import { FOOTER, HEADER } from '../constants/sheetElements';

export function getContentFrame({ sheet, profile, sheetDefinition, rowRange }) {
  const rowDefinitions = profile.rowDefinitions;
  const headerRowDefinition = findRowDefinition({
    rowIds: sheetDefinition.rowIds,
    rowDefinitions,
    type: HEADER
  });

  const footerRowDefinition = findRowDefinition({
    rowIds: sheetDefinition.rowIds,
    rowDefinitions,
    type: FOOTER
  });

  const headerRows = findRow({
    rowDefinition: headerRowDefinition,
    allTargetRows: true,
    sheet
  });
  const headerRow = Math.max(...headerRows);
  const headerAvoidRows = headerRows.flatMap((headerRow) => {
    const startRange = +headerRow;
    const endRange = +headerRow + (headerRowDefinition.rows || 0);
    return utilities.generateRange(startRange, endRange);
  });

  const footerRows =
    findRow({
      rowDefinition: footerRowDefinition,
      allTargetRows: true,
      sheet
    }) || [];
  const footerRow = footerRows[footerRows.length - 1] || rowRange.to + 1;
  const footerAvoidRows = footerRows.flatMap((footerRow) => {
    const startRange = +footerRow;
    const endRange = +footerRow + (footerRowDefinition.rows || 0);
    return utilities.generateRange(startRange, endRange);
  });

  const avoidRows = [].concat(...headerAvoidRows, ...footerAvoidRows);

  return { headerRow, footerRow, avoidRows };
}
