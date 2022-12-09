import { tournamentEngine } from 'tods-competition-factory';

import { POLICY_SEEDING_ITF } from '../assets/seedingPolicy';

export function limitedSeedAssignments({ seedAssignments, drawSize, participants }) {
  const participantCount = participants.length;

  const policyDefinitions = { ...POLICY_SEEDING_ITF };
  const { seedsCount } = tournamentEngine.getSeedsCount({
    policyDefinitions,
    participantCount,
    drawSize
  });

  return seedAssignments.filter((assignment) => assignment.seedValue <= seedsCount);
}
