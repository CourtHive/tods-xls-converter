import { participantConstants, participantRoles } from 'tods-competition-factory';
import { normalizeDiacritics, normalizeName } from 'normalize-text';
import { getNonBracketedValue } from '../utilities/convenience';
import { generateParticipantId } from '../utilities/hashing';
import { isString } from '../utilities/identification';

const { INDIVIDUAL, PAIR } = participantConstants;
const { COMPETITOR } = participantRoles;

export function getIndividualParticipant({ name, analysis }) {
  let lastName, firstName;

  // Costa Rica Qualifiers
  const qTest = (name) => /^[Q,q]\d+\s/.test(name);
  const qPositionTest = (name) => /^[Q,q]\d+$/.test(name);
  const isQualifier = qTest(name);
  const isQualifyingPosition = qPositionTest(name);
  if (isQualifier || isQualifyingPosition)
    name = name
      .split(' ')
      .slice(1)
      .map((x) => x.trim())
      .filter(Boolean)
      .join(' ');

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

    // when there is no separator between first and last names, look for values in other columns which
    // match part of the name value (found only in the firstName)
    if (firstName && !lastName) {
      const consideredValues =
        analysis?.valuesMap &&
        Object.keys(analysis.valuesMap)
          .flatMap((value) => value.split('/'))
          .map((v) => v.toString().toLowerCase());
      const fn = firstName.toString().toLowerCase();
      const validValue = consideredValues?.find((value) => {
        return fn.length > value.length && (fn.startsWith(value) || fn.endsWith(value));
      });
      if (validValue) {
        lastName = normalizeName(validValue);
        firstName = normalizeName(fn.split(validValue).join(''));
      }
    }
  }

  lastName = lastName ? normalizeDiacritics(lastName) : '';
  lastName = getNonBracketedValue(lastName);
  firstName = firstName ? normalizeDiacritics(firstName) : '';
  firstName = getNonBracketedValue(firstName);

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
