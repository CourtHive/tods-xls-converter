import { participantConstants, participantRoles } from 'tods-competition-factory';
import { generateParticipantId } from '../utilities/hashing';
import { getLongestName } from '../utilities/convenience';

const { PAIR } = participantConstants;
const { COMPETITOR } = participantRoles;

export function getPairParticipant({ individualParticipants }) {
  const individualParticipantIds = individualParticipants.map(({ participantId }) => participantId);
  const participantId = generateParticipantId({ attributes: individualParticipantIds })?.participantId;
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
