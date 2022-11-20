// import { pushGlobalLog } from '../utilities/globalLog';

import { SUCCESS } from '../constants/resultConstants';

export function processKnockOut({ sheetDefinition, profile, analysis, sheet, info }) {
  if (sheetDefinition && profile && sheet);

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

  return { analysis, info, ...SUCCESS };
}
