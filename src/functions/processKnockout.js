import { getPositionRows } from './getPositionRows';

import { POSITION, PRE_ROUND } from '../constants/columnConstants';
import { SUCCESS } from '../constants/resultConstants';

export function processKnockOut({ sheetDefinition, profile, analysis, sheet, info }) {
  if (sheetDefinition && profile && sheet);

  const { columnProfiles } = analysis;

  const preRoundColumn = columnProfiles.find(({ character }) => character === PRE_ROUND)?.column;
  const positionColumn = columnProfiles.find(({ attribute }) => attribute === POSITION)?.column;

  const { positionRows, positionProgression, preRoundParticipantRows } = getPositionRows({
    columnProfiles,
    positionColumn,
    preRoundColumn
  });

  Object.assign(analysis, {
    preRoundParticipantRows,
    positionProgression,
    positionRows
  });

  return { analysis, info, hasValues: true, ...SUCCESS };
  // NOTES:
  // *. Is there a pre-round
  // *. Use preRoundParticipantRows to create Qualifying Structure with matchUps
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

  /*
    const matchUpAttributes = { roundNumber: 1, roundPosition: 1, drawSize: 32, participantNames: ['Ray', 'Charles'] };
    const matchUpId = generateMatchUpId(matchUpAttributes);
    console.log({ matchUpId });
  */

  /*
  analysis.rowGroupings.forEach((grouping) => {
    const { columns, attributes, rowCount } = grouping;
    pushGlobalLog({ columns, attributes, rowCount });
  });
  */

  /*
  const result = getParticipantRows({
    headerRow,
    footerRow,
    avoidRows,
    profile,
    columns,
    sheet
  });
  // console.log({ result });
  const { rows, range, finals, preRoundRows } = result;
  const { players, isDoubles } = extractKnockOutParticipants({
    preRoundRows,
    headerRow,
    columns,
    profile,
    gender,
    sheet,
    range,
    finals,
    rows
  });
  console.log({
    headerRow,
    columns,
    rows,
    range,
    finals,
    preRoundRows,
    profile
  });
  const drawFormat = isDoubles ? 'DOUBLES' : 'SINGLES';

  const playerData = { players, rows, range, finals, preRoundRows };
  const { matchUps, stage } = constructKnockOut({
    profile,
    sheet,
    columns,
    headerRow,
    gender,
    playerData
  });
  const { entries, playersMap, participantsMap, positionAssignments, seedAssignments } = getEntries({
    matchUps,
    drawFormat
  });

  Object.assign(drawInfo, { drawFormat, stage });
  const sizes = [matchUps, entries, positionAssignments, seedAssignments].map((v) => v.length);
  const fodder = sizes
    .concat(...Object.values(drawInfo).filter((v) => typeof v === 'string'))
    .sort()
    .join('');
  const drawId = hashId(fodder);

  const TodsMatchUps = matchUps.map((matchUp) => {
    const drawPositions = matchUp.drawPositions.sort((a, b) => a - b);
    const matchUpId = `${drawId}-${drawPositions.join('')}-M`;
    const winningSide = drawPositions.indexOf(matchUp.winningDrawPosition) + 1;
    return {
      matchUpId,
      drawPositions,
      score: matchUp.result,
      roundName: matchUp.roundName,
      roundNumber: matchUp.roundNumber,
      roundPosition: matchUp.roundPosition,
      finishingRound: matchUp.finishingRound,
      winningSide
    };
  });

  const structureIdFodder = `${fodder}${stage}`;
  const structureId = `${hashId(structureIdFodder)}-S`;
  const structure = {
    stage,
    structureId,
    stageSequence: 1,
    seedAssignments,
    positionAssignments,
    matchUps: TodsMatchUps,
    finishingPosition: 'roundOutcome'
  };

  Object.assign(drawInfo, { drawId, stage, matchUps, structure, entries });
  matchUps.forEach((matchUp) => (matchUp.event = drawInfo.event));

  return { drawInfo, playersMap, participantsMap, ...SUCCESS };
  */
}
