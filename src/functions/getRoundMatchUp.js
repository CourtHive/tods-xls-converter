import { getNonBracketedValue, withoutQualifyingDesignator } from '../utilities/convenience';
import { matchUpStatusConstants, utilities } from 'tods-competition-factory';
import { isNumeric } from '../utilities/identification';

const { BYE, COMPLETED, DOUBLE_WALKOVER, WALKOVER } = matchUpStatusConstants;

export function getRoundMatchUps({
  // participants = [],
  pairedRowNumbers,
  roundNumber,
  isPreRound,
  analysis,
  profile,
  column
}) {
  const isWholeNumber = (num) => num % 1 === 0;
  const getColumn = (column) =>
    analysis.columnProfiles.reduce((columnProfile, currentProfile, index) => {
      return columnProfile || (currentProfile.column === column && { columnProfile: currentProfile, index });
    }, undefined);

  const { columnProfile, index } = getColumn(column);
  const nextColumnProfile = analysis.columnProfiles[index + 1];
  if (!nextColumnProfile) return {};

  const providerBye = profile.matchUpStatuses?.bye || BYE;
  const providerWalkover = profile.matchUpStatuses?.doubleWalkover || WALKOVER;
  const providerDoubleWalkover = profile.matchUpStatuses?.doubleWalkover || DOUBLE_WALKOVER;

  const nextColumnResults = analysis.columnResultValues[nextColumnProfile.column] || [];

  const participantDetails = [];
  const matchUps = [];

  let roundPosition = 1;

  for (const pair of pairedRowNumbers) {
    const { derivedPair, groups } = getDerivedPair({ profile, columnProfile, pair });
    const nextColumnGroupings = getGroupings({ columnProfile: nextColumnProfile });
    const nextColumnRowTarget = Math.abs(derivedPair[1] - derivedPair[0]) / 2 + Math.min(...derivedPair);
    const nextColumnRowNumber = nextColumnGroupings.reduce((rowNumber, grouping) => {
      if (grouping.includes(nextColumnRowTarget)) return grouping[0];
      const currentDiff = rowNumber && Math.abs(rowNumber - nextColumnRowTarget);
      const diff = Math.abs(grouping[0] - nextColumnRowTarget);
      if (diff < 3 && (!currentDiff || diff < currentDiff)) return grouping[0];
      return rowNumber;
    }, 0);

    const { matchUpParticipants, pairParticipantNames } = getMatchUpParticipants({
      roundPosition,
      columnProfile,
      derivedPair,
      roundNumber,
      profile,
      groups
    });

    if (isWholeNumber(nextColumnRowNumber)) {
      const nextColumn = nextColumnProfile.column;
      const nextColumnRef = `${nextColumn}${nextColumnRowNumber}`;
      const refValue = nextColumnProfile.keyMap[nextColumnRef];
      const isDoubleWalkover = refValue?.toString().toLowerCase().trim() === providerDoubleWalkover.toLowerCase();
      const winningParticipantName = isDoubleWalkover ? undefined : refValue;
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

      const resultRow = winningParticipantName ? nextColumnRowNumber + 1 : nextColumnRowNumber;
      // get potential result
      const potentialResult = nextColumnProfile.keyMap[`${nextColumn}${resultRow}`];
      const result = (nextColumnResults.includes(potentialResult) && potentialResult) || undefined;

      const matchUp = { roundNumber, roundPosition, pairParticipantNames };
      if (result) {
        matchUp.result = result;
      }

      const isBye = pairParticipantNames.map((name) => name?.toLowerCase()).includes(providerBye.toLowerCase());

      if (isBye) {
        matchUp.matchUpStatus = BYE;
      } else if (result === providerDoubleWalkover) {
        matchUp.matchUpStatus = DOUBLE_WALKOVER;
      } else if (result === providerWalkover) {
        matchUp.matchUpStatus = DOUBLE_WALKOVER;
        matchUp.winningSide = advancedSide;
      } else if (advancedSide) {
        matchUp.matchUpStatus = COMPLETED;
        matchUp.winningSide = advancedSide;
      }

      if (!result && !isBye) {
        // TODO: in some draws preRound results appear as part of advancedSide participantName
        if (isPreRound) {
          console.log('check for result at end of advancedSide participantName');
        } else if (matchUp.winningSide) {
          // console.log('No win reason', { matchUp });
          console.log('No win reason');
        }
      }

      if (pairParticipantNames.filter(Boolean).length) matchUps.push(matchUp);
    }

    participantDetails.push(...matchUpParticipants);

    roundPosition += 1;
  }

  // console.log(matchUps);
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

function getMatchUpParticipants({ profile, columnProfile, derivedPair, roundPosition }) {
  const matchUpParticipants = [];
  const providerDoubleWalkover = profile.matchUpStatuses?.doubleWalkover || DOUBLE_WALKOVER;

  const pairParticipantNames = derivedPair.map((rowNumber, i) => {
    const ref = `${columnProfile.column}${rowNumber}`;
    const refValue = columnProfile.keyMap[ref];
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

function getGroupings({ columnProfile }) {
  const groupings = [];
  let grouping;
  let current;

  let index = -1;
  for (const row of columnProfile?.rows || []) {
    index += 1;
    const value = columnProfile.values[index];
    if (isNumeric(value)) continue;

    if (row - 1 === current) {
      grouping.push(row);
      current = row;
      continue;
    } else {
      current = row;
      if (grouping) groupings.push(grouping);
      grouping = [current];
      continue;
    }
  }
  if (grouping) groupings.push(grouping);

  return groupings;
}

function getDerivedPair({ profile, columnProfile, pair }) {
  const diff = Math.abs(pair[1] - pair[0]);
  if (diff < 4) return { derivedPair: pair, groups: [[pair[0]], [pair[1]]] };

  const searchOffset = 3;
  const getGroupRange = (group) => {
    const max = Math.max(...group);
    const min = Math.min(...group);
    return utilities.generateRange(min - searchOffset, max + searchOffset);
  };

  const groups = [];
  const groupings = getGroupings({ profile, columnProfile });
  const derivedPair = pair.map((rowNumber) => {
    const group = groupings.find((group) => getGroupRange(group).includes(rowNumber));
    if (group) groups.push(group);
    return group?.[0];
  });

  return { derivedPair, groups };
}
