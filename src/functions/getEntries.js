import { ENTRY_DETAILS } from '../constants/attributeConstants';
import { getLoggingActive } from '../global/state';

export function getEntries({ analysis, positionRefs, columns, preRoundColumn, positionColumn }) {
  const positionAssignments = [];
  const seedAssignments = [];
  const participants = [];
  const entries = [];

  const attributeColumns = Object.keys(analysis.columns);
  const entryDetailAttributes = ENTRY_DETAILS.filter((attribute) => attributeColumns.includes(attribute));
  const entryDetailColumns = entryDetailAttributes.flatMap((attribute) => analysis.columns[attribute]);

  const boundaryColumnsToConsider = [preRoundColumn, positionColumn, ...entryDetailColumns].filter(Boolean);
  const boundaryIndex = Math.max(...boundaryColumnsToConsider.map((column) => columns.indexOf(column)), 0);

  if (getLoggingActive('dev')) {
    // console.log(analysis.columnProfiles);
    // console.log(Object.keys(analysis));
    console.log(analysis.columns, entryDetailColumns);
    console.log({ positionRefs });
    // console.log(analysis.attributeMap);
  }

  return { entries, boundaryIndex, participants, positionAssignments, seedAssignments };
}
