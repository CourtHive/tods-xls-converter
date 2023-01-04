import { getParticipantValues } from './getParticipantValues';
import { isScoreLike } from '../utilities/identification';
import { pushGlobalLog } from '../utilities/globalLog';
import { getColumnResults } from './getColumnResults';
import { getLoggingActive } from '../global/state';

export function getAdvanceTargets(params) {
  let columnsConsumed;

  const { consideredParticipants, potentialValues, roundNumber, roundPosition } = params;

  // if no potentialValues have been provided, return
  if (!potentialValues) return {};

  const advanceLogging = getLoggingActive('advanceTargets');
  const positionOfInterest = advanceLogging?.roundPositions?.includes(roundPosition);
  const roundOfInterest = advanceLogging?.roundNumbers?.includes(roundNumber);

  const log =
    ((positionOfInterest && roundOfInterest) ||
      (!advanceLogging?.roundPositions?.length && positionOfInterest) ||
      (!advanceLogging?.roundNumbers?.length && roundOfInterest)) &&
    advanceLogging;

  if (log?.potentialValues) console.log(potentialValues);
  const byeAdvancement = consideredParticipants?.some((participant) => participant.isByePosition);

  // process all of the potentialValues (potentially multiple columns)
  const { columnResults, isLikeScore } = getColumnResults({ ...params, log });

  // -------------------------------------------------------------------------------------------------
  // ACTION: search for viable side and result detail in the columnResults
  let side, result;
  columnResults.forEach((columnResult, columnResultIndex) => {
    const results = columnResult.filter(({ scoreLike }) => scoreLike).map(({ value }) => value);
    const potentialResults = columnResult.map(({ potentialResult }) => potentialResult);

    if (results.length > 1) {
      const message = `Multiple Results, roundNumber: ${params.roundNumber}`;
      pushGlobalLog({
        method: 'notice',
        color: 'brightyellow',
        keyColors: { message: 'yellow', attributes: 'brightyellow' },
        message
      });
      if (getLoggingActive('multipleResults')) {
        results.map((result, i) =>
          console.log({
            roundNumber,
            roundPosition,
            result,
            isLikeScore: isLikeScore(result),
            isScoreLike: isScoreLike(result),
            i
          })
        );
      }
    } else if (results.length) {
      if (!result) {
        if (columnResultIndex && !byeAdvancement) {
          columnsConsumed = columnResultIndex;
        }
        result = results[0];
      }
    } else if (potentialResults.length) {
      if (potentialResults[0]) result = potentialResults[0];
    }

    const sideMatches = columnResult
      .map((result) => {
        result.side.columnIndex = columnResultIndex;
        return result;
      })
      .filter(({ side }) => side?.confidence)
      .map(({ side, value }) => ({ ...side, value }));

    const bestSideMatch = sideMatches.reduce((best, side) => (side.confidence > best.confidence ? { ...side } : best), {
      confidence: 0
    });

    if (bestSideMatch) {
      if (!side || bestSideMatch.confidence > side.confidence) {
        if (columnResultIndex) {
          columnsConsumed = columnResultIndex;
        }
        side = bestSideMatch;
      }
    }
  });
  // -------------------------------------------------------------------------------------------------

  // -------------------------------------------------------------------------------------------------
  // ACTION: check to see whether one of the advanced sides is a BYE
  // POSSIBILITY: checking for BYE after checking for sides with results to provide error checking
  if (byeAdvancement) {
    const advancedSide = consideredParticipants?.reduce((sideNumber, participant, index) => {
      if (!participant.isByePosition) return index + 1;
      return sideNumber;
    }, {});

    return { columnsConsumed, advancedSide, confidence: 1 };
  }
  // -------------------------------------------------------------------------------------------------

  // -------------------------------------------------------------------------------------------------
  // IF: a result was found but no side has been identified and there are two participants to consider
  // THEN: compare the potential values to the participants looking for a match
  // WHERE: the participant name starts with a potential value
  if (result && !side.confidence && consideredParticipants.length === 2) {
    const consideredPotentialValues = potentialValues
      .flat()
      .filter((value) => value.toString().length >= 4)
      .map((value) => value.toString().toLowerCase());

    let match, sideNumber;

    const sideStartsWith = consideredParticipants.find((participant, pIndex) => {
      const pValues = getParticipantValues(participant);

      const matchFound = pValues.find((pValue) =>
        consideredPotentialValues.flat().some((value) => {
          const matchFound = pValue.startsWith(value);
          if (matchFound) match = value;
          return matchFound;
        })
      );

      if (matchFound) sideNumber = pIndex + 1;

      return matchFound;
    });

    if (sideStartsWith) {
      const message = `sideStartsWith: ${sideStartsWith.participantName} ${params.roundNumber} ${params.roundPosition}`;
      pushGlobalLog({
        method: 'notice',
        color: 'brightyellow',
        keyColors: { message: 'cyan', attributes: 'brightyellow' },
        message
      });
      side = { match, sideNumber, confidence: 0.7 };
    }
  }
  // -------------------------------------------------------------------------------------------------

  const advancedSide = side?.confidence && side.sideNumber;

  return { advancedSide, side, result, columnsConsumed };
}
