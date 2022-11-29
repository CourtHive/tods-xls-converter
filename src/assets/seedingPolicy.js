import { policyConstants, drawDefinitionConstants } from 'tods-competition-factory';

const { POLICY_TYPE_SEEDING } = policyConstants;
const { CLUSTER } = drawDefinitionConstants;

export const POLICY_SEEDING_ITF = {
  [POLICY_TYPE_SEEDING]: {
    seedingProfile: { positioning: CLUSTER },
    validSeedPositions: { ignore: true },
    duplicateSeedNumbers: true,
    drawSizeProgression: true,
    policyName: 'ITF SEEDING',

    seedsCountThresholds: [
      { drawSize: 4, minimumParticipantCount: 3, seedsCount: 2 },
      { drawSize: 16, minimumParticipantCount: 12, seedsCount: 4 },
      { drawSize: 32, minimumParticipantCount: 24, seedsCount: 8 },
      { drawSize: 64, minimumParticipantCount: 48, seedsCount: 16 },
      { drawSize: 128, minimumParticipantCount: 97, seedsCount: 32 },
      { drawSize: 256, minimumParticipantCount: 192, seedsCount: 64 }
    ]
  }
};
