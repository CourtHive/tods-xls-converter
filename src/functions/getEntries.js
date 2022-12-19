import { tournamentEngine, utilities, entryStatusConstants } from 'tods-competition-factory';
import { processDetailParticipants } from './processDetailParticipant';
import { getFirstRoundEntries } from './getFirstRoundEntries';
import { generateParticipantId } from '../utilities/hashing';
import { pushGlobalLog } from '../utilities/globalLog';
import { getCellValue, getRow } from './sheetAccess';
import { isBye } from '../utilities/convenience';

import { MISSING_NAMES, NO_PARTICIPANTS_FOUND } from '../constants/errorConditions';
import { ENTRY_DETAILS } from '../constants/attributeConstants';
import { POLICY_SEEDING_ITF } from '../assets/seedingPolicy';
import { SUCCESS } from '../constants/resultConstants';
const { DIRECT_ACCEPTANCE } = entryStatusConstants;

export function getEntries({
  preRoundParticipants,
  preRoundColumn,
  positionColumn,
  positionRefs,
  analysis,
  profile,
  columns,
  sheet
}) {
  const detailParticipants = {};
  const rowParticipants = {};

  const getColumnProfile = (column) => analysis.columnProfiles.find((columnProfile) => columnProfile.column === column);

  const attributeColumns = Object.keys(analysis.columns).filter(Boolean);
  const entryDetailAttributes = ENTRY_DETAILS.filter((attribute) => attributeColumns.includes(attribute));
  const entryDetailColumns = entryDetailAttributes.flatMap((attribute) => analysis.columns[attribute]).sort();

  const boundaryColumnsToConsider = [preRoundColumn, positionColumn, ...entryDetailColumns].filter(Boolean);
  const boundaryIndex = Math.max(...boundaryColumnsToConsider.map((column) => columns.indexOf(column)), 0);

  const entryDetailColumnProfiles = entryDetailColumns.map(getColumnProfile).filter(Boolean);

  const positionRows = positionRefs.map(getRow).sort(utilities.numericSort);
  let entryDetailRows = utilities.unique(entryDetailColumnProfiles.flatMap(({ rows }) => rows));

  if (entryDetailAttributes?.length) {
    for (const attribute of entryDetailAttributes) {
      const attributeColumn = analysis.columns[attribute];
      if (Array.isArray(attributeColumn)) {
        console.log('error: multiple attribute columns');
        continue;
      }
      const columnProfile = getColumnProfile(attributeColumn);

      columnProfile &&
        positionRows.forEach((row, i) => {
          const cellRef = `${attributeColumn}${row}`;
          if (!rowParticipants[row]) rowParticipants[row] = {};
          const value = columnProfile.keyMap[cellRef];
          if (value) rowParticipants[row][attribute] = value;
          rowParticipants[row].drawPosition = i + 1;
        });

      columnProfile &&
        entryDetailRows.forEach((row) => {
          const cellRef = `${attributeColumn}${row}`;
          if (!detailParticipants[row]) detailParticipants[row] = {};
          const value = columnProfile.keyMap[cellRef];
          if (value) detailParticipants[row][attribute] = value;
        });
    }
  } else {
    const rounds =
      Array.isArray(analysis.columns.round) && analysis.columns.round.filter((column) => column !== preRoundColumn);

    const firstRoundColumn = rounds?.[0] || columns[boundaryIndex + 1];
    const columnProfile = getColumnProfile(firstRoundColumn);
    const entriesOnPositionRows = positionRows.every((row) => columnProfile.rows.includes(row));
    const columnRowsOnPositionRows = columnProfile.rows.every((row) => positionRows.includes(row));

    if (entriesOnPositionRows || columnRowsOnPositionRows)
      return getFirstRoundEntries({
        preRoundParticipants,
        boundaryIndex,
        columnProfile,
        positionRows,
        analysis,
        profile
      });
  }

  const bogusRows = Object.keys(detailParticipants).filter((key) => {
    const detailParticipant = detailParticipants[key];
    const participantKeys = Object.keys(detailParticipant);
    const relevantKeys = participantKeys.filter((key) => !['ranking', 'seedValue', 'entryStatus'].includes(key));
    return !relevantKeys.length;
  });

  bogusRows.forEach((row) => delete detailParticipants[row]);
  entryDetailRows = entryDetailRows.filter((row) => !bogusRows.includes(row.toString()));

  const isSeparatedPersonsDoubles = Object.values(detailParticipants).length > positionRows.length;

  if (isSeparatedPersonsDoubles) {
    // NOTE: necessary to get row values past final positionRow
    const missingEntryDetailRow = Math.max(...positionRows) + 1;
    detailParticipants[missingEntryDetailRow] = {};
    entryDetailColumnProfiles.forEach(({ attribute, column }) => {
      const cellRef = `${column}${missingEntryDetailRow}`;
      const value = getCellValue(sheet[cellRef]);
      detailParticipants[missingEntryDetailRow][attribute] = value;
    });
    entryDetailRows.push(missingEntryDetailRow);
    const message = `adding participant detail row: ${missingEntryDetailRow}`;
    pushGlobalLog({
      method: 'notice',
      color: 'brightyellow',
      keyColors: { message: 'cyan', attributes: 'brightyellow' },
      message
    });
  }

  const detailResult =
    entryDetailColumns?.length &&
    processDetailParticipants({ analysis, profile, detailParticipants, positionRows, entryDetailRows });
  if (detailResult?.error) return detailResult;
  if (detailResult) return { boundaryIndex, ...detailResult };

  const participantCount = Object.values(rowParticipants).filter((participant) => !isBye(participant)).length;
  const drawSize = positionRefs.length;
  const policyDefinitions = { ...POLICY_SEEDING_ITF };
  const { seedsCount } = tournamentEngine.getSeedsCount({
    policyDefinitions,
    participantCount,
    drawSize
  });

  const positionAssignments = [];
  const seedAssignments = [];
  const entries = [];

  let firstNameCount = 0;
  const participants = Object.values(rowParticipants)
    .filter((participant) => {
      if (participant.seedValue > seedsCount) {
        delete participant.seedValue;
      }
      const participantIsBye = isBye(participant);
      const { drawPosition, personId, firstName, lastName, ranking, participantName, seedValue } = participant;
      const idAttributes = [firstName, lastName, ranking, participantName].filter(Boolean);
      const participantId =
        personId || (idAttributes.length && generateParticipantId({ attributes: idAttributes })?.participantId);

      const positionAssignment = participantIsBye ? { drawPosition, bye: true } : { drawPosition, participantId };

      positionAssignments.push(positionAssignment);
      participant.participantId = participantId;

      if (!participantIsBye) {
        const entryStatus = profile.entryStatusMap?.[participant.entryStatus] || DIRECT_ACCEPTANCE;
        const entry = { participantId, entryStatus };
        entries.push(entry);
      }

      if (seedValue) {
        seedAssignments.push({ seedValue, participantId });
      }

      const isParticipant = !participantIsBye && participantId;
      return isParticipant;
    })
    .map((participant) => {
      const result = getParticipant(participant);
      if (result.person.standardGivenName) firstNameCount += 1;
      return result;
    });

  if (participants.length && !firstNameCount) {
    return { error: MISSING_NAMES };
  }

  if (!participants?.length) {
    if (!analysis.columns?.round) {
      return { error: 'NO ROUND COLUMNS IDENTIFIED' };
    }
    const error = NO_PARTICIPANTS_FOUND;
    pushGlobalLog({ method: 'error', color: 'brightred', error, keyColors: { error: 'red' } });
    pushGlobalLog({ method: 'error', color: 'brightred', error, keyColors: { error: 'red' } }, 'error');

    return { error };
  }

  return { ...SUCCESS, entries, boundaryIndex, participants, positionAssignments, seedAssignments };
}

function getParticipant(details) {
  const { participantId, ranking, personId, firstName, lastName } = details;
  const person = { standardFamilyName: lastName, standardGivenName: firstName, personId };
  const lastFirst = lastName && firstName && `${lastName}, ${firstName}`;
  const participantName = details.participantName || lastFirst || lastName || firstName;

  return { participantId, participantName, person, ranking };
}
