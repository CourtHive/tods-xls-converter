import { tournamentEngine, entryStatusConstants } from 'tods-competition-factory';
import { generateParticipantId } from '../utilities/hashing';
import { isBye } from '../utilities/convenience';

import { POLICY_SEEDING_ITF } from '../assets/seedingPolicy';
import { SUCCESS } from '../constants/resultConstants';
const { DIRECT_ACCEPTANCE } = entryStatusConstants;
// const doublesPartnerFollows = isdoubles && check for person on rows subsequewnt to positionRows
// const doublesPairStraddles = isdoubles && check for persons on rows before and after positionRows // two or more rows between each positionRow

export function processDetailParticipants({ analysis, profile, detailParticipants, positionRows, entryDetailRows }) {
  if (!Object.values(detailParticipants).length) return;

  const entryDetailsOnPositionRows = positionRows.every((row) => entryDetailRows.includes(row));
  const entryDetailBeforePositionRow = Math.min(...positionRows) > Math.min(...entryDetailRows);
  const entryDetailRowsCount = entryDetailRows.length;
  const positionsCount = positionRows.length;

  // separated persons doubles occurs when paired participants appear on separate rows
  const isSeparatedPersonsDoubles = entryDetailRowsCount > positionsCount;
  // as opposed to doubles where participant names are separated by "/"

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
        if (!detail) return;

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
        const individualParticipants = consideredRows.map(getIndividualParticipant).filter(Boolean);

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
