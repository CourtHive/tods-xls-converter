import { getNonBracketedValue, onlyAlpha } from '../utilities/convenience';
import { utilities } from 'tods-competition-factory';

export function getValuesMap({ columnProfiles, profile }) {
  const valuesMap = {};

  for (const columnProfile of columnProfiles) {
    const { values, column } = columnProfile;
    for (const uniqueValue of utilities.unique(values.map(getNonBracketedValue))) {
      if (onlyAlpha(uniqueValue, profile) && !profile.matchStatuses.includes(uniqueValue.toLowerCase())) {
        if (!valuesMap[uniqueValue]) {
          valuesMap[uniqueValue] = [column];
        } else {
          valuesMap[uniqueValue].push(column);
        }
      }
    }
  }

  return valuesMap;
}
