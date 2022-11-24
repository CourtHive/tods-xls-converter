export function getRoundMatchUps({ analysis, column, pairedPositions, roundNumber }) {
  const isWholeNumber = (num) => num % 1 === 0;
  const getColumn = (column) =>
    analysis.columnProfiles.reduce((profile, currentProfile, index) => {
      return profile || (currentProfile.column === column && { profile: currentProfile, index });
    }, undefined);

  const { profile, index } = getColumn(column);
  const nextColumnProfile = analysis.columnProfiles[index + 1];

  const matchUps = [];
  for (const pair of pairedPositions) {
    const nextPosition = Math.abs(pair[1] - pair[0]) / 2 + Math.min(...pair);
    if (isWholeNumber(nextPosition)) {
      // get participants from column
      const pairParticipantNames = pair.map((position) => {
        const ref = `${profile.column}${position}`;
        return profile.keyMap[ref];
      });
      const nextColumn = nextColumnProfile.column;
      const winningParticipantName = nextColumnProfile.keyMap[`${nextColumn}${nextPosition}`];
      const { winningSide } = getWinningSide({ pairParticipantNames, winningParticipantName });
      console.log({ pairParticipantNames, winningParticipantName, roundNumber, winningSide });
    }
  }

  return { matchUps };
}

function getWinningSide({ pairParticipantNames, winningParticipantName }) {
  if (!winningParticipantName) return {};
  const exactMatchSideNumber = pairParticipantNames.reduce((sideNumber, participantName, i) => {
    const exactMatch = participantName === winningParticipantName;
    return sideNumber || (exactMatch ? i + 1 : undefined);
  }, undefined);
  const startsWithSideNumber = pairParticipantNames.reduce((sideNumber, participantName, i) => {
    const startsWith = participantName.startsWith(winningParticipantName);
    return sideNumber || (startsWith ? i + 1 : undefined);
  }, undefined);
  const includesWithSideNumber = pairParticipantNames.reduce((sideNumber, participantName, i) => {
    const includes = participantName.includes(winningParticipantName);
    return sideNumber || (includes ? i + 1 : undefined);
  }, undefined);

  const winningSide = exactMatchSideNumber || startsWithSideNumber || includesWithSideNumber;
  return { winningSide };
}
