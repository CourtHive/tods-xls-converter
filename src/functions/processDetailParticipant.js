import { entryStatusConstants, participantConstants, participantRoles } from 'tods-competition-factory';
import { limitedSeedAssignments } from './limitedSeedAssignments';
import { generateParticipantId } from '../utilities/hashing';
import { normalizeDiacritics } from 'normalize-text';
import { isBye } from '../utilities/convenience';

import { SUCCESS } from '../constants/resultConstants';
const { DIRECT_ACCEPTANCE } = entryStatusConstants;
const { PAIR, INDIVIDUAL } = participantConstants;
const { COMPETITOR } = participantRoles;

// const doublesPartnerFollows = isdoubles && check for person on rows subsequewnt to positionRows
// const doublesPairStraddles = isdoubles && check for persons on rows before and after positionRows // two or more rows between each positionRow

export function processDetailParticipants({ analysis, profile, detailParticipants, positionRows, entryDetailRows }) {
  if (!Object.values(detailParticipants).length) return;

  const entryDetailsOnPositionRows = positionRows.some((row) => entryDetailRows.includes(row));
  const entryDetailBeforePositionRow = Math.min(...positionRows) > Math.min(...entryDetailRows);
  const entryDetailRowsCount = entryDetailRows.length;
  const maxPositionRow = Math.max(...positionRows);
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
      } else if (nextRow > maxPositionRow) {
        console.log('entry detail in avoidRows', { nextRow });
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

        let { personId, firstName, lastName, ranking } = detail;
        lastName = normalizeDiacritics(lastName || '');
        firstName = normalizeDiacritics(firstName || '');

        if (detail.seedValue) seedValue = detail.seedValue;
        if (detail.entryStatus) entryStatus = profile.entryStatusMap?.[detail.entryStatus] || DIRECT_ACCEPTANCE;

        const person = { standardFamilyName: lastName, standardGivenName: firstName, personId };
        const lastFirst = lastName && firstName && `${lastName}, ${firstName}`;
        const participantName = detail.participantName || lastFirst || lastName || firstName;

        const idAttributes = [firstName, lastName, participantName].filter(Boolean);
        const participantId =
          personId || (idAttributes.length && generateParticipantId({ attributes: idAttributes })?.participantId);

        const participant = {
          participantRole: COMPETITOR,
          participantType: INDIVIDUAL,
          participantName,
          participantId,
          person,
          ranking
        };
        return { participant };
      };
      if (isSeparatedPersonsDoubles) {
        const individualParticipants = consideredRows
          .map((row) => {
            const { participant } = getIndividualParticipant(row);
            return participant;
          })
          .filter(Boolean);

        const individualParticipantIds = individualParticipants.map(({ participantId }) => participantId);
        participantId = generateParticipantId({ attributes: individualParticipantIds })?.participantId;
        const participantName = individualParticipants.map(({ person }) => person.standardFamilyName).join('/');

        const participant = {
          participantRole: COMPETITOR,
          participantType: PAIR,
          individualParticipants,
          participantName,
          participantId
        };
        participants.push(participant);
      } else {
        const { participant } = getIndividualParticipant(consideredRows[0]);
        participants.push(participant);

        participantId = participant.participantId;
      }

      positionAssignments.push({ drawPosition, participantId });

      if (seedValue) seedAssignments.push({ seedValue, participantId });
      const entry = { participantId, entryStatus };
      entries.push(entry);
    }

    drawPosition += 1;
  }

  const drawSize = participants.length;
  seedAssignments = limitedSeedAssignments({ seedAssignments, participants, drawSize });

  return { ...SUCCESS, seedAssignments, positionAssignments, entries, participants };
}
