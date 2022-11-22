import { getWorkbookProps } from '../global/state';
import hashSum from 'hash-sum';

import { INVALID_VALUES, MISSING_ATTRIBUTES, MISSING_VALUES } from '../constants/errorConditions';

const undefinedArray = [undefined]; // attributes default to undefined for integrity check

// the goal is to reliably generate the same matchUpId each time a workbook is processed
export function generateMatchUpId({
  participantNames = undefinedArray, // fallback when personIds are not available
  personIds = undefinedArray, // personIds are preferred but not always available
  additionalAttributes = [], // optional
  drawPositions = [], // optional
  roundPosition, // optional
  roundNumber, // optional
  drawSize // optional
}) {
  if ([personIds, participantNames].some((arr) => !Array.isArray(arr))) return { error: INVALID_VALUES };
  const participantAttribute = personIds.filter(Boolean).length ? personIds : participantNames;
  const attributes = [
    ...[roundNumber, roundPosition, drawSize, ...drawPositions, ...additionalAttributes].filter(Boolean),
    ...participantAttribute
  ];
  const result = generateId({ prepend: 'm', attributes });
  if (result.error) return result;
  return { matchUpId: result.id };
}

export function generateTournamentId({ attributes }) {
  const result = generateId({ prepend: 't', attributes, defaults: ['tournament'] });
  if (result.error) return result;
  return { tournamentId: result.id };
}

export function generateParticipantId({ attributes }) {
  const result = generateId({ prepend: 'p', attributes });
  if (result.error) return result;
  return { participantId: result.id };
}

export function generateStructureId({ attributes }) {
  const result = generateId({ prepend: 's', attributes });
  if (result.error) return result;
  return { structureId: result.id };
}

export function generateId({ prepend, attributes = [], defaultAttributes = [] } = {}) {
  // original author and createdDate are assumed to be stable
  if (attributes.includes(undefined)) return { error: MISSING_VALUES };

  const { Author, CreatedDate, workbookType } = getWorkbookProps();
  const { organization } = workbookType;

  const filteredAttributes = attributes.filter(Boolean);
  const consideredAttributes = filteredAttributes.length ? filteredAttributes : defaultAttributes;
  if (!consideredAttributes.length) return { error: MISSING_ATTRIBUTES };

  const id = [
    prepend || '',
    ...[organization, Author, CreatedDate].map(hashSum),
    hashSum(filteredAttributes.join(':'))
  ].join('-');

  return { id };
}
