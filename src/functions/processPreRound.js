import { generateMatchUpId, generateParticipantId } from '../utilities/hashing';
import { drawDefinitionConstants, utilities } from 'tods-competition-factory';
import { getRoundMatchUps } from './getRoundMatchUps';

const { QUALIFYING } = drawDefinitionConstants;

export function processPreRound({ preRoundParticipantRows, preRoundColumn, analysis, profile }) {
  const pairedRowNumbers = utilities.chunkArray(preRoundParticipantRows, 2);
  // these matchUps will go into qualifyingStructure
  const { matchUps, participantDetails } = getRoundMatchUps({
    column: preRoundColumn,
    isPreRound: true,
    pairedRowNumbers,
    roundNumber: 1,
    analysis,
    profile
  });

  for (const matchUp of matchUps) {
    const { roundPosition } = matchUp;
    const firstDrawPosition = (roundPosition - 1) * 2;
    matchUp.drawPositions = [firstDrawPosition + 1, firstDrawPosition + 2];
  }

  const drawSize = Math.max(...matchUps.flatMap(({ drawPositions }) => drawPositions));

  const positionAssignments = [];

  // preRound should have no BYEs
  for (const participant of participantDetails) {
    const { isByePosition, participantName, roundPosition, sideNumber } = participant;
    const matchUp = matchUps.find((matchUp) => roundPosition === matchUp.roundPosition);
    const drawPosition = matchUp.drawPositions[sideNumber - 1];

    if (isByePosition) {
      positionAssignments.push({ bye: true, drawPosition });
    } else {
      const { participantId } = generateParticipantId({ attributes: [participantName] });
      const positionAssignment = { participantId, drawPosition };
      positionAssignments.push(positionAssignment);

      participant.participantId = participantId;
    }
  }

  for (const matchUp of matchUps) {
    const { matchUpId } = generateMatchUpId({
      additionalAttributes: [analysis.sheetName, ...analysis.multiColumnValues],
      // this will be the unique component for this sheet/structure in the generator
      participantNames: matchUp.pairParticipantNames,
      drawSize
    });
    matchUp.matchUpId = matchUpId;
  }

  const structureName = 'Pre-Qualifying';
  const stage = QUALIFYING;
  const stageSequence = 1;

  const structure = { matchUps, structureName, stage, stageSequence, positionAssignments };

  return { matchUps, participantDetails, structure };
}
