import { tournamentEngine, utilities, entryStatusConstants } from 'tods-competition-factory';
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

  const detailResult =
    entryDetailColumns &&
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

  return { entries, boundaryIndex, participants, positionAssignments, seedAssignments };
}

function getParticipant(details) {
  const { participantId, ranking, personId, firstName, lastName } = details;
  const person = { standardFamilyName: lastName, standardGivenName: firstName, personId };
  const lastFirst = lastName && firstName && `${lastName}, ${firstName}`;
  const participantName = details.participantName || lastFirst || lastName || firstName;

  return { participantId, participantName, person, ranking };
}

// const doublesPartnerFollows = isdoubles && check for person on rows subsequewnt to positionRows
// const doublesPairStraddles = isdoubles && check for persons on rows before and after positionRows // two or more rows between each positionRow

function processDetailParticipants({ analysis, profile, detailParticipants, positionRows, entryDetailRows }) {
  if (!Object.values(detailParticipants).length) return;

  const entryDetailsOnPositionRows = positionRows.every((row) => entryDetailRows.includes(row));
  const entryDetailBeforePositionRow = Math.min(...positionRows) > Math.min(...entryDetailRows);
  const entryDetailRowsCount = entryDetailRows.length;
  const positionsCount = positionRows.length;

  // separated persons doubles occurs when paired participants appear on separate rows
  const isSeparatedPersonsDoubles = entryDetailRowsCount > positionsCount;
  // as opposed to doubles where participant names are separated by "/"

  /*
  if (isSeparatedPersonsDoubles && entryDetailRowsCount !== positionsCount * 2) {
    console.log({ entryDetailRowsCount, positionsCount });
    return { error: 'Participant Detail Row Count Mismatch' };
  }
  */

  if (!entryDetailsOnPositionRows && !isSeparatedPersonsDoubles) {
    console.log('some kind of error');
  }

  if (isSeparatedPersonsDoubles) {
    analysis.isDoubles = true;
  }

  const positionAssignments = [];
  let seedAssignments = [];
  const participants = [];
  const entries = [];

  let drawPosition = 1;
  for (const positionRow of positionRows) {
    const consideredRows = [];
    let participantId;
    let entryStatus;

    if (entryDetailsOnPositionRows) {
      consideredRows.push(positionRow);
    } else if (entryDetailBeforePositionRow && entryDetailRows.includes(positionRow - 1)) {
      consideredRows.push(positionRow - 1);
    }

    if (isSeparatedPersonsDoubles) {
      const nextRow = positionRow + 1;
      if (entryDetailRows.includes(nextRow)) {
        consideredRows.push(nextRow);
      }
    }

    const participantIsBye = consideredRows.some((row) => isBye(detailParticipants[row]));
    if (participantIsBye) {
      positionAssignments.push({ drawPosition, bye: true });
    } else {
      let seedValue;
      const getIndividualParticipant = (row) => {
        const detail = detailParticipants[row];
        const { personId, firstName, lastName, ranking } = detail;

        if (detail.seedValue) seedValue = detail.seedValue;
        if (detail.entryStatus) entryStatus = profile.entryStatusMap?.[detail.entryStatus] || DIRECT_ACCEPTANCE;

        const person = { standardFamilyName: lastName, standardGivenName: firstName, personId };
        const lastFirst = lastName && firstName && `${lastName}, ${firstName}`;
        const participantName = detail.participantName || lastFirst || lastName || firstName;

        const idAttributes = [firstName, lastName, ranking, participantName].filter(Boolean);
        const participantId =
          personId || (idAttributes.length && generateParticipantId({ attributes: idAttributes })?.participantId);

        return { participantId, participantName, person, ranking };
      };
      if (isSeparatedPersonsDoubles) {
        const individualParticipants = consideredRows.map(getIndividualParticipant);

        const individualParticipantIds = individualParticipants.map(({ participantId }) => participantId);
        participantId = generateParticipantId({ attributes: individualParticipantIds })?.participantId;
        const participantName = individualParticipants.map(({ person }) => person.standardFamilyName).join('/');

        const participant = {
          participantRole: 'COMPETITOR',
          participantType: 'PAIR',
          individualParticipants,
          participantName,
          participantId
        };
        participants.push(participant);
        positionAssignments.push({ drawPosition, participantId });
      } else {
        const participant = {
          participantRole: 'COMPETITOR',
          participantType: 'INDIVIDUAL',
          ...getIndividualParticipant(consideredRows[0])
        };
        participants.push(participant);

        participantId = participant.participantId;
        positionAssignments.push({ drawPosition, participantId });
      }

      if (seedValue) seedAssignments.push({ seedValue, participantId });
      const entry = { participantId, entryStatus };
      entries.push(entry);
    }

    drawPosition += 1;
  }

  const participantCount = participants.length;
  const policyDefinitions = { ...POLICY_SEEDING_ITF };
  const { seedsCount } = tournamentEngine.getSeedsCount({
    drawSize: positionsCount,
    policyDefinitions,
    participantCount
  });

  seedAssignments = seedAssignments.filter((assignment) => assignment.seedValue <= seedsCount);

  return { ...SUCCESS, seedAssignments, positionAssignments, entries, participants };
}
