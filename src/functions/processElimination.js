import { drawDefinitionConstants, utilities } from 'tods-competition-factory';
import { getRoundParticipants } from './getRoundParticipants';
import { getPositionColumn } from '../utilities/convenience';
import { generateStructureId } from '../utilities/hashing';
import { getPositionRefs } from './getPositionRefs';
import { processPreRound } from './processPreRound';
import { getEntries } from './getEntries';
import { getRound } from './getRound';

const { QUALIFYING: QUALIFYING_STAGE, MAIN } = drawDefinitionConstants;
import { MISSING_MATCHUP_DETAILS } from '../constants/errorConditions';
import { PRE_ROUND } from '../constants/columnConstants';
import { SUCCESS } from '../constants/resultConstants';

export function processElimination({ profile, analysis, sheet, confidenceThreshold = 0.7 }) {
  const { columnProfiles, avoidRows } = analysis;
  analysis.drawType = 'SINGLE_ELIMINATION';

  const preRoundColumn = columnProfiles.find(({ character }) => character === PRE_ROUND)?.column;
  const { positionColumn } = getPositionColumn(analysis.columnProfiles);

  const { positionRefs, positionProgression, preRoundParticipantRows, error } = getPositionRefs({
    columnProfiles,
    positionColumn,
    preRoundColumn,
    avoidRows
  });

  if (error) return { error };

  const preRoundParticipants = [],
    participants = [],
    structures = [],
    matchUps = [],
    links = [];

  // *. If preRound, use `preRoundParticipantRows` and positionRefs[0] to see whether there are progressed participants and set first roundNumber column
  //    - preRound is roundNumber: 0, first round of structure is roundNumber: 1

  if (preRoundParticipantRows?.length) {
    const columns = analysis.columnProfiles.map(({ column }) => column).sort();
    const preRoundIndex = columns.indexOf(preRoundColumn);
    const nextColumn = columns[preRoundIndex + 1];

    // TODO: convert processPreRound to use getRound() instead of getRoundMatchUps();
    const { advancingParticipants, nonAdvancingParticipants, structure } = processPreRound({
      subsequentColumnLimit: 1, // value for getRound()
      preRoundParticipantRows,
      confidenceThreshold,
      preRoundColumn,
      participants,
      nextColumn,
      analysis,
      columns,
      profile
    });

    structures.push(structure);

    participants.push(...nonAdvancingParticipants.filter(({ isByePosition }) => !isByePosition));
    preRoundParticipants.push(...advancingParticipants.filter(({ isByePosition }) => !isByePosition));
  }

  // *. if no preRound, check whether there are values present in the valuesMap on positionRefs[0] of first column after the position round
  //    - check whether there are progressed particpants in positionRefs[1]
  //    - in rare cases there may be a preRound column BEFORE the position column... if position column > A this could be true
  //    - if there is a column before positionRound see whether any of the positioned values of roundNumber: 1 are present in that coulmn

  const columns = analysis.columnProfiles.map(({ column }) => column).sort();

  const entryResult = getEntries({
    preRoundParticipants,
    preRoundColumn,
    positionColumn,
    positionRefs,
    analysis,
    profile,
    columns,
    sheet
  });
  if (entryResult?.error) return entryResult;

  const {
    participants: firstRoundParticipants,
    positionAssignments,
    seedAssignments,
    boundaryIndex,
    entries
  } = entryResult;

  participants.push(...firstRoundParticipants);

  let roundColumns = analysis.columnProfiles
    .filter(({ column }) => columns.indexOf(column) > boundaryIndex)
    .map(({ column }) => column);

  let roundParticipants = getRoundParticipants({ positionAssignments, participants: firstRoundParticipants });

  // if positionAssignments have been determined then push an additional round for processing
  if (positionAssignments.length) {
    const boundaryIndexColumn = analysis.columnProfiles[boundaryIndex].column;
    if (!roundColumns.includes(boundaryIndexColumn)) {
      roundColumns.unshift(boundaryIndexColumn);
    }
  }

  let roundNumber = 1;
  let columnIndex = 0;
  const subsequentColumnLimit = profile.subsequentColumnLimit || 2;

  while (columnIndex < roundColumns.length) {
    const pairedRowNumbers = positionProgression[roundNumber - 1];
    if (pairedRowNumbers) {
      const result = getRound({
        subsequentColumnLimit,
        confidenceThreshold,
        positionProgression,
        roundParticipants,
        pairedRowNumbers,
        participants,
        roundColumns,
        columnIndex,
        roundNumber,
        analysis,
        profile
      });

      const { matchUps: roundMatchUps, participantDetails, advancingParticipants } = result;
      roundParticipants = advancingParticipants?.length ? utilities.chunkArray(advancingParticipants, 2) : [];

      if (participantDetails) {
        participants.push(...participantDetails.filter(({ isByePosition }) => isByePosition));
      }

      columnIndex += result.columnsConsumed || 0;

      if (roundMatchUps) {
        const winningSides = roundMatchUps.reduce((count, matchUp) => count + (matchUp.winningSide ? 1 : 0), 0);

        // when there are no winningSides, only push if not the last column to be processed...
        // ... or if there is only one matchUp assume that it is an unfinished Final
        if (winningSides || columnIndex + 1 < roundColumns.length || roundMatchUps.length === 1) {
          matchUps.push(...roundMatchUps);
        }
      }

      roundNumber += 1;
    }

    columnIndex += 1;
  }

  const { resultsCount } = matchUps.reduce(
    (assessment, matchUp) => {
      assessment.resultsCount += matchUp.winningSide ? 1 : 0;
      return assessment;
    },
    { resultsCount: 0, nameCount: 0 }
  );

  if (matchUps.length && !resultsCount) {
    return { error: MISSING_MATCHUP_DETAILS };
  }

  const matchUpIds = matchUps?.map(({ matchUpId }) => matchUpId);
  const stage = analysis.info?.stage || analysis.isQualifying ? QUALIFYING_STAGE : MAIN;
  const attributes = [...matchUpIds, stage, analysis.sheetName];
  const result = generateStructureId({ attributes });
  if (result.error) console.log('generateStructureId', result.error);
  const { structureId } = result;
  const structure = {
    stageSequence: analysis.isQualifying && preRoundParticipantRows?.length ? 2 : 1,
    positionAssignments,
    stageName: stage,
    structureId,
    matchUps,
    stage
  };
  structures.push(structure);

  Object.assign(analysis, {
    preRoundParticipantRows,
    positionProgression,
    positionRefs
  });

  const matchUpsCount = matchUps.length;

  return {
    hasValues: true,
    seedAssignments,
    matchUpsCount,
    participants,
    structures,
    ...SUCCESS,
    matchUps,
    analysis,
    entries,
    links
  };
}
