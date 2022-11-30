import { matchUpStatusConstants, utilities } from 'tods-competition-factory';
import { getPositionColumn } from '../utilities/convenience';
import { getRoundMatchUps } from './getRoundMatchUps';
import { getPositionRefs } from './getPositionRefs';
import { processPreRound } from './processPreRound';
import { getEntries } from './getEntries';

import { MISSING_MATCHUP_DETAILS } from '../constants/errorConditions';
import { RESULT, ROUND } from '../constants/sheetElements';
import { PRE_ROUND } from '../constants/columnConstants';
import { SUCCESS } from '../constants/resultConstants';
const { BYE } = matchUpStatusConstants;

export function processKnockOut({ profile, analysis, sheet }) {
  const { columnProfiles, avoidRows } = analysis;

  const preRoundColumn = columnProfiles.find(({ character }) => character === PRE_ROUND)?.column;
  const { positionColumn } = getPositionColumn(analysis.columnProfiles);

  const { positionRefs, positionProgression, preRoundParticipantRows, error } = getPositionRefs({
    columnProfiles,
    positionColumn,
    preRoundColumn,
    avoidRows
  });

  if (error) return { error };

  const participants = [],
    structures = [],
    matchUps = [],
    links = [];

  // *. If preRound, use `preRoundParticipantRows` and positionRefs[0] to see whether there are progressed participants and set first roundNumber column
  //    - preRound is roundNumber: 0, first round of structure is roundNumber: 1

  if (preRoundParticipantRows?.length) {
    const columns = analysis.columnProfiles.map(({ column }) => column).sort();
    const preRoundIndex = columns.indexOf(preRoundColumn);
    const nextColumn = columns[preRoundIndex + 1];

    const { participantDetails, structure } = processPreRound({
      preRoundParticipantRows,
      preRoundColumn,
      participants,
      nextColumn,
      analysis,
      profile
    });

    structures.push(structure);

    participants.push(...participantDetails.filter(({ isByePosition }) => isByePosition));
  }

  // const qualifyingParticipants = participants.filter(({ advancedParticipantName }) => advancedParticipantName);

  // *. if no preRound, check whether there are values present in the valuesMap on positionRefs[0] of first column after the position round
  //    - check whether there are progressed particpants in positionRefs[1]
  //    - in rare cases there may be a preRound column BEFORE the position column... if position column > A this could be true
  //    - if there is a column before positionRound see whether any of the positioned values of roundNumber: 1 are present in that coulmn

  const columns = analysis.columnProfiles.map(({ column }) => column).sort();

  const {
    participants: firstRoundParticipants,
    positionAssignments,
    seedAssignments,
    boundaryIndex,
    entries
  } = getEntries({ sheet, analysis, profile, columns, positionRefs, preRoundColumn, positionColumn });

  participants.push(...firstRoundParticipants);

  let roundColumns = analysis.columnProfiles
    .filter(({ column }) => columns.indexOf(column) > boundaryIndex)
    .map(({ column }) => column);

  let roundParticipants =
    positionAssignments?.length &&
    utilities.chunkArray(
      positionAssignments.map(({ drawPosition, bye, participantId }) => {
        const participant = firstRoundParticipants.find((participant) => participant.participantId === participantId);
        return { drawPosition, participantName: bye && BYE, ...participant, isByePosition: bye };
      }),
      2
    );

  const characterAssessment = utilities.instanceCount(
    analysis.columnProfiles.filter(({ column }) => roundColumns.includes(column)).map(({ character }) => character)
  );
  const roundResult = [ROUND, RESULT].every((attribute) => Object.keys(characterAssessment).includes(attribute));
  const validValues = Object.values(characterAssessment).length === 2 && characterAssessment[ROUND] > 0;
  const containsRoundsAndResults = roundResult & validValues;

  const resultColumns =
    containsRoundsAndResults &&
    analysis.columnProfiles.filter(({ character }) => character === RESULT).map(({ column }) => column);

  if (resultColumns) {
    // when resultColumns are separate from roundColumns filter out the result columns
    roundColumns = roundColumns.filter((column) => !resultColumns.includes(column));
  }

  // if positionAssignments have been determined then push an additional round for processing
  if (positionAssignments.length) {
    roundColumns.unshift(analysis.columnProfiles[boundaryIndex].column);
  }

  let roundNumber = 1;
  roundColumns.forEach((column, columnIndex) => {
    const pairedRowNumbers = positionProgression[roundNumber - 1];

    if (pairedRowNumbers) {
      const result = getRoundMatchUps({
        resultColumn: resultColumns?.[columnIndex],
        nextColumn: roundColumns[columnIndex + 1],
        roundParticipants,
        pairedRowNumbers,
        resultColumns,
        participants,
        roundColumns,
        columnIndex,
        roundNumber,
        analysis,
        profile,
        column
      });

      const { matchUps: roundMatchUps, participantDetails, advancingParticipants } = result;
      roundParticipants = advancingParticipants?.length ? utilities.chunkArray(advancingParticipants, 2) : [];
      roundNumber += 1;

      if (participantDetails) {
        participants.push(...participantDetails.filter(({ isByePosition }) => isByePosition));
      }

      if (roundMatchUps) {
        matchUps.push(...roundMatchUps);
      }
    }
  });

  const { resultsCount, nameCount } = matchUps.reduce(
    (assessment, matchUp) => {
      assessment.resultsCount += matchUp.result ? 1 : 0;
      assessment.nameCount += matchUp.nameCount?.length || 0;
      return assessment;
    },
    { resultsCount: 0, nameCount: 0 }
  );

  if (matchUps.length && (!resultsCount || !nameCount)) {
    return { error: MISSING_MATCHUP_DETAILS };
  }

  const stage = analysis.isQualifying ? 'QUALIFYING' : 'MAIN';
  const structure = {
    stageSequence: analysis.isQualifying && preRoundParticipantRows?.length ? 2 : 1,
    positionAssignments,
    stageName: stage,
    matchUps,
    stage
  };
  structures.push(structure);

  Object.assign(analysis, {
    preRoundParticipantRows,
    positionProgression,
    positionRefs
  });

  return { analysis, links, entries, seedAssignments, structures, hasValues: true, ...SUCCESS };

  // NOTES:
  // *. Is there a pre-round
  // *. Use preRoundParticipantRows to create Qualifying Structure with matchUps
  // *. results can be inferred by looking at columngProfile keyMap values which occur between positionRefs
  // *. Characterize { drawSize: ##, R: 32, 16, 8. 4. 3 }
  // *. For each round, does the previous round have matching names
  // *. Using matching values across rounds calculate where progressing values should occur (to correct for those which have misspellings)
  // *. For each round, calculate which rows are paired
  // *. Is the structure SINGLES or DOUBLES?
  // *. Was the structure completed? Does the final round have 1 or 3?
  // *. Does the first round have powerOf2 participants/byes
  // *. Are there some rounds which have comma separating alpha values and some which do not?
  // *. Do all rounds have comma separated alpha values?
  // *. If there is a pre-round, are there results/scores in the first round participant column
  // *. Go back to each round and get date/times which occur on rows between paired paritipants
}
