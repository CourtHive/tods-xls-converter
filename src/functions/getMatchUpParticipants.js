import { matchUpStatusConstants } from 'tods-competition-factory';

const { DOUBLE_WALKOVER } = matchUpStatusConstants;

export function getMatchUpParticipants({ profile, columnProfile, derivedPair, roundPosition }) {
  const matchUpParticipants = [];
  const providerDoubleWalkover = profile.matchUpStatuses?.doubleWalkover || DOUBLE_WALKOVER;

  const pairParticipantNames = derivedPair.map((rowNumber, i) => {
    const ref = `${columnProfile?.column}${rowNumber}`;
    const refValue = columnProfile?.keyMap[ref];
    const isDoubleWalkover = refValue?.toString().toLowerCase().trim() === providerDoubleWalkover.toLowerCase();

    const participantName = isDoubleWalkover ? undefined : refValue;

    // drawPosition for first round can be derived from (roundPosition - 1) * 2 + sideNumber
    const isByePosition = participantName === profile.matchUpStatuses?.bye;
    if (isByePosition) {
      matchUpParticipants.push({ isByePosition, rowNumber, roundPosition, sideNumber: i + 1 });
    } else {
      matchUpParticipants.push({ participantName, rowNumber, roundPosition, sideNumber: i + 1 });
    }

    return participantName;
  });

  return { pairParticipantNames, matchUpParticipants };
}
