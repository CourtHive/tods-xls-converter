import { getNonBracketedValue, tidyValue, withoutQualifyingDesignator } from '../utilities/convenience';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { fuzzy } from 'fast-fuzzy';

const { BYE } = matchUpStatusConstants;

export function getAdvancedSide({
  consideredParticipants,
  winningParticipantName,
  pairParticipantNames,
  // roundPosition, // useful for debugging
  // roundNumber, // useful for debugging
  analysis,
  profile
}) {
  const byeAdvancement =
    consideredParticipants?.some((participant) => participant.isByePosition) || pairParticipantNames.includes(BYE);
  if (byeAdvancement) {
    const advancedSide =
      consideredParticipants?.reduce((sideNumber, participant, index) => {
        if (!participant.isByePosition) return index + 1;
        return sideNumber;
      }, {}) ||
      (pairParticipantNames && pairParticipantNames.indexOf(BYE) + 1);
    return { advancedSide };
  }

  if (!winningParticipantName) return {};

  const { qualifyingIdentifiers } = profile;
  let tidyFirstNames;

  const splitTidy = (name) =>
    name?.split('-').map(tidyValue).join('|').split('/').map(tidyValue).join('|').split(',').map(tidyValue).join('|');

  if (analysis.isDoubles) {
    winningParticipantName = splitTidy(winningParticipantName);
    pairParticipantNames = consideredParticipants.map((participant) => {
      if (participant.individualParticipants) {
        return participant.individualParticipants.map((participant) => participant.person.standardFamilyName).join('|');
      } else {
        return splitTidy(participant.participantName);
      }
    });

    tidyFirstNames = consideredParticipants.map((participant) => {
      if (participant.individualParticipants) {
        return participant.individualParticipants.map((participant) => participant.person.standardGivenName).join('|');
      } else {
        return splitTidy(participant.participantName);
      }
    });
  }

  const tidyLastNames = pairParticipantNames.map((name) => {
    const withoutSeeding = getNonBracketedValue(name);
    return withoutQualifyingDesignator(withoutSeeding, qualifyingIdentifiers);
  });
  const nonBracketedWinningParticipantName = getNonBracketedValue(winningParticipantName);

  const exactMatchSide = tidyLastNames.reduce((side, participantName, i) => {
    const condition = participantName === nonBracketedWinningParticipantName;
    if (condition) {
      return { advancedSide: i + 1, participantName };
    } else {
      return side;
    }
  }, {});
  if (exactMatchSide?.advancedSide) return exactMatchSide;

  if (tidyFirstNames) {
    const exactMatchSide = tidyFirstNames.reduce((side, participantName, i) => {
      const condition = participantName === nonBracketedWinningParticipantName;
      if (condition) {
        return { advancedSide: i + 1, participantName };
      } else {
        return side;
      }
    }, {});
    if (exactMatchSide?.advancedSide) return exactMatchSide;
  }

  const startsWithSide = tidyLastNames.reduce((side, participantName, i) => {
    const condition = participantName?.startsWith(nonBracketedWinningParticipantName);
    if (condition) {
      return { advancedSide: i + 1, participantName };
    } else {
      return side;
    }
  }, {});
  if (startsWithSide?.advancedSide) return startsWithSide;

  if (tidyFirstNames) {
    const startsWithSide = tidyFirstNames.reduce((side, participantName, i) => {
      const condition = participantName?.startsWith(nonBracketedWinningParticipantName);
      if (condition) {
        return { advancedSide: i + 1, participantName };
      } else {
        return side;
      }
    }, {});
    if (startsWithSide?.advancedSide) return startsWithSide;
  }

  const includesSide = tidyLastNames.reduce((side, participantName, i) => {
    const condition = participantName?.includes(nonBracketedWinningParticipantName);
    if (condition) {
      return { advancedSide: i + 1, participantName };
    } else {
      return side;
    }
  }, {});

  if (includesSide?.advancedSide) return includesSide || {};

  if (tidyFirstNames) {
    const includesSide = tidyFirstNames.reduce((side, participantName, i) => {
      const condition = participantName?.includes(nonBracketedWinningParticipantName);
      if (condition) {
        return { advancedSide: i + 1, participantName };
      } else {
        return side;
      }
    }, {});

    if (includesSide?.advancedSide) return includesSide || {};
  }

  const fuzzyLastSide = tidyLastNames.reduce((side, participantName, i) => {
    const fuzzyRank = fuzzy(participantName || '', nonBracketedWinningParticipantName);
    if (!side.fuzzyRank || fuzzyRank > side.fuzzyRank) {
      return { advancedSide: i + 1, participantName, fuzzyRank };
    } else {
      return side;
    }
  }, {});

  const fuzzyFirstSide = tidyFirstNames?.reduce((side, participantName, i) => {
    const fuzzyRank = fuzzy(participantName || '', nonBracketedWinningParticipantName);
    if (!side.fuzzyRank || fuzzyRank > side.fuzzyRank) {
      return { advancedSide: i + 1, participantName, fuzzyRank };
    } else {
      return side;
    }
  }, {});

  if (fuzzyFirstSide && fuzzyLastSide) {
    if (fuzzyFirstSide.fuzzyRank > fuzzyLastSide.fuzzyRank) {
      return fuzzyFirstSide || {};
    }
  }
  return fuzzyLastSide || {};
}
