import { getNonBracketedValue, withoutQualifyingDesignator } from '../utilities/convenience';
import { matchUpStatusConstants } from 'tods-competition-factory';

const { BYE, COMPLETED } = matchUpStatusConstants;

export function getRoundMatchUps({ pairedRowNumbers, roundNumber, isPreRound, analysis, profile, column }) {
  const isWholeNumber = (num) => num % 1 === 0;
  const getColumn = (column) =>
    analysis.columnProfiles.reduce((columnProfile, currentProfile, index) => {
      return columnProfile || (currentProfile.column === column && { columnProfile: currentProfile, index });
    }, undefined);

  const { matchUpStatuses } = profile;
  const { columnProfile, index } = getColumn(column);
  const nextColumnProfile = analysis.columnProfiles[index + 1];
  if (!nextColumnProfile) return {};

  const nextColumnResults = analysis.columnResultValues[nextColumnProfile.column] || [];

  const participantDetails = [];
  const matchUps = [];

  let roundPosition = 1;

  for (const pair of pairedRowNumbers) {
    // get participants from column
    const matchUpParticipants = [];
    const pairParticipantNames = pair.map((rowNumber, i) => {
      const ref = `${columnProfile.column}${rowNumber}`;
      const participantName = columnProfile.keyMap[ref];

      // drawPosition for first round can be derived from (roundPosition - 1) * 2 + sideNumber
      const isByePosition = participantName === matchUpStatuses?.bye;
      if (isByePosition) {
        matchUpParticipants.push({ isByePosition, rowNumber, roundPosition, sideNumber: i + 1 });
      } else {
        matchUpParticipants.push({ participantName, rowNumber, roundPosition, sideNumber: i + 1 });
      }

      return participantName;
    });

    const nextColumnRowNumber = Math.abs(pair[1] - pair[0]) / 2 + Math.min(...pair);
    if (isWholeNumber(nextColumnRowNumber)) {
      const nextColumn = nextColumnProfile.column;
      const nextColumnRef = `${nextColumn}${nextColumnRowNumber}`;
      const winningParticipantName = nextColumnProfile.keyMap[nextColumnRef];
      const { advancedSide } = getAdvancedSide({
        winningParticipantName,
        pairParticipantNames,
        analysis,
        profile
      });
      if (advancedSide) {
        matchUpParticipants[advancedSide - 1].advancedParticipantName = winningParticipantName;
        matchUpParticipants[advancedSide - 1].advancedPositionRef = nextColumnRef;
      }
      // get potential result
      const potentialResult = nextColumnProfile.keyMap[`${nextColumn}${nextColumnRowNumber + 1}`];
      const result = nextColumnResults.includes(potentialResult) && potentialResult;

      const matchUp = { roundNumber, roundPosition, pairParticipantNames };
      if (result) matchUp.result = result;

      const providerBye = columnProfile.matchUpStatuses?.bye || BYE;
      const isBye = pairParticipantNames.map((name) => name.toLowerCase()).includes(providerBye);

      if (isBye) {
        matchUp.matchUpStatus = BYE;
      } else {
        matchUp.matchUpStatus = COMPLETED;
        matchUp.winningSide = advancedSide;
      }

      if (!result && !isBye) {
        // TODO: in some draws preRound results appear as part of advancedSide participantName
        if (isPreRound) {
          console.log('check for result at end of advancedSide participantName');
        } else if (matchUp.winningSide) {
          console.log('No win reason', { matchUp });
        }
      }

      matchUps.push(matchUp);
    }

    participantDetails.push(...matchUpParticipants);

    roundPosition += 1;
  }

  return { matchUps, participantDetails };
}

function getAdvancedSide({ pairParticipantNames, winningParticipantName, analysis, profile }) {
  if (!winningParticipantName) return {};
  const { qualifyingIdentifiers } = profile;
  if (analysis.isDoubles) {
    //
  }

  const nonBracketedParticipantNames = pairParticipantNames.map((name) => {
    const withoutSeeding = getNonBracketedValue(name);
    return withoutQualifyingDesignator(withoutSeeding, qualifyingIdentifiers);
  });
  const nonBracketedWinningParticipantName = getNonBracketedValue(winningParticipantName);

  const exactMatchSide = nonBracketedParticipantNames.reduce((side, participantName, i) => {
    const condition = participantName === nonBracketedWinningParticipantName;
    if (condition) {
      return { advancedSide: i + 1, participantName };
    } else {
      return side;
    }
  }, {});
  if (exactMatchSide?.advancedSide) return exactMatchSide;

  const startsWith = nonBracketedParticipantNames.reduce((side, participantName, i) => {
    const condition = participantName.startsWith(nonBracketedWinningParticipantName);
    if (condition) {
      return { advancedSide: i + 1, participantName };
    } else {
      return side;
    }
  }, {});
  if (startsWith?.advancedSide) return startsWith;

  const includes = nonBracketedParticipantNames.reduce((side, participantName, i) => {
    const condition = participantName.includes(nonBracketedWinningParticipantName);
    if (condition) {
      return { advancedSide: i + 1, participantName };
    } else {
      return side;
    }
  }, {});

  return includes || {};
}
