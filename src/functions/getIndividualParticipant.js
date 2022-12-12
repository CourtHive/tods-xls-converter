import { participantConstants, participantRoles } from 'tods-competition-factory';
import { generateParticipantId } from '../utilities/hashing';
import { isString } from '../utilities/identification';
import { normalizeName } from 'normalize-text';

const { INDIVIDUAL, PAIR } = participantConstants;
const { COMPETITOR } = participantRoles;

export function getIndividualParticipant({ name }) {
  let lastName, firstName;

  // Costa Rica Qualifiers
  const qTest = (name) => /^Q\d+\s/.test(name);
  const qPositionTest = (name) => /^Q\d+$/.test(name);
  const isQualifier = qTest(name);
  const isQualifyingPosition = qPositionTest(name);
  if (isQualifier || isQualifyingPosition) name = name.split(' ').slice(1).join(' ');

  if (name.includes(',')) {
    const parts = name.split(',').map((name) => normalizeName(name));
    lastName = parts[0];
    firstName = parts[1];
  } else {
    const hasLowerStart = (n) => isString(n) && n[0] === n[0]?.toLowerCase() && n[0] !== n[0]?.toUpperCase();
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

  const participant = {
    participantRole: COMPETITOR,
    participantType: INDIVIDUAL,
    participantName,
    participantId,
    person
  };

  return { participant, isQualifyingPosition, isQualifier };
}

export function getPairParticipant({ individualParticipants }) {
  const individualParticipantIds = individualParticipants.map(({ participantId }) => participantId);
  const participantId = generateParticipantId({ attributes: individualParticipantIds })?.participantId;
  const participantName = individualParticipants.map(({ person }) => person.standardFamilyName).join('/');

  return {
    participantRole: COMPETITOR,
    individualParticipantIds,
    participantType: PAIR,
    participantName,
    participantId
  };
}
