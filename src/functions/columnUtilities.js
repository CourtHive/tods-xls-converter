import { isNumeric } from '../utilities/identification';
import { utilities } from 'tods-competition-factory';

export function getGroupings({ columnProfile }) {
  const groupings = [];
  let grouping;
  let current;

  let index = -1;
  for (const row of columnProfile?.rows || []) {
    index += 1;
    const value = columnProfile.values[index];
    if (isNumeric(value)) continue;

    if (row - 1 === current) {
      grouping.push(row);
      current = row;
      continue;
    } else {
      current = row;
      if (grouping) groupings.push(grouping);
      grouping = [current];
      continue;
    }
  }
  if (grouping) groupings.push(grouping);

  return groupings;
}

export function getDerivedPair({ profile, columnProfile, pair }) {
  const diff = Math.abs(pair[1] - pair[0]);
  if (diff < 4) return { derivedPair: pair, groups: [[pair[0]], [pair[1]]] };

  const searchOffset = 3;
  const getGroupRange = (group) => {
    const max = Math.max(...group);
    const min = Math.min(...group);
    return utilities.generateRange(min - searchOffset, max + searchOffset);
  };

  const groups = [];
  const groupings = getGroupings({ profile, columnProfile });
  const derivedPair = pair.map((rowNumber) => {
    const group = groupings.find((group) => getGroupRange(group).includes(rowNumber));
    if (group) groups.push(group);
    return group?.[0];
  });

  return { derivedPair, groups };
}
