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

  const fisrtHeaderRow = Math.min(...headerRows);
  const avoidBeforeHeader = utilities.generateRange(0, fisrtHeaderRow);

  const footerRows =
    findRow({
      rowDefinition: footerRowDefinition,
      allTargetRows: true,
      sheet
    }) || [];

  const headerRow = Math.min(...headerRows);

  const headerAvoidRows = headerRows.flatMap((thisRow) => {
    const startRange = thisRow;
    const endRange = +thisRow + (headerRowDefinition.rows || 0);
    return utilities.generateRange(startRange, endRange);
  });

  const footerRow = footerRows[footerRows.length - 1] || rowRange.to + 1;
  const footerAvoidRows = footerRows.flatMap((footerRow) => {
    const startRange = +footerRow;
    const endRange = +footerRow + (footerRowDefinition.rows || 0);
    return utilities.generateRange(startRange, endRange);
  });

  const avoidRows = [].concat(...avoidBeforeHeader, ...headerAvoidRows, ...footerAvoidRows);

  return { headerRow: headerRowDefinition?.extractColumns && headerRow, footerRow, avoidRows };
}
