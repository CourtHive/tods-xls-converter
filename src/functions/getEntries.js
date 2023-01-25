import { tournamentEngine, utilities, entryStatusConstants } from 'tods-competition-factory';
import { processDetailParticipants } from './processDetailParticipant';
import { getFirstRoundEntries } from './getFirstRoundEntries';
import { generateParticipantId } from '../utilities/hashing';
import { pushGlobalLog } from '../utilities/globalLog';
import { getCellValue, getRow } from './sheetAccess';
import { getLoggingActive } from '../global/state';
import { isBye } from '../utilities/convenience';

import { MISSING_NAMES, NO_PARTICIPANTS_FOUND } from '../constants/errorConditions';
import { POLICY_SEEDING_ITF } from '../assets/seedingPolicy';
import { SUCCESS } from '../constants/resultConstants';
import {
  ENTRY_DETAILS,
  ENTRY_STATUS,
  FIRST_NAME,
  LAST_NAME,
  PERSON_ID,
  RANKING,
  SEED_VALUE
} from '../constants/attributeConstants';

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
  const notPositionRows = {};

  const getColumnProfile = (column) => analysis.columnProfiles.find((columnProfile) => columnProfile.column === column);

  const attributeColumns = Object.keys(analysis.columns).filter(Boolean);
  const entryDetailAttributes = ENTRY_DETAILS.filter((attribute) => attributeColumns.includes(attribute));
  const entryDetailColumns = entryDetailAttributes.flatMap((attribute) => analysis.columns[attribute]).sort();

  const idColumn = analysis.columnProfiles.find(
    ({ character, attribute }) => attribute === PERSON_ID || character === PERSON_ID
  )?.column;

  // backfill personId column
  if (idColumn && !entryDetailColumns.includes(idColumn)) {
    analysis.columns[PERSON_ID] = idColumn;
    entryDetailAttributes.push(PERSON_ID);
    entryDetailColumns.push(idColumn);
  }

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
          const value = columnProfile.keyMap[cellRef];
          if (value) {
            if (!detailParticipants[row]) detailParticipants[row] = {};
            detailParticipants[row][attribute] = value;
            if (!positionRows.includes(row)) {
              notPositionRows[row] = value;
            }
          }
        });
    }
  } else {
    const rounds =
      Array.isArray(analysis.columns.round) && analysis.columns.round.filter((column) => column !== preRoundColumn);

    const firstRoundColumn = rounds?.[0] || columns[boundaryIndex + 1];
    const columnProfile = getColumnProfile(firstRoundColumn);
    const entriesOnPositionRows = positionRows.every((row) => columnProfile?.rows.includes(row));
    const columnRowsOnPositionRows = columnProfile?.rows.every((row) => positionRows.includes(row));

    if (entriesOnPositionRows || columnRowsOnPositionRows) {
      return getFirstRoundEntries({
        preRoundParticipants,
        boundaryIndex,
        columnProfile,
        positionRows,
        analysis,
        profile
      });
    }
  }

  const bogusRows = Object.keys(detailParticipants).filter((key) => {
    const detailParticipant = detailParticipants[key];
    if (isBye(detailParticipant)) return false;

    const participantKeys = Object.keys(detailParticipant);
    const relevantKeys = participantKeys.filter((key) => ![RANKING, SEED_VALUE, ENTRY_STATUS].includes(key));
    const nameColumn = relevantKeys.includes(LAST_NAME) || relevantKeys.includes(FIRST_NAME);
    return !relevantKeys.length || (!nameColumn && participantKeys.length < 2);
  });

  bogusRows.forEach((row) => delete detailParticipants[row]);
  entryDetailRows = entryDetailRows.filter((row) => !bogusRows.includes(row.toString()));

  const detailsCount = Object.values(detailParticipants).length;
  const byesCount = Object.values(detailParticipants).filter(isBye).length;

  // NOTE: fudgeFactor includes +1 for doubles participant row after last positionRow
  // NOTE: fudgeFactor includes +1 for participant missing participantId
  const fudgeFactor = 2;
  // LIMITATION: doesn't support more than half of doubles draw filled with BYEs
  const doublesThreshold = (detailsCount + fudgeFactor + byesCount) / 2;
  const isSeparatedPersonsDoubles = doublesThreshold >= positionRows.length;

  // TODO: separated doubles can also be detected if subsequent rounds contain names joined with '/'

  if (detailsCount > positionRows.length && !isSeparatedPersonsDoubles) {
    const exciseRows = Object.keys(notPositionRows);
    entryDetailRows = entryDetailRows.filter((row) => !exciseRows.includes(row.toString()));
    exciseRows.forEach((row) => delete detailParticipants[row]);
  }

  if (isSeparatedPersonsDoubles) {
    // NOTE: necessary to get row values past final positionRow
    const missingEntryDetailRow = Math.max(...positionRows) + 1;
    // detailParticipants[missingEntryDetailRow] = {};
    const missingDetail = {};
    entryDetailColumnProfiles.forEach(({ attribute, column }) => {
      const cellRef = `${column}${missingEntryDetailRow}`;
      const value = getCellValue(sheet[cellRef]);
      // detailParticipants[missingEntryDetailRow][attribute] = value;
      missingDetail[attribute] = value;
    });
    const missingEntryValues = Object.values(missingDetail).filter(Boolean);
    if (missingEntryValues.length) {
      detailParticipants[missingEntryDetailRow] = missingDetail;
      entryDetailRows.push(missingEntryDetailRow);
    }
    if (getLoggingActive('detail')) {
      const message = `adding participant detail row: ${missingEntryDetailRow}`;
      pushGlobalLog({
        method: 'notice',
        color: 'brightyellow',
        keyColors: { message: 'cyan', attributes: 'brightyellow' },
        message
      });
    }
  } else if (detailsCount > positionRows) {
    console.log('----------------------- Check for false S');
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
    const roundValues = analysis.columns.round
      .flatMap((roundColumn) => analysis.columnProfiles.find((column) => column === roundColumn)?.values)
      .filter(Boolean);

    if (roundValues.length) {
      const error = NO_PARTICIPANTS_FOUND;
      pushGlobalLog({ method: 'error', color: 'brightred', error, keyColors: { error: 'red' } });
      pushGlobalLog({ method: 'error', color: 'brightred', error, keyColors: { error: 'red' } }, 'error');

      return { error };
    }
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
