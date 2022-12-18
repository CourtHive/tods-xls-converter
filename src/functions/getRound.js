import { matchUpStatusConstants, mocksEngine, utilities } from 'tods-competition-factory';
import { getPotentialResult } from '../utilities/identification';
import { audit, getLoggingActive } from '../global/state';
import { generateMatchUpId } from '../utilities/hashing';
import { getAdvanceTargets } from './getAdvanceTargets';
import { pushGlobalLog } from '../utilities/globalLog';
import { tidyLower } from '../utilities/convenience';
import { normalizeScore } from './cleanScore';
import { tidyScore } from './scoreParser';
import { getRow } from './sheetAccess';

const { BYE, COMPLETED, DOUBLE_WALKOVER, WALKOVER } = matchUpStatusConstants;

export function getRound({
  subsequentColumnLimit,
  confidenceThreshold,
  positionProgression,
  roundParticipants,
  pairedRowNumbers,
  roundColumns,
  columnIndex,
  roundNumber,
  isPreRound,
  analysis,
  profile
}) {
  const finalRound = pairedRowNumbers.length === 1;
  const finalMatchUp = finalRound && columnIndex + 1 === roundColumns.length;

  let columnsConsumed = 0; // additional columns processed (when result data spans multiple columns)

  const providerWalkover = tidyLower(profile.matchUpStatuses?.walkover || WALKOVER);
  const providerDoubleWalkover = tidyLower(profile.matchUpStatuses?.doubleWalkover || DOUBLE_WALKOVER);

  const advancingParticipants = [];
  const participantDetails = [];
  const matchUps = [];

  const relevantSubsequentColumns = roundColumns.slice(columnIndex + 1).slice(0, subsequentColumnLimit);

  const prospectiveResults = finalRound || relevantSubsequentColumns.length;

  if (prospectiveResults) {
    // -------------------------------------------------------------------------------------------------
    // ACTION: pre-process subsequent column values to determine if any results are combined with advancing participant
    // TODO: consider proactively characterizing all values to facilitate meta analysis before pulling values
    const potentialResults = [];
    let columnValues = pairedRowNumbers.map((pair) => {
      const rowRange = utilities.generateRange(pair[0], pair[1] + 1);
      let pv = relevantSubsequentColumns.map((relevantColumn) => {
        const keyMap = analysis.columnProfiles.find(({ column }) => column === relevantColumn).keyMap;
        return Object.keys(keyMap)
          .filter((key) => rowRange.includes(getRow(key)))
          .map((key) => keyMap[key]);
      });

      const pr = pv[0]
        ?.map((value) => {
          const { leader, potentialResult } = getPotentialResult(value);

          return leader && potentialResult;
        })
        .filter(Boolean);
      if (pr?.length) potentialResults.push(pr);

      return pv;
    });

    if (potentialResults.length > 1) {
      // IF: there are participantNames combined with results
      // THEN: limit the column look ahead to only one subsequent column
      columnValues = columnValues.map((c) => c.slice(0, 1));

      const message = `participantName (result) { roundNumber: ${roundNumber} }`;
      pushGlobalLog({
        method: 'notice',
        color: 'brightyellow',
        keyColors: { message: 'cyan', attributes: 'brightyellow' },
        message
      });
    }
    // -------------------------------------------------------------------------------------------------

    // -------------------------------------------------------------------------------------------------
    // ACTION: process all roundPositions
    pairedRowNumbers.forEach((_, pairIndex) => {
      const consideredParticipants = roundParticipants?.[pairIndex];
      if (!consideredParticipants) return;

      const isBye = consideredParticipants?.find(({ isByePosition }) => isByePosition);
      let potentialValues = columnValues[pairIndex];

      let advancedSide, result;

      const roundPosition = pairIndex + 1;
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      // ACTION: if column contains one matchUp (final) then consider value may occur in prior or current colummn
      if (finalMatchUp) {
        const relevantColumns = roundColumns.slice(columnIndex - 1).reverse();
        potentialValues = relevantColumns.map((relevantColumn, relevantIndex) => {
          const relevantProgression = positionProgression[positionProgression.length - relevantIndex - 1].flat();
          const pairCount = relevantProgression.length / 2;
          const relevantPair = relevantProgression.slice(pairCount - 1, pairCount + 1);
          const pairRange = utilities.generateRange(relevantPair[0] + 3, relevantPair[1] + 1 - 3);
          const keyMap = analysis.columnProfiles.find(({ column }) => column === relevantColumn).keyMap;

          return Object.keys(keyMap)
            .filter((key) => pairRange.includes(getRow(key)))
            .map((key) => keyMap[key]);
        });
      }
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

      const advanceTargets = getAdvanceTargets({
        providerDoubleWalkover,
        consideredParticipants,
        confidenceThreshold,
        providerWalkover,
        potentialValues,
        roundPosition,
        roundNumber,
        profile
      });
      if (advanceTargets.columnsConsumed > columnsConsumed) columnsConsumed = advanceTargets.columnsConsumed;

      ({ advancedSide, result } = advanceTargets);

      if (finalMatchUp && (!advancedSide || !result)) {
        // console.log({ finalRound, consideredParticipants, potentialValues });
        // console.log({ finalMatchUp }, 'No Result');
        // console.log({ sheetName: analysis.sheetName, pairedRowNumbers, potentialValues });
      }

      if (advancedSide) {
        if (roundParticipants?.length) {
          const advancingParticipant = consideredParticipants[advancedSide - 1];
          advancingParticipants.push(advancingParticipant);
        }
      } else {
        advancingParticipants.push({});
      }

      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      // ACTION: construct matchUp object; determine matchUpStatus and winningSide
      const drawPositions = consideredParticipants?.map(({ drawPosition }) => drawPosition).filter(Boolean);
      const matchUp = { roundNumber, roundPosition, drawPositions };

      if (isBye) {
        matchUp.matchUpStatus = BYE;
      } else if (result === providerDoubleWalkover) {
        matchUp.matchUpStatus = DOUBLE_WALKOVER;
      } else if (result === providerWalkover || result === WALKOVER) {
        matchUp.matchUpStatus = WALKOVER;
        matchUp.winningSide = advancedSide;
      } else if (advancedSide) {
        matchUp.matchUpStatus = COMPLETED;
        matchUp.winningSide = advancedSide;
      } else {
        // console.log('SOMETHING', { lowerResult, roundNumber, roundPosition });
      }
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      // IF: a result exists and the matchUpStatus is NOT a WALKOVER
      // THEN: parse the result to create a TODS score object
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
        if (getLoggingActive('score-audit')) audit({ result, scoreString });
        if (getLoggingActive('scores')) console.log({ result, scoreString, outcome, score });
      }
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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
          // if (logging) console.log('No win reason', { resultRow, resultColumn });
        }
      }

      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      // ACTION: if matchUp contains participant names, generate matchUpId and push matchUp
      let pairedParticipantNames = consideredParticipants?.map(({ participantName }) => participantName);
      if (pairedParticipantNames?.filter(Boolean).length) {
        const additionalAttributes = [
          matchUp.drawPositions.reduce((a, b) => a || 0 + b || 0, 0),
          roundPosition,
          roundNumber
        ];
        const result = generateMatchUpId({ participantNames: pairedParticipantNames, additionalAttributes });
        matchUp.matchUpId = result.matchUpId;
        if (result.error) console.log({ error: result.error, matchUp });
        matchUps.push(matchUp);
      }
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    });
    // -------------------------------------------------------------------------------------------------
  }

  if (getLoggingActive('matchUps')) {
    console.log(matchUps);
  }
  if (getLoggingActive('missing')) {
    const missingDrawPosition = matchUps.filter((m) => !m.drawPositions || m.drawPositions.length < 2);
    if (missingDrawPosition.length) console.log(missingDrawPosition);
  }

  return { matchUps, participantDetails, advancingParticipants, columnsConsumed };
}
