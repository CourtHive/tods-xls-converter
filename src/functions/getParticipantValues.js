const joiners = ['-', '/'];

// extract all the various participant values that will be compared to advanced participant string
export function getParticipantValues(participant) {
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
      doublesFirstNames.push(standardGivenName);
      doublesLastNames.push(standardFamilyName);

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

  return pValues.filter(Boolean).map((v) => v.toString().toLowerCase());
}
