import { participantConstants, participantRoles } from 'tods-competition-factory';
import { generateParticipantId } from '../utilities/hashing';

const { PAIR } = participantConstants;
const { COMPETITOR } = participantRoles;

export function getPairParticipant({ individualParticipants }) {
  const individualParticipantIds = individualParticipants.map(({ participantId }) => participantId);
  const participantId = generateParticipantId({ attributes: individualParticipantIds })?.participantId;
  const getLongestName = (str) => {
    return str
      .split(' ')
      .sort(function (a, b) {
        return a.length - b.length;
      })
      .pop();
  };
  const participantName = individualParticipants
    .map(({ person }) => person.standardFamilyName || getLongestName(person.standardGivenName))
    .join('/');

  return {
    participantRole: COMPETITOR,
    participantType: PAIR,
    individualParticipants,
    participantName,
    participantId
  };
}
