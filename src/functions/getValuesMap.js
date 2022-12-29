import { getNonBracketedValue, getSeeding, onlyAlpha } from '../utilities/convenience';
import { utilities } from 'tods-competition-factory';

export function getValuesMap({ columnProfiles, profile, avoidRows }) {
  const seededParticipants = {};
  const participants = {};
  const valuesMap = {};

  for (const columnProfile of columnProfiles) {
    const { column, rows, values } = columnProfile;

    // filter our values which fall on rows to avoid
    const rowIndicesToAvoid = rows.map((row, index) => avoidRows.includes(row) && index).filter(Boolean);
    const rangeValues = values
      .map((value, index) => (rowIndicesToAvoid.includes(index) ? false : value))
      .filter(Boolean);

    const uniqueValues = utilities.unique(rangeValues.map(getNonBracketedValue));

    for (const value of rangeValues) {
      const seeding = getSeeding(value);
      if (seeding) {
        seededParticipants[getNonBracketedValue(value)] = seeding;
      }
    }

    for (const uniqueValue of uniqueValues) {
      const allAlpha = onlyAlpha(uniqueValue, profile);
      const valueIsMatchStatus = allAlpha && profile.matchStatuses.includes(uniqueValue.toLowerCase());
      const valueIsMatchOutcome = allAlpha && profile.matchOutcomes.includes(uniqueValue.toLowerCase());

      if (allAlpha && !valueIsMatchOutcome && !valueIsMatchStatus) {
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
  const commaKeyMatches = commaSeparatedKeys
    .map((key) => {
      const lastName = key.split(',')[0];
      const match = noCommaKeys.find((nck) => nck === lastName);
      if (match) return [key, match];
    })
    .filter(Boolean);

  for (const keyMatch of commaKeyMatches) {
    const [key, match] = keyMatch;
    participants[key] = key;
    valuesMap[match].push(...valuesMap[key]);
  }

  return { valuesMap, seededParticipants, participants };
}
