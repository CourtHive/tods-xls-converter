import { getNonBracketedValue, tidyValue, withoutQualifyingDesignator } from '../utilities/convenience';
import { getPotentialResult, isScoreLike } from '../utilities/identification';
import { pushGlobalLog } from '../utilities/globalLog';
import { fuzzy } from 'fast-fuzzy';

export function getAdvanceTargets({
  confidenceThreshold = 0.7,
  consideredParticipants,
  providerDoubleWalkover,
  providerWalkover,
  potentialValues,
  roundPosition, // useful for debugging
  roundNumber, // useful for debugging
  profile
}) {
  roundNumber && roundPosition;
  const qualifyingIdentifiers = profile.qualifyingIdentifiers?.map((identifier) => identifier.toString().toLowerCase());
  let columnsConsumed;

  const byeAdvancement = consideredParticipants?.some((participant) => participant.isByePosition);
  if (byeAdvancement) {
    const advancedSide = consideredParticipants?.reduce((sideNumber, participant, index) => {
      if (!participant.isByePosition) return index + 1;
      return sideNumber;
    }, {});
    return { advancedSide, confidence: 1 };
  }

  if (!potentialValues) return {};

  let isDoubleWalkover;

  const isLikeResult = (value) => {
    if (qualifyingIdentifiers?.includes(value)) return false;
    const result = isDoubleWalkover || [providerWalkover, 'retiro', 'retired'].includes(tidyValue(value));
    return result;
  };
  const isLikeScore = (value) => isScoreLike(value) || isLikeResult(value);

  const characterizeValue = (value) => {
    value = withoutQualifyingDesignator(value?.toString().toLowerCase(), qualifyingIdentifiers);
    const { leader, potentialResult } = getPotentialResult(value);
    if (potentialResult && leader) {
      value = leader;
      const message = 'result found at end of advancedSide participantName';
      pushGlobalLog({
        method: 'notice',
        color: 'brightyellow',
        keyColors: { message: 'cyan', attributes: 'brightyellow' },
        message
      });
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
          individualParticipants?.forEach(({ person }) => {
            if (person) {
              pValues.push(person.standardFamilyName);
              // handle multiple last names where only one of the last names is progressed
              const splitFamilyName = person.standardFamilyName.split(' ');
              if (splitFamilyName !== person.standardFamilyName) pValues.push(...splitFamilyName);
            }
          });

          const pRank = pValues.reduce(
            (result, v) => {
              const confidence = fuzzy(v || '', value.toString());
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

    return { value, scoreLike, side };
  };

  const characterizeColumn = (values) => values.map(characterizeValue);

  // potentialValues is an array of columns each with array of columnValues
  const columnResults = potentialValues.map(characterizeColumn);

  let side, result;
  columnResults.forEach((columnResult, columnResultIndex) => {
    const results = columnResult.filter(({ scoreLike }) => scoreLike).map(({ value }) => value);
    if (results.length > 1) {
      console.log('MULTIPLE RESULTS');
      results.map((result) =>
        console.log({ result, isLikeScore: isLikeScore(result), isScoreLike: isScoreLike(result) })
      );
    } else if (results.length) {
      if (!result) {
        if (columnResultIndex) {
          columnsConsumed = columnResultIndex;
        }
        result = results[0];
      }
    }
    const sideMatches = columnResult
      .filter(({ side }) => side?.confidence)
      .map(({ side, value }) => ({ ...side, value }));
    const bestSideMatch = sideMatches.reduce((best, side) => (side.confidence > best.confidence ? side : best), {
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

  const advancedSide = side?.confidence && side.sideNumber;

  return { advancedSide, side, result, columnsConsumed };
}