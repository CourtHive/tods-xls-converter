import { getNonBracketedValue, tidyValue, withoutQualifyingDesignator } from '../utilities/convenience';
import { getPotentialResult, isScoreLike } from '../utilities/identification';
import { getParticipantValues } from './getParticipantValues';
import { pushGlobalLog } from '../utilities/globalLog';
import { getLoggingActive } from '../global/state';
import { pRankReducer } from './pRankReducer';

export function getColumnResults({
  confidenceThreshold = 0.7,
  consideredParticipants,
  providerDoubleWalkover,
  providerWalkover,
  potentialValues,
  roundPosition, // useful for debugging
  roundNumber, // useful for debugging
  profile
}) {
  let isDoubleWalkover;

  const qualifyingIdentifiers = profile.qualifyingIdentifiers?.map((identifier) => identifier.toString().toLowerCase());
  const isLikeResult = (value) => {
    if (qualifyingIdentifiers?.includes(value)) return false;
    const result =
      isDoubleWalkover || ['w/o', 'walkover', providerWalkover, 'retiro', 'retired'].includes(tidyValue(value));
    return result;
  };
  const isLikeScore = (value) => isScoreLike(value) || isLikeResult(value);

  const characterizeValue = (value) => {
    value = withoutQualifyingDesignator(value?.toString().toLowerCase(), qualifyingIdentifiers);
    const { leader, potentialResult } = getPotentialResult(value);
    if (potentialResult && leader) {
      value = leader;

      if (getLoggingActive('potentialResults')) {
        const message = `participantName (result) ${roundNumber}-${roundPosition}: ${potentialResult}`;
        pushGlobalLog({
          method: 'notice',
          color: 'brightyellow',
          keyColors: { message: 'cyan', attributes: 'brightyellow' },
          message
        });
      }
    }

    value = getNonBracketedValue(value) || '';
    isDoubleWalkover = isDoubleWalkover || value === providerDoubleWalkover.toLowerCase();

    const sideWeights = !isDoubleWalkover
      ? consideredParticipants?.map((participant, index) => {
          const pValues = getParticipantValues(participant, roundNumber, roundPosition);
          const pRank = pRankReducer({ pValues, value, confidenceThreshold });

          return { sideNumber: index + 1, ...pRank };
        })
      : undefined;

    const side = sideWeights?.reduce((side, weight) => (weight.confidence > side.confidence ? weight : side), {
      confidence: 0
    });

    const scoreLike = isLikeScore(value);

    return { value, scoreLike, side, potentialResult };
  };

  const characterizeColumn = (values) => values.map(characterizeValue);

  // potentialValues is an array of columns each with array of columnValues
  const columnResults = potentialValues.map(characterizeColumn);

  return { columnResults, isLikeScore };
}
