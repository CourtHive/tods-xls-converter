const joiners = ['-', '/', ' / '];

// extract all the various participant values that will be compared to advanced participant string
export function getParticipantValues(participant, roundNumber, roundPosition) {
  roundNumber && roundPosition; // usefult for debugging

  const { participantName, person, individualParticipants } = participant || {};

  let pValues = [participantName];
  if (person) {
    const { standardFamilyName, standardGivenName } = person;
    pValues.push(standardFamilyName, standardGivenName);
    // handle multiple last names where only one of the last names is progressed
    const splitFamilyName = standardFamilyName.split(' ');

    // handle multiple last names where only one of the last names is progressed
    if (splitFamilyName !== standardFamilyName) pValues.push(...splitFamilyName);

    // consider 'firstName lastName'
    if (standardFamilyName && standardGivenName) pValues.push([standardGivenName, standardFamilyName].join(' '));
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

  return filteredValues;
}
