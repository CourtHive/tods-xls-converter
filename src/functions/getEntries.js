import { tournamentEngine, utilities, entryStatusConstants } from 'tods-competition-factory';
import { processDetailParticipants } from './processDetailParticipant';
import { getFirstRoundEntries } from './getFirstRoundEntries';
import { generateParticipantId } from '../utilities/hashing';
import { isBye } from '../utilities/convenience';
import { getRow } from './sheetAccess';

import { ENTRY_DETAILS } from '../constants/attributeConstants';
import { POLICY_SEEDING_ITF } from '../assets/seedingPolicy';
import { MISSING_NAMES } from '../constants/errorConditions';
import { SUCCESS } from '../constants/resultConstants';
const { DIRECT_ACCEPTANCE } = entryStatusConstants;

export function getEntries({ analysis, profile, positionRefs, columns, preRoundColumn, positionColumn }) {
  const detailParticipants = {};
  const rowParticipants = {};

  const getColumnProfile = (column) => analysis.columnProfiles.find((columnProfile) => columnProfile.column === column);

  const attributeColumns = Object.keys(analysis.columns);
  const entryDetailAttributes = ENTRY_DETAILS.filter((attribute) => attributeColumns.includes(attribute));
  const entryDetailColumns = entryDetailAttributes.flatMap((attribute) => analysis.columns[attribute]).sort();

  const boundaryColumnsToConsider = [preRoundColumn, positionColumn, ...entryDetailColumns].filter(Boolean);
  const boundaryIndex = Math.max(...boundaryColumnsToConsider.map((column) => columns.indexOf(column)), 0);

  const entryDetailColumnProfiles = entryDetailColumns.map(getColumnProfile).filter(Boolean);

  const positionRows = positionRefs.map(getRow).sort(utilities.numericSort);
  const entryDetailRows = utilities.unique(entryDetailColumnProfiles.flatMap(({ rows }) => rows));

  if (entryDetailAttributes?.length) {
    for (const attribute of entryDetailAttributes) {
      const attributeColumn = analysis.columns[attribute];
      if (Array.isArray(attributeColumn)) {
        console.log('error: multipple attribute columns');
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
    const rounds = analysis.columns.round;
    const firstRoundColumn = Array.isArray(rounds) ? rounds[0] : columns[boundaryIndex + 1];
    const columnProfile = getColumnProfile(firstRoundColumn);
    const entriesOnPositionRows = positionRows.every((row) => columnProfile.rows.includes(row));
    if (entriesOnPositionRows) return getFirstRoundEntries({ boundaryIndex, columnProfile });
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

  return { ...SUCCESS, entries, boundaryIndex, participants, positionAssignments, seedAssignments };
}

function getParticipant(details) {
  const { participantId, ranking, personId, firstName, lastName } = details;
  const person = { standardFamilyName: lastName, standardGivenName: firstName, personId };
  const lastFirst = lastName && firstName && `${lastName}, ${firstName}`;
  const participantName = details.participantName || lastFirst || lastName || firstName;

  return { participantId, participantName, person, ranking };
}
