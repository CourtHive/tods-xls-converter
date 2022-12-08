import { SUCCESS } from '../constants/resultConstants';

export function getFirstRoundEntries({ boundaryIndex }) {
  console.log('get entries from first round');
  return {
    positionAssignments: [],
    seedAssignments: [],
    participants: [],
    boundaryIndex,
    entries: [],
    ...SUCCESS
  };
}
