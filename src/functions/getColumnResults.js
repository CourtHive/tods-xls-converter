import { getNonBracketedValue, tidyValue, withoutQualifyingDesignator } from '../utilities/convenience';
import { getPotentialResult, isScoreLike } from '../utilities/identification';
import { pushGlobalLog } from '../utilities/globalLog';
import { getLoggingActive } from '../global/state';
import { fuzzy } from 'fast-fuzzy';

const joiners = ['-', '/'];

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
          const { participantName, person, individualParticipants } = participant;

          let pValues = [participantName];
          if (person) {
            const { standardFamilyName, standardGivenName } = person;
            pValues.push(standardFamilyName, standardGivenName);
            // handle multiple last names where only one of the last names is progressed
            const splitFamilyName = standardFamilyName.split(' ');
            if (splitFamilyName !== standardFamilyName) pValues.push(...splitFamilyName);
          }
          const doublesFirstNames = [];
          const doublesLastNames = [];
          individualParticipants?.forEach(({ person }) => {
            if (person) {
              const { standardFamilyName, standardGivenName } = person;
              doublesFirstNames.push(standardGivenName?.toLowerCase());
              doublesLastNames.push(standardFamilyName?.toLowerCase());

              pValues.push(standardFamilyName);
              // handle multiple last names where only one of the last names is progressed
              const splitFamilyName = standardFamilyName.split(' ');
              if (splitFamilyName !== standardFamilyName) pValues.push(...splitFamilyName);
            }
          });

          // for those rare occations where first names are advanced rather than last names
          if (doublesFirstNames.length > 1) {
            const combinations = joiners.flatMap((joiner) => doublesFirstNames.join(joiner));
            pValues.push(...combinations);
          }

          const pRank = pValues.reduce(
            (result, v) => {
              const confidence = v ? fuzzy(v, value.toString()) : 0;
              return confidence > confidenceThreshold && confidence > result.confidence
                ? { confidence, match: v }
                : result;
            },
            { confidence: 0 }
          );

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
