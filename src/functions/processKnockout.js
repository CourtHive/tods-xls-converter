import { getPositionColumn } from '../utilities/convenience';
import { getRoundMatchUps } from './getRoundMatchUp';
import { getPositionRows } from './getPositionRows';
import { processPreRound } from './processPreRound';

import { PRE_ROUND } from '../constants/columnConstants';
import { SUCCESS } from '../constants/resultConstants';

export function processKnockOut({ sheetDefinition, profile, analysis, sheet, info }) {
  if (sheetDefinition && profile && sheet);

  const { columnProfiles } = analysis;

  const preRoundColumn = columnProfiles.find(({ character }) => character === PRE_ROUND)?.column;
  const positionColumn = getPositionColumn(analysis.columnProfiles);

  const { positionRows, positionProgression, preRoundParticipantRows } = getPositionRows({
    columnProfiles,
    positionColumn,
    preRoundColumn
  });

  const participants = [],
    structures = [],
    matchUps = [],
    links = [];

  // *. If preRound, use `preRoundParticipantRows` and positionRows[0] to see whether there are progressed participants and set first roundNumber column
  //    - preRound is roundNumber: 0, first round of structure is roundNumber: 1

  if (preRoundParticipantRows?.length) {
    const { matchUps, structure, participantDetails } = processPreRound({
      preRoundParticipantRows,
      preRoundColumn,
      analysis,
      profile
    });

    structures.push(structure);

    participants.push(...participantDetails.filter(({ isByePosition }) => isByePosition));

    matchUps.push(...matchUps);
  }

  const qualifyingParticipants = participants.filter(({ advancedParticipantName }) => advancedParticipantName);

  // *. if no preRound, check whether there are values present in the valuesMap on positionRows[0] of first column after the position round
  //    - check whether there are progressed particpants in positionRows[1]
  //    - in rare cases there may be a preRound column BEFORE the position column... if position column > A this could be true
  //    - if there is a column before positionRound see whether any of the positioned values of roundNumber: 1 are present in that coulmn

  const roundColumnsToProcess = analysis.columnProfiles
    .filter(({ column }) => ![preRoundColumn, positionColumn].filter(Boolean).includes(column))
    .map(({ column }) => column);

  roundColumnsToProcess.forEach((column, i) => {
    const pairedRowNumbers = positionProgression[i];

    if (pairedRowNumbers) {
      const { matchUps: roundMatchUps, participantDetails } = getRoundMatchUps({
        pairedRowNumbers,
        roundNumber: 1,
        analysis,
        profile,
        column
      });

      if (roundMatchUps) {
        console.log({ roundMatchUps, participantDetails });
      }
    } else {
      /*
      // diagnostics
      const profile = analysis.columnProfiles.find((c) => c.column === column);
      const keys = Object.keys(profile.keyMap);
      console.log({ column, i, profile });
      keys.forEach((key) => console.log(sheet[key]));
      */
    }
  });

  Object.assign(analysis, {
    preRoundParticipantRows,
    positionProgression,
    positionRows
  });

  return { analysis, info, links, structures, matchUps, hasValues: true, ...SUCCESS };

  // NOTES:
  // *. Is there a pre-round
  // *. Use preRoundParticipantRows to create Qualifying Structure with matchUps
  // *. results can be inferred by looking at columngProfile keyMap values which occur between positionRows
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
