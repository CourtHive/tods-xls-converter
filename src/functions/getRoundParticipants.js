import { matchUpStatusConstants, utilities } from 'tods-competition-factory';

const { BYE } = matchUpStatusConstants;

export function getRoundParticipants({ positionAssignments, participants }) {
  return (
    positionAssignments?.length &&
    utilities.chunkArray(
      positionAssignments.map(({ drawPosition, bye, participantId }) => {
        const participant = participants.find((participant) => participant.participantId === participantId);
        return { drawPosition, participantName: bye && BYE, ...participant, isByePosition: bye };
      }),
      2
    )
  );
}
