import { entryStatusConstants, participantConstants, participantRoles } from 'tods-competition-factory';
import { limitedSeedAssignments } from './limitedSeedAssignments';
import { generateParticipantId } from '../utilities/hashing';
import { pushGlobalLog } from '../utilities/globalLog';
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
  // as opposed to doubles where participant names are separated by "/"
  const isSeparatedPersonsDoubles = entryDetailRowsCount > positionsCount;
  const separationFactor =
    isSeparatedPersonsDoubles &&
    Math.ceil((Math.max(...entryDetailRows) - Math.min(...entryDetailRows)) / positionsCount);
  analysis.isSeparatedPersonsDoubles = isSeparatedPersonsDoubles;
  analysis.separationFactor = separationFactor;

  if (!entryDetailsOnPositionRows && !isSeparatedPersonsDoubles) {
    console.log('some kind of error');
  }

  if (isSeparatedPersonsDoubles) {
    analysis.isDoubles = true;
  }

  const positionAssignments = [];
  const splitDetailRows = [];
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
      const getIndividualParticipant = (row, secondParticipant) => {
        let detail = detailParticipants[row];
        const splitDetails =
          !secondParticipant && separationFactor && separationFactor > 2 && detailParticipants[row - 1];

        if (splitDetails) {
          detail = Object.assign(detail || {}, detailParticipants[row - 1]);
          splitDetailRows.push(row);
        }
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
          .map((row, rowIndex) => {
            const participant = getIndividualParticipant(row, rowIndex)?.participant;
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
        if (participant.participantName !== 'BYE') participants.push(participant);
      } else {
        const participant = getIndividualParticipant(consideredRows[0])?.participant;
        if (participant) {
          participants.push(participant);
          participantId = participant.participantId;
        }
      }

      positionAssignments.push({ drawPosition, participantId });

      if (seedValue) seedAssignments.push({ seedValue, participantId });
      const entry = { participantId, entryStatus };
      entries.push(entry);
    }

    drawPosition += 1;
  }

  if (splitDetailRows?.length) {
    const message = `split participant detail rows: ${splitDetailRows.join(',')}`;
    pushGlobalLog({
      method: 'notice',
      color: 'brightyellow',
      keyColors: { message: 'cyan', attributes: 'brightyellow' },
      message
    });
  }
  const drawSize = participants.length;
  seedAssignments = limitedSeedAssignments({ seedAssignments, participants, drawSize });

  return { ...SUCCESS, seedAssignments, positionAssignments, entries, participants };
}
