import { getNonBracketedValue, removeChars, tidyLower, tidyValue } from '../utilities/convenience';
import { matchUpStatusConstants, mocksEngine } from 'tods-competition-factory';
import { getMatchUpParticipants } from './getMatchUpParticipants';
import { getDerivedPair, getGroupings } from './columnUtilities';
import { getPotentialResult } from '../utilities/identification';
import { generateMatchUpId } from '../utilities/hashing';
import { pushGlobalLog } from '../utilities/globalLog';
import { getAdvancedSide } from './getAdvancedSide';
import { getLoggingActive } from '../global/state';
import { normalizeScore } from './cleanScore';
import { tidyScore } from './scoreParser';

const { BYE, COMPLETED, DOUBLE_WALKOVER, WALKOVER } = matchUpStatusConstants;

export function getRoundMatchUps({
  roundParticipants, // if roundParticipants are provided then they are not sought in column
  pairedRowNumbers,
  resultColumns,
  resultColumn,
  roundColumns,
  columnIndex,
  roundNumber,
  nextColumn,
  isPreRound,
  analysis,
  profile,
  column
}) {
  const isWholeNumber = (num) => num % 1 === 0;
  const getColumn = (column) =>
    analysis.columnProfiles.filter(Boolean).reduce((columnProfile, currentProfile, index) => {
      return columnProfile || (currentProfile.column === column && { columnProfile: currentProfile, index });
    }, undefined);

  const logging = getLoggingActive('dev');
  const finalRound = pairedRowNumbers.length === 1;

  const { columnProfile } = getColumn(column);
  let { columnProfile: nextColumnProfile } = getColumn(nextColumn);
  let resultColumnProfile = resultColumn ? getColumn(resultColumn).columnProfile : nextColumnProfile;

  if (!nextColumnProfile) {
    const priorResultColumn = columnIndex && resultColumns?.[columnIndex - 1];

    if (priorResultColumn && finalRound) {
      resultColumnProfile = getColumn(priorResultColumn).columnProfile;
      nextColumnProfile = columnProfile;
    } else if (finalRound) {
      resultColumnProfile = columnProfile;
      nextColumnProfile = columnProfile;
    } else {
      return {};
    }
  }

  const providerBye = tidyLower(profile.matchUpStatuses?.bye || BYE);
  const providerWalkover = tidyLower(profile.matchUpStatuses?.walkover || WALKOVER);
  const providerDoubleWalkover = tidyLower(profile.matchUpStatuses?.doubleWalkover || DOUBLE_WALKOVER);

  const advancingParticipants = [];
  const participantDetails = [];
  const matchUps = [];

  let roundPosition = 1;

  for (const pair of pairedRowNumbers) {
    const { derivedPair, groups } = getDerivedPair({ profile, columnProfile, pair });
    const nextColumnGroupings = getGroupings({ columnProfile: nextColumnProfile });
    const nextColumnRowTarget = Math.abs(derivedPair[1] - derivedPair[0]) / 2 + Math.min(...derivedPair);
    const minRow = Math.min(...pair, ...derivedPair);
    const maxRow = Math.max(...pair, ...derivedPair);
    const inRowRange = (grouping) => grouping.filter((value) => value >= minRow && value <= maxRow);
    const filteredGroupings = nextColumnGroupings.map(inRowRange).filter((grouping) => grouping.length);
    const nextColumnRowNumber = filteredGroupings.reduce((rowNumber, grouping) => {
      // TODO: instead of grouping[0] select value that is like a participantName, not like a score
      if (grouping.includes(nextColumnRowTarget)) return grouping[0];
      const currentDiff = rowNumber && Math.abs(rowNumber - nextColumnRowTarget);
      const diff = Math.abs(grouping[0] - nextColumnRowTarget);
      if (diff < 3 && (!currentDiff || diff < currentDiff)) return grouping[0];
      return rowNumber;
    }, 0);

    let consideredParticipants = roundParticipants?.[roundPosition - 1];
    let pairParticipantNames = consideredParticipants?.map(({ participantName }) => participantName);

    if (!consideredParticipants?.length) {
      console.log('Missing Participants', { pair, column, columnIndex }, analysis.sheetName);
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
      let advancingParticipantName = isDoubleWalkover ? undefined : getNonBracketedValue(refValue);

      const { leader, potentialResult } = getPotentialResult(advancingParticipantName);
      if (potentialResult && leader) {
        advancingParticipantName = leader;
        const message = 'result found at end of advancedSide participantName';
        pushGlobalLog({
          method: 'notice',
          color: 'brightyellow',
          keyColors: { message: 'cyan', attributes: 'brightyellow' },
          message
        });
      }

      const advancedSide = getAdvancedSide({
        advancingParticipantName,
        consideredParticipants,
        pairParticipantNames,
        roundPosition,
        roundNumber,
        analysis,
        profile
      })?.advancedSide;

      if (advancedSide) {
        consideredParticipants[advancedSide - 1].advancedParticipantName =
          getNonBracketedValue(advancingParticipantName);
        consideredParticipants[advancedSide - 1].advancedPositionRef = nextColumnRef;

        if (roundParticipants?.length) {
          advancingParticipants.push(consideredParticipants[advancedSide - 1]);
        }
      } else {
        advancingParticipants.push({});
      }

      const getResult = (resultColumn) => {
        const targetProfile = analysis.columnProfiles.find((cp) => cp.column === resultColumn);
        const potentialResult = targetProfile && tidyValue(targetProfile.keyMap[`${resultColumn}${resultRow}`]);
        const resultColumnResults = analysis.columnResultValues[resultColumn] || [];
        const result =
          ((resultColumn || resultColumnResults.includes(potentialResult)) && potentialResult) || undefined;
        return result;
      };

      const resultRow = advancingParticipantName ? nextColumnRowNumber + 1 : nextColumnRowNumber || nextColumnRowTarget;
      const resultColumn = resultColumnProfile?.column;
      let result = getResult(resultColumn) || potentialResult;

      const matchUp = { roundNumber, roundPosition, drawPositions, pairParticipantNames };

      if (!result && finalRound && !resultColumns && roundColumns) {
        const previousColumn = roundColumns[roundColumns.indexOf(resultColumn) - 1];
        result = getResult(previousColumn);
      }

      if (result) {
        matchUp.result = result;
      } else {
        const inColumnResult = tidyValue(columnProfile?.keyMap[`${column}${resultRow}`]);
        const inColumnResults = analysis.columnResultValues[column] || [];
        if (inColumnResult && inColumnResults.includes(inColumnResult)) console.log({ inColumnResult });
      }

      const lowerResult = result && removeChars(tidyLower(result), ['/', '-', '.']);

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
      } else {
        // console.log('SOMETHING', { lowerResult, roundNumber, roundPosition });
      }

      if (matchUp.winningSide && result && ![WALKOVER, DOUBLE_WALKOVER].includes(matchUp.matchUpStatus)) {
        const sideString = matchUp.winningSide === 2 ? 'scoreStringSide2' : 'scoreStringSide1';
        matchUp.score = { [sideString]: result };
        const { normalized: scoreString, matchUpStatus } = normalizeScore(tidyScore(result));
        if (matchUpStatus && !matchUp.matchUpStatus) matchUp.matchUpStatus = matchUpStatus;
        const { outcome } = mocksEngine.generateOutcomeFromScoreString({
          winningSide: matchUp.winningSide,
          scoreString
        });
        const stringScore = !outcome?.score?.scoreStringSide1 ? { [sideString]: result } : undefined;
        const score = { ...outcome?.score, ...stringScore };
        matchUp.score = score;
        if (getLoggingActive('scores')) console.log({ result, scoreString, outcome, score });
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
          if (logging) console.log('No win reason', { resultRow, resultColumn });
        }
      }

      if (pairParticipantNames.filter(Boolean).length) {
        const additionalAttributes = [
          matchUp.drawPositions.reduce((a, b) => a || 0 + b || 0, 0),
          roundNumber,
          roundPosition
        ];
        const result = generateMatchUpId({ participantNames: pairParticipantNames, additionalAttributes });
        matchUp.matchUpId = result.matchUpId;
        if (result.error) console.log({ error: result.error, matchUp });
        matchUps.push(matchUp);
      }
    }

    if (!roundParticipants?.length) participantDetails.push(...consideredParticipants);

    roundPosition += 1;
  }

  if (getLoggingActive('matchUps')) {
    console.log(matchUps);
  }
  if (getLoggingActive('missing')) {
    const missingDrawPosition = matchUps.filter((m) => !m.drawPositions || m.drawPositions.length < 2);
    if (missingDrawPosition.length) console.log(missingDrawPosition);
  }
  return { matchUps, participantDetails, advancingParticipants };
}
