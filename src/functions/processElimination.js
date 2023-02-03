import { drawDefinitionConstants, drawEngine, utilities } from 'tods-competition-factory';
import { getColumnParticipantConfidence } from './getColumnParticipantConfidence';
import { getMaxPositionWithValues } from './getMaxPositionWithValues';
import { getRoundParticipants } from './getRoundParticipants';
import { getPositionColumn } from '../utilities/convenience';
import { generateStructureId } from '../utilities/hashing';
import { audit, getLoggingActive } from '../global/state';
import { pushGlobalLog } from '../utilities/globalLog';
import { getPositionRefs } from './getPositionRefs';
import { processPreRound } from './processPreRound';
import { getEntries } from './getEntries';
import { getRound } from './getRound';

import { PERSON_ID, STATE, CITY } from '../constants/attributeConstants';
import { PRE_ROUND } from '../constants/columnConstants';
import { SUCCESS } from '../constants/resultConstants';
import {
  INVALID_MATCHUPS_TOTAL,
  MISSING_ID_COLUMN,
  NO_POSITION_ROWS_FOUND,
  NO_PROGRESSED_PARTICIPANTS,
  NO_RESULTS_FOUND,
  POSITION_PROGRESSION,
  SINGLE_POSITION_MATCHUPS
} from '../constants/errorConditions';

const { QUALIFYING: QUALIFYING_STAGE, MAIN } = drawDefinitionConstants;

