import { isNumeric } from '../utilities/identification';

import { FIRST_NAME, LAST_NAME } from '../constants/attributeConstants';
import { RESULT, ROUND } from '../constants/sheetElements';

export function getRoundCharacter({ attributeMap, columnProfiles, columnProfile }) {
  const { scoreLikeCount, values, consecutiveNumbers } = columnProfile;

  let hasNameValue;
  const attributes = Object.values(attributeMap);
  const nameColumnAttributes = attributes.filter((attribute) => [FIRST_NAME, LAST_NAME].includes(attribute));
  if (columnProfiles && nameColumnAttributes.length) {
    const nameRound = nameColumnAttributes.some((attribute) => {
      const nameColumnProfile = columnProfiles.find((profile) => profile.attribute === attribute);
      const consideredValues = values.filter((f) => f && !isNumeric(f));

      const isNameRound =
        consideredValues.length &&
        consideredValues.every((value) => {
          const isNameValue = nameColumnProfile?.values?.includes(value);
          if (isNameValue) hasNameValue = true;
          return isNameValue;
        });
      return isNameRound;
    });
    if (nameRound) {
      const character = ROUND;
      columnProfile.character = character;
      return { character };
    }
  }

  const { character, attribute } = columnProfile;

  // TODO: don't ignore singleDigitValues when position Progression
  const singleDigitValues = values.some((value) => value.toString().length === 1);

  // need to add additional safeguards here so that result column is not before any of the idAttribute columns
  if (
    scoreLikeCount &&
    !hasNameValue &&
    !character &&
    (!attribute || attribute === ROUND) &&
    !consecutiveNumbers &&
    !singleDigitValues
  ) {
    columnProfile.character = RESULT;
  }

  return { character: columnProfile.character };
}
