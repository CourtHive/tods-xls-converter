import { getNonBracketedValue, getSeeding, isBye } from '../utilities/convenience';
import { limitedSeedAssignments } from './limitedSeedAssignments';
import { isNumeric, isString } from '../utilities/identification';
import { entryStatusConstants } from 'tods-competition-factory';
import { generateParticipantId } from '../utilities/hashing';
import { normalizeName } from 'normalize-text';
import { getRow } from './sheetAccess';

import { SUCCESS } from '../constants/resultConstants';

const { DIRECT_ACCEPTANCE, QUALIFIER } = entryStatusConstants;

export function getFirstRoundEntries({ boundaryIndex, columnProfile, profile, positionRows, preRoundParticipants }) {
  const positionAssignments = [];
  let seedAssignments = [];
  const participants = [];
  const entries = [];

  const doublesSeparator = profile.doubles?.nameSeparator || '/';

  const preRoundAdvancedRows =
    preRoundParticipants?.map(({ advancedPositionRef }) => getRow(advancedPositionRef)) || [];

  const isPositionRow = (index) => !positionRows || positionRows.includes(columnProfile.rows[index]);

  let drawPosition = 1;
  columnProfile.values.forEach((value, index) => {
    if (isNumeric(value) || !isPositionRow(index)) return;

    const isPreRoundParticipant = preRoundAdvancedRows.includes(columnProfile.rows[index]);
    const preRoundParticipantIndex = preRoundAdvancedRows.indexOf(columnProfile.rows[index]);
    let baseName = isPreRoundParticipant
      ? preRoundParticipants[preRoundParticipantIndex].participantName
      : getNonBracketedValue(value);

    if (isBye(baseName)) {
      positionAssignments.push({ bye: true, drawPosition });
      drawPosition += 1;
      return;
    }

    // Costa Rica Qualifiers
    const qTest = (name) => /^Q\d+\s/.test(name);
    const isQualifier = qTest(baseName);
    if (isQualifier) baseName = baseName.split(' ').slice(1).join(' ');

    const doublesParticipants = baseName.includes(doublesSeparator);
    let participantId;

    if (doublesParticipants) {
      const individualParticipants = baseName.split(doublesSeparator).map((name) => getIndividualParticipant({ name }));
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
    } else {
      const participant = getIndividualParticipant({ name: baseName });
      participantId = participant.participantId;
      participants.push(participant);
    }

    const seedValue = getSeeding(value);
    if (seedValue) seedAssignments.push({ seedValue, participantId });

    positionAssignments.push({ drawPosition, participantId });

    const entryStatus = isQualifier ? QUALIFIER : DIRECT_ACCEPTANCE;
    // TODO: const entryStage = qualifyingDraw ? QUALIFYING : MAIN;
    const entry = { participantId, entryStatus };
    entries.push(entry);

    drawPosition += 1;
  });

  const drawSize = columnProfile.values.length;
  seedAssignments = limitedSeedAssignments({ seedAssignments, participants, drawSize });

  if (positionAssignments.length) boundaryIndex += 1;

  return {
    positionAssignments,
    seedAssignments,
    boundaryIndex,
    participants,
    entries,
    ...SUCCESS
  };
}

function getIndividualParticipant({ name }) {
  let lastName, firstName;

  if (name.includes(',')) {
    const parts = name.split(',').map((name) => normalizeName(name));
    lastName = parts[0];
    firstName = parts[1];
  } else {
    const hasLowerStart = (n) => isString(n) && n[0] === n[0].toLowerCase() && n[0] !== n[0].toUpperCase();
    const parts = normalizeName(name).split(' ');
    let division = parts.map((part, index) => hasLowerStart(part) && index !== undefined && index).filter(Boolean)[0];
    if (!division) division = parts.length === 4 ? 2 : 1;
    lastName = parts.slice(division).join(' ');
    firstName = parts.slice(0, division).join(' ');
  }

  const person = { standardFamilyName: lastName, standardGivenName: firstName };
  const lastFirst = lastName && firstName && `${lastName}, ${firstName}`;
  const participantName = lastFirst || lastName || firstName;
  const idAttributes = [firstName, lastName, participantName].filter(Boolean);
  const participantId = idAttributes.length && generateParticipantId({ attributes: idAttributes })?.participantId;

  return {
    participantRole: 'COMPETITOR',
    participantType: 'INDIVIDUAL',
    participantName,
    participantId,
    person
  };
}