export function processElimination({ profile, analysis, sheet, confidenceThreshold = 0.7 }) {
  const { columnProfiles, avoidRows } = analysis;
  analysis.drawType = 'SINGLE_ELIMINATION';

  const preRoundColumn = columnProfiles.find(({ character }) => character === PRE_ROUND)?.column;
  const { positionColumn } = getPositionColumn(analysis.columnProfiles);

  const { positionProfile, maxPositionWithValues, maxPosition, maxPositionRow, maxValueRow, valuesPerRow } =
    getMaxPositionWithValues({
      columnProfiles,
      positionColumn,
      analysis
    });

  const noValues = maxValueRow === -Infinity;

  const blankDraw = (context) => {
    const message = 'Blank Draw';
    pushGlobalLog({
      method: 'notice',
      color: 'cyan',
      keyColors: { message: 'brightblue', attributes: 'cyan', context: 'blue' },
      message,
      context
    });
    return { analysis };
  };

  // there would need to be a large number of values per row to conclude no positions if no positionColumn is found
  if (!positionColumn && valuesPerRow >= 2) {
    return { error: NO_POSITION_ROWS_FOUND };
  }
  if (noValues || !maxPositionWithValues || maxPositionWithValues < 2) return blankDraw('no values');

  let positionLimit;
  if (maxPositionWithValues < maxPosition) {
    positionLimit = maxPositionWithValues;
    const positionAvoidanceRange = utilities.generateRange(maxPositionRow + 1, Math.max(...positionProfile.rows) + 1);
    avoidRows.push(...positionAvoidanceRange);
  }

  const { positionRefs, positionProgression, preRoundParticipantRows, error } = getPositionRefs({
    columnProfiles,
    positionColumn,
    preRoundColumn,
    positionLimit,
    avoidRows
  });

  if (positionRefs?.length < maxPositionWithValues) return blankDraw('no positions');
  if (error) return { error, analysis };

  let ignoredQualifyingMatchUpIds = [];
  const preRoundParticipants = [],
    ignoredMatchUps = [],
    participants = [],
    structures = [],
    links = [];

  let matchUps = [];

  // *. If preRound, use `preRoundParticipantRows` and positionRefs[0] to see whether there are progressed participants and set first roundNumber column
  //    - preRound is roundNumber: 0, first round of structure is roundNumber: 1

  if (preRoundParticipantRows?.length && preRoundColumn) {
    const columns = analysis.columnProfiles.map(({ column }) => column).sort();
    const preRoundIndex = columns.indexOf(preRoundColumn);
    const nextColumn = columns[preRoundIndex + 1];

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
    idColumn,
    entries
  } = entryResult;

  participants.push(...firstRoundParticipants);

  let roundColumns = analysis.columnProfiles
    .filter(
      ({ column, character }) =>
        columns.indexOf(column) > boundaryIndex && ![PERSON_ID, STATE, CITY].includes(character)
    )
    .map(({ column }) => column);

  let roundParticipants = getRoundParticipants({ positionAssignments, participants: firstRoundParticipants }) || [];

  // if positionAssignments have been determined then push an additional round for processing
  if (positionAssignments.length) {
    const boundaryIndexColumn = analysis.columnProfiles[boundaryIndex].column;
    if (!roundColumns.includes(boundaryIndexColumn)) {
      roundColumns.unshift(boundaryIndexColumn);
    }
  }

  const subsequentColumnLimit = profile.subsequentColumnLimit || 2;
  const rangeAdjustments = [];
  const consumedColumns = [];
  let roundNumber = 1;
  let columnIndex = 0;

  // -------------------------------------------------------------------------------------------------
  // ACTION: profile all roundColumns to determine how many contain participants withConfidence
  // NOTE: for this check the FIRST ROUND PARTICIPANTS are always used
  const noConfidenceValues = [];
  const columnsWithParticipants = Object.assign(
    {},
    ...roundColumns
      .map((targetColumn) => {
        const {
          confidence: withConfidence,
          targetColumnValues,
          valuesCount
        } = getColumnParticipantConfidence({
          confidenceThreshold,
          roundParticipants,
          targetColumn,
          analysis
        });

        // confidence is the percentage of values in the column with confident matches
        // in some cases inconsistent use of two column results leads to parsing errors
        const confidence = withConfidence.length / valuesCount;

        if (withConfidence.length && confidence > 0.3) {
          return { [targetColumn]: valuesCount };
        } else {
          const numericValues = targetColumnValues.filter((value) => {
            const containsAlpha = /[A-Za-z]+/.test(value);
            return !containsAlpha;
          });
          if (numericValues.length) noConfidenceValues.push(numericValues);
        }
      })
      .filter(Boolean)
  );

  if (!participants.length || Object.values(columnsWithParticipants).length === 0) {
    return blankDraw('no participants');
  }

  if (!Object.values(columnsWithParticipants).length) {
    console.log({ columnsWithParticipants });
    if (participants.length && noConfidenceValues.length) {
      return { error: POSITION_PROGRESSION, participants };
    }
    return { warnings: [NO_PROGRESSED_PARTICIPANTS], participants };
  }

  const resultRounds = [];
  // -------------------------------------------------------------------------------------------------

  while (columnIndex < roundColumns.length) {
    const pairedRowNumbers = positionProgression[roundNumber - 1];
    if (pairedRowNumbers) {
      const result = getRound({
        columnsWithParticipants,
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

      resultRounds.push(roundColumns[columnIndex]);
      columnIndex += result.columnsConsumed || 0;

      if (result.columnsConsumed) consumedColumns.push(roundNumber);
      if (result.rangeAdjustment) rangeAdjustments.push(roundNumber);

      if (roundMatchUps) {
        const winningSides = roundMatchUps.reduce((count, matchUp) => count + (matchUp.winningSide ? 1 : 0), 0);

        // when there are no winningSides, only push if not the last column to be processed...
        // ... or if there is only one matchUp assume that it is an unfinished Final
        if (winningSides || columnIndex + 1 < roundColumns.length || roundMatchUps.length === 1) {
          matchUps.push(...roundMatchUps);
        } else {
          ignoredMatchUps.push(...roundMatchUps);
        }
      }

      roundNumber += 1;
    }

    columnIndex += 1;
  }

  if (consumedColumns.length) {
    const message = `results in multiple columns{ roundNumbers: ${consumedColumns.join(',')} }`;
    pushGlobalLog({
      method: 'notice',
      color: 'yellow',
      keyColors: { message: 'cyan', attributes: 'yellow' },
      message
    });
  }

  if (rangeAdjustments.length && getLoggingActive('detail')) {
    const message = `result range modified { roundNumbers: ${rangeAdjustments.join(',')} }`;
    pushGlobalLog({
      method: 'notice',
      color: 'brightyellow',
      keyColors: { message: 'cyan', attributes: 'brightyellow' },
      message
    });
  }

  const { resultsCount } = matchUps.reduce(
    (assessment, matchUp) => {
      assessment.resultsCount += matchUp.winningSide ? 1 : 0;
      return assessment;
    },
    { resultsCount: 0, nameCount: 0 }
  );

  const withDrawPositionsNotBye = matchUps.filter(
    ({ drawPositions, matchUpStatus }) => drawPositions?.length === 2 && matchUpStatus !== 'BYE'
  );

  if (withDrawPositionsNotBye.length && !resultsCount) {
    return { warnings: [NO_RESULTS_FOUND] };
  }

  Object.assign(analysis, {
    preRoundParticipantRows,
    positionProgression,
    positionRefs
  });

  const matchUpsCount = matchUps.length;

  let warnings = [];
  if (utilities.isPowerOf2(maxPositionWithValues)) {
    const roundCounts = [];
    let roundCount = maxPositionWithValues / 2;
    while (roundCount >= 1) {
      roundCounts.push(roundCount);
      roundCount = roundCount / 2;
    }
    const roundTotals = roundCounts.reduce(
      (totals, count) => totals.concat((totals[totals.length - 1] || 0) + count),
      []
    );

    if (matchUpsCount && !roundTotals.includes(matchUpsCount)) {
      const result = drawEngine.getRoundMatchUps({ matchUps });
      const validRounds = result.roundNumbers.filter(
        (roundNumber, i) => result.roundProfile[roundNumber].matchUpsCount === roundCounts[i]
      );
      const validMatchUps = matchUps.filter(({ roundNumber }) => validRounds.includes(roundNumber));
      const message = `matchUpsTotal indicates incomplete round: ${matchUpsCount}`;
      pushGlobalLog({
        method: '!!!!!!',
        color: 'brightyellow',
        keyColors: { message: 'cyan', attributes: 'brightyellow' },
        message
      });

      if (validMatchUps.length) {
        matchUps = validMatchUps;
        warnings.push(INVALID_MATCHUPS_TOTAL);
      } else {
        return { error: INVALID_MATCHUPS_TOTAL, context: { matchUpsCount } };
      }
    }
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

  const singlePositionMatchUps = matchUps.filter(({ drawPositions }) => drawPositions.length === 1);

  if (singlePositionMatchUps.length) {
    const message = `Single position matchUps`;
    warnings.push(SINGLE_POSITION_MATCHUPS);
    pushGlobalLog({
      method: '!!!!!!',
      color: 'brightyellow',
      keyColors: { message: 'cyan', attributes: 'brightyellow', matchUpsCount: 'brightred' },
      message,
      matchUpsCount: singlePositionMatchUps.length
    });

    audit({ singlePositions: singlePositionMatchUps.length, fileName: analysis.fileName });
  }

  const idColumnRequired = profile.headerColumns.find(({ attr }) => attr === PERSON_ID)?.required;
  if (!idColumn && idColumnRequired) {
    audit({ type: MISSING_ID_COLUMN, matchUpsCount: matchUps.length });
    return { error: MISSING_ID_COLUMN };
  }

  // if stage is qualifying ignore all matchUps which don't have a winningSide or matchUpStatus
  if (stage === QUALIFYING_STAGE) {
    ignoredQualifyingMatchUpIds = matchUps
      .filter(({ winningSide, matchUpStatus }) => !winningSide && !matchUpStatus)
      .map(({ matchUpId }) => matchUpId);
  }

  return {
    matchUpsCount: matchUps.length,
    ignoredQualifyingMatchUpIds,
    hasValues: true,
    ignoredMatchUps,
    seedAssignments,
    participants,
    resultRounds, // currently unused
    structures,
    ...SUCCESS,
    matchUps,
    analysis,
    warnings,
    entries,
    links
  };
}
