import { generateMatchUpId, generateStructureId } from '../utilities/hashing';
import { drawDefinitionConstants, utilities } from 'tods-competition-factory';
import { getFirstRoundEntries } from './getFirstRoundEntries';
import { getRoundParticipants } from './getRoundParticipants';
import { getRoundMatchUps } from './getRoundMatchUps';

const { QUALIFYING } = drawDefinitionConstants;

// TODO: convert processPreRound to use getRound() instead of getRoundMatchUps();
export function processPreRound({ preRoundParticipantRows, preRoundColumn, nextColumn, analysis, columns, profile }) {
  const columnProfile = analysis.columnProfiles.find((columnProfile) => columnProfile.column === preRoundColumn);
  const boundaryIndex = columns.indexOf(nextColumn);
  const { participants: preRoundParticpants, positionAssignments } = getFirstRoundEntries({
    boundaryIndex,
    columnProfile,
    analysis,
    profile
  });

  const roundParticipants = getRoundParticipants({
    participants: preRoundParticpants,
    positionAssignments
  });

  const pairedRowNumbers = utilities.chunkArray(preRoundParticipantRows, 2);
  // these matchUps will go into qualifyingStructure
  const result = getRoundMatchUps({
    column: preRoundColumn,
    isPreRound: true,
    roundParticipants,
    pairedRowNumbers,
    roundNumber: 1,
    nextColumn,
    analysis,
    profile
  });
  const { matchUps, advancingParticipants } = result;

  for (const matchUp of matchUps) {
    const { roundPosition } = matchUp;
    const firstDrawPosition = (roundPosition - 1) * 2;
    matchUp.drawPositions = [firstDrawPosition + 1, firstDrawPosition + 2];
  }

  const drawSize = Math.max(...matchUps.flatMap(({ drawPositions }) => drawPositions));

  for (const matchUp of matchUps) {
    const { matchUpId } = generateMatchUpId({
      additionalAttributes: [analysis.sheetName, ...analysis.multiColumnValues],
      participantNames: advancingParticipants.map(({ participantName }) => participantName),
      drawSize
    });
    matchUp.matchUpId = matchUpId;
  }

  const structureName = 'Pre-Qualifying';
  const stage = QUALIFYING;
  const stageSequence = 1;

  const matchUpIds = matchUps?.map(({ matchUpId }) => matchUpId);
  const attributes = [...matchUpIds, stage, analysis.sheetName];
  const { structureId } = generateStructureId({ attributes });
  const structure = { structureId, matchUps, structureName, stage, stageSequence, positionAssignments };

  const advancedDrawPositions = advancingParticipants.map(({ drawPosition }) => drawPosition);
  const nonAdvancingParticipants = roundParticipants
    .flat()
    .filter(({ drawPosition }) => !advancedDrawPositions.includes(drawPosition))
    .map(({ drawPosition, ...participant }) => drawPosition && participant);

  return { matchUps, advancingParticipants, nonAdvancingParticipants, structure };
}
