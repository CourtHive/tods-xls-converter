import { getNonBracketedValue, getSeeding, onlyAlpha } from '../utilities/convenience';
import { utilities } from 'tods-competition-factory';

export function getValuesMap({ columnProfiles, profile }) {
  const seededParticipants = {};
  const participants = {};
  const valuesMap = {};

  for (const columnProfile of columnProfiles) {
    const { values, column } = columnProfile;
    const uniqueValues = utilities.unique(values.map(getNonBracketedValue));

    for (const value of values) {
      const seeding = getSeeding(value);
      if (seeding) {
        seededParticipants[getNonBracketedValue(value)] = seeding;
      }
    }

    for (const uniqueValue of uniqueValues) {
      if (onlyAlpha(uniqueValue, profile) && !profile.matchStatuses.includes(uniqueValue.toLowerCase())) {
        if (!valuesMap[uniqueValue]) {
          valuesMap[uniqueValue] = [column];
        } else {
          valuesMap[uniqueValue].push(column);
        }
      }
    }
  }

  const valuesKeys = Object.keys(valuesMap);
  const commaSeparatedKeys = valuesKeys.filter((key) => key.includes(','));
  const noCommaKeys = valuesKeys.filter((key) => !key.includes(','));
  const commaKeyhMatches = commaSeparatedKeys
    .map((key) => {
      const lastName = key.split(',')[0];
      const match = noCommaKeys.find((nck) => nck === lastName);
      if (match) return [key, match];
    })
    .filter(Boolean);

  for (const keyMatch of commaKeyhMatches) {
    const [key, match] = keyMatch;
    participants[key] = key;
    valuesMap[match].push(...valuesMap[key]);
  }

  return { valuesMap, seededParticipants, participants };
}
