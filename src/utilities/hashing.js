import { getWorkbookProps } from '..';
import hashSum from 'hash-sum';

import { INVALID_VALUES, MISSING_VALUES } from '../constants/errorConditions';

const undefinedArray = [undefined]; // attributes default to undefined for integrity check

// the goal is to reliably generate the same matchUpId each time a workbook is processed
export function generateMatchUpId({
  participantNames = undefinedArray, // fallback when personIds are not available
  personIds = undefinedArray, // personIds are preferred but not always available
  roundPosition,
  roundNumber,
  drawSize
}) {
  if ([personIds, participantNames].some((arr) => !Array.isArray(arr))) return { error: INVALID_VALUES };

  const participantAttribute = personIds.filter(Boolean).length ? personIds : participantNames;

  const attributes = [roundNumber, roundPosition, drawSize, ...participantAttribute];
  // all attributes are required to have a value that is not undefined
  if (attributes.includes(undefined)) return { error: MISSING_VALUES };

  // original author and createdDate are assumed to be stable
  const { Author, CreatedDate } = getWorkbookProps();

  return ['m', ...[Author, CreatedDate].map(hashSum), hashSum(attributes.join(':'))].join('-');
}
