import { getNonBracketedValue, tidyValue, withoutQualifyingDesignator } from '../utilities/convenience';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { getMatchUpParticipants } from './getMatchUpParticipants';
import { getDerivedPair, getGroupings } from './columnUtilities';
import { isString } from '../utilities/identification';
import { pushGlobalLog } from '../utilities/globalLog';
import { getLoggingActive } from '../global/state';

const { BYE, COMPLETED, DOUBLE_WALKOVER, WALKOVER } = matchUpStatusConstants;

export function getRoundMatchUps({
  roundParticipants, // if roundParticipants are provided then they are not sought in column
  pairedRowNumbers,
  resultColumn,
  roundNumber,
  nextColumn,
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

  const { columnProfile } = getColumn(column);
  const { columnProfile: nextColumnProfile } = getColumn(nextColumn);
  const resultColumnProfile = resultColumn ? getColumn(resultColumn).columnProfile : nextColumnProfile;
  if (!nextColumnProfile) return {};

  const providerBye = profile.matchUpStatuses?.bye || BYE;
  const providerWalkover = profile.matchUpStatuses?.walkover || WALKOVER;
  const providerDoubleWalkover = profile.matchUpStatuses?.doubleWalkover || DOUBLE_WALKOVER;

  const advancingParticipants = [];
  const participantDetails = [];
  const matchUps = [];

  const logging = getLoggingActive('dev');

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

    let consideredParticipants = roundParticipants?.[roundPosition - 1];
    let pairParticipantNames = consideredParticipants?.map(({ participantName }) => participantName);

    if (!consideredParticipants?.length) {
      const result = getMatchUpParticipants({
        roundPosition,
        columnProfile,
        derivedPair,
        roundNumber,
        profile,
        groups
      });
      pairParticipantNames = result.pairParticipantNames;
      consideredParticipants = result.matchUpParticipants;
    }

    const drawPositions = consideredParticipants.map(({ drawPosition }) => drawPosition).filter(Boolean);

    if (isWholeNumber(nextColumnRowNumber)) {
      const isBye =
        consideredParticipants.find(({ isByePosition }) => isByePosition) ||
        pairParticipantNames.map((name) => name?.toLowerCase()).includes(providerBye.toLowerCase());

      const nextColumn = nextColumnProfile.column;
      const nextColumnRef = `${nextColumn}${nextColumnRowNumber}`;
      const refValue = nextColumnProfile.keyMap[nextColumnRef];
      const isDoubleWalkover = refValue?.toString().toLowerCase().trim() === providerDoubleWalkover.toLowerCase();
      const winningParticipantName = isDoubleWalkover ? undefined : refValue;

      const advancedSide = getAdvancedSide({
        consideredParticipants,
        winningParticipantName,
        pairParticipantNames,
        analysis,
        profile
      })?.advancedSide;

      if (advancedSide) {
        consideredParticipants[advancedSide - 1].advancedParticipantName = winningParticipantName;
        consideredParticipants[advancedSide - 1].advancedPositionRef = nextColumnRef;

        if (roundParticipants?.length) {
          if (advancedSide) {
            advancingParticipants.push(consideredParticipants[advancedSide - 1]);
          } else {
            advancingParticipants.push({});
          }
        }
      }

      const resultRow = winningParticipantName ? nextColumnRowNumber + 1 : nextColumnRowNumber;
      // get potential result
      const resultColumn = resultColumnProfile?.column;
      const potentialResult =
        resultColumnProfile && tidyValue(resultColumnProfile.keyMap[`${resultColumn}${resultRow}`]);
      const resultColumnResults = analysis.columnResultValues[resultColumn] || [];
      const result = ((resultColumn || resultColumnResults.includes(potentialResult)) && potentialResult) || undefined;

      const matchUp = { roundNumber, roundPosition, drawPositions, pairParticipantNames };
      if (result) {
        matchUp.result = result;
      }

      const lowerResult = isString(result) ? result.toLowerCase() : result;

      if (isBye) {
        matchUp.matchUpStatus = BYE;
      } else if (lowerResult === providerDoubleWalkover) {
        matchUp.matchUpStatus = DOUBLE_WALKOVER;
      } else if (lowerResult === providerWalkover) {
        matchUp.matchUpStatus = WALKOVER;
        matchUp.winningSide = advancedSide;
      } else if (advancedSide) {
        matchUp.matchUpStatus = COMPLETED;
        matchUp.winningSide = advancedSide;
      }

      if (!result && !isBye) {
        // TODO: in some draws preRound results appear as part of advancedSide participantName
        if (isPreRound) {
          const message = 'check for result at end of advancedSide participantName';
          pushGlobalLog({
            method: 'notice',
            color: 'brightyellow',
            keyColors: { message: 'cyan', attributes: 'brightyellow' },
            message
          });
        } else if (matchUp.winningSide) {
          if (logging) console.log('No win reason');
        }
      }

      if (pairParticipantNames.filter(Boolean).length) matchUps.push(matchUp);
    }

    if (!roundParticipants?.length) participantDetails.push(...consideredParticipants);

    roundPosition += 1;
  }

  if (getLoggingActive('matchUps')) console.log(matchUps);
  return { matchUps, participantDetails, advancingParticipants };
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
