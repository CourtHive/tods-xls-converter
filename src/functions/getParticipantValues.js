import { utilities } from 'tods-competition-factory';

const joiners = ['-', '/', ' / '];

// extract all the various participant values that will be compared to advanced participant string
// NOTE: params not passed as an object for mapping
export function getParticipantValues(participant, roundNumber, roundPosition, log) {
  roundNumber && roundPosition; // usefult for debugging

  const { participantName, person, individualParticipants } = participant || {};

  let pValues = [participantName];
  if (person) {
    const { standardFamilyName, standardGivenName } = person;
    pValues.push(standardFamilyName);
    pValues.push(standardGivenName);
    // handle multiple last names where only one of the last names is progressed
    const splitFamilyName = standardFamilyName.split(' ');

    if (standardGivenName?.split(' ').length > 1) {
      pValues.push(standardGivenName.split(' ')[0]);
    }

    // handle multiple last names where only one of the last names is progressed
    if (splitFamilyName[0] !== standardFamilyName) pValues.push(...splitFamilyName);

    // consider 'firstName lastName'
    const fullName = standardFamilyName && standardGivenName && [standardGivenName, standardFamilyName].join(' ');
    if (fullName) {
      pValues.push(fullName);
      const [first, ...other] = fullName.split(' ');
      const otherInitials = other.map((o) => o[0]).join('');
      const firstWithIntials = [first, otherInitials].join(' ');
      pValues.push(firstWithIntials);
      const [last, ...beginning] = fullName.split(' ').reverse();
      const beginningInitials = beginning.map((o) => o[0]).join('');
      const initialsWithLast = [beginningInitials, last].join(' ');
      pValues.push(initialsWithLast);
    }
  }

  const doublesLastNames = [];
  const doublesFirstNames = [];
  const allNames = [];

  individualParticipants?.forEach(({ participantName, person }) => {
    if (person) {
      const { standardFamilyName, standardGivenName } = person;
      doublesFirstNames.push(standardGivenName);
      doublesLastNames.push(standardFamilyName);
      allNames.push(participantName.split(' '));

      pValues.push(standardFamilyName);
      // sometimes TDs progress given names rather than family names, or put family names in given name column
      pValues.push(standardGivenName);

      // handle multiple last names where only one of the last names is progressed
      const splitFamilyName = standardFamilyName.split(' ');
      if (splitFamilyName !== standardFamilyName) pValues.push(...splitFamilyName);
    }
  });

  // for those rare occations where first names are advanced rather than last names
  if (doublesFirstNames.length > 1) {
    const combinations = [];
    joiners.forEach((joiner) => {
      combinations.push(doublesFirstNames.join(joiner));
      allNames[0].forEach((name, i) => {
        combinations.push([name, allNames[1][i]].join(joiner));
      });
    });
    pValues.push(...combinations);
  }

  const filteredValues = pValues
    .filter(Boolean)
    .map((v) => v.toString().toLowerCase())
    // ignore values which are single characters
    .filter((value) => value.length > 1);

  const uniqueFilteredValues = utilities.unique(filteredValues);

  if (log?.participantValues) console.log({ uniqueFilteredValues });

  return uniqueFilteredValues;
}
