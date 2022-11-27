import { generateMatchUpId, generateParticipantId, generateStructureId } from '../utilities/hashing';
import { utilities, matchUpStatusConstants } from 'tods-competition-factory';
import { onlyAlpha } from '../utilities/convenience';
import { normalizeName } from 'normalize-text';
import { getRow } from './sheetAccess';

import { TOURNAMENT_NAME } from '../constants/attributeConstants';
import { POSITION } from '../constants/columnConstants';
import { SUCCESS } from '../constants/resultConstants';
import { ROUND } from '../constants/sheetElements';

const { WALKOVER } = matchUpStatusConstants;

export function processRoundRobin({ sheetDefinition, sheet, profile, analysis, info }) {
  if (sheetDefinition && profile && sheet);

  // NOTES:
  // *. First column has names/numbers... these numbers appear to be finishingPositions
  // *. Do all first column names appear in first row?
  // *. What are the row/column ranges for results?
  // *. Go back to each result column and get date/times

  // TOURNAMENT DETAILS
  // *. attributes are info tournamentName and dateRange
  if (info[TOURNAMENT_NAME]);

  const { structure, participants } = getRoundRobinValues(analysis, profile);
  if (structure) analysis.structureId = structure.structureId;

  return { analysis, hasValues: true, structures: [structure], participants, ...SUCCESS };
}

export function getRoundRobinValues(analysis, profile) {
  const frequencyColumns = Object.values(analysis.valuesMap).filter((columns) => columns.length === 2);
  const firstColumn = frequencyColumns[0][0];
  const commonFirstColumn = frequencyColumns.every((frequency) => frequency[0] === firstColumn);
  const resultsColumns = frequencyColumns.map((frequency) => frequency.length === 2 && frequency[1]).filter(Boolean);
  const uniqueResultsColumns = utilities.unique(resultsColumns).length === frequencyColumns.length;
  if (!uniqueResultsColumns) return { error: 'Round Robin result columns are not unique' };
  if (!commonFirstColumn) return { error: 'Round Robin no common first column' };

  const positionColumnRows = analysis.columnProfiles.find(({ attribute, character }) => {
    return [attribute, character].includes(POSITION);
  })?.rows;

  const findColumnProfile = (column) =>
    analysis.columnProfiles.find((columnProfile) => columnProfile.column === column);
  const firstColumnProfile = findColumnProfile(firstColumn);
  const minRow = Math.min(...firstColumnProfile.rows);
  const maxRow = Math.max(...firstColumnProfile.rows) + 1; // buffer, perhaps provider.profile
  const participantNames = analysis.multiColumnValues;

  const hasFinishingPositions =
    positionColumnRows && firstColumnProfile.values.length === positionColumnRows.length * 2;
  const finishingPositions =
    hasFinishingPositions && firstColumnProfile.values.filter((value) => !participantNames.includes(value));

  // resultColumnRows should all occur between min/max of firstColumnRows
  const resultRows = utilities.unique(
    resultsColumns
      .map((column) => {
        const columnProfile = findColumnProfile(column);
        columnProfile.character = ROUND;
        return columnProfile;
      })
      .map((columnProfile) => {
        const keyMap = columnProfile?.keyMap;
        // remove the first row which contains the player names
        return keyMap ? Object.keys(keyMap).map(getRow).sort(utilities.numericSort).slice(1) : [];
      })
      .flat(Infinity)
      .sort(utilities.numericSort)
  );

  const rowsWithinBounds = resultRows.every((row) => row >= minRow && row <= maxRow);
  if (!rowsWithinBounds) return { error: 'Results vales out of bounds' };

  const positionAssignments = [];
  const positionedMatchUps = {};
  const positionNameMap = {};
  const participants = {};

  Object.keys(analysis.valuesMap).forEach((name, positionIndex) => {
    const drawPosition = positionIndex + 1;
    if (name) {
      const participantName = normalizeName(name);
      positionNameMap[drawPosition] = participantName;
      const { participantId } = generateParticipantId({ attributes: [participantName] });
      const finishingPosition = finishingPositions?.[positionIndex];
      const positionAssignment = { drawPosition, participantId };
      const extensions = finishingPosition && [{ name: 'participantResults', value: { finishingPosition } }];
      if (extensions) positionAssignment.extensions = extensions;
      positionAssignments.push(positionAssignment);
      participants[participantId] = { participantId, participantName };
    }
    const orderedResultsColumns = resultsColumns.sort();
    // get resultsColumns in which they do not appear
    const targetResultColumns = orderedResultsColumns.filter((column) => !analysis.valuesMap[name].includes(column));

    for (const column of targetResultColumns) {
      const columnProfile = findColumnProfile(column);
      const columnIndex = orderedResultsColumns.indexOf(column);
      const positionRow = positionColumnRows?.[positionIndex];

      if (positionRow) {
        const resultRow = positionRow + 1; // TODO: implement findInRowRange and determine rowRange from providerProfile
        const result = columnProfile.keyMap[`${column}${resultRow}`];
        const resultIsMatchOutcome =
          onlyAlpha(result, profile) && profile.matchOutcomes.some((outcome) => outcome === result.toLowerCase());

        const drawPositions = [drawPosition, columnIndex + 1].sort();
        const sideString = drawPosition > columnIndex + 1 ? 'stringScoreSide1' : 'stringScoreSide2';
        const positioning = drawPositions.join('|');

        const existingScore = positionedMatchUps[positioning]?.score;
        const score = resultIsMatchOutcome ? undefined : { [sideString]: result, ...existingScore };
        const drawPositionSideNumber = drawPositions.indexOf(drawPosition) + 1;
        const winningSide =
          resultIsMatchOutcome && profile.winIdentifier
            ? result.toLowerCase().includes(profile.winIdentifier)
              ? drawPositionSideNumber
              : 3 - drawPositionSideNumber
            : undefined;

        const walkover = profile.matchUpStatuses?.walkover;
        const matchUpStatus = walkover ? (result.toLowerCase().includes(walkover) ? WALKOVER : undefined) : undefined;

        positionedMatchUps[positioning] = {
          drawPositions,
          matchUpStatus,
          winningSide,
          result,
          score
        };
      }
    }
  });

  const matchUpIds = [];
  const drawSize = positionAssignments.length;
  const matchUps = Object.values(positionedMatchUps).map((value) => {
    const participantNames = value.drawPositions.map((drawPosition) => positionNameMap[drawPosition]);
    const { matchUpId } = generateMatchUpId({
      additionalAttributes: [analysis.sheetName, ...analysis.multiColumnValues],
      participantNames, // this will be the unique component for this sheet/structure in the generator
      drawSize
    });
    matchUpIds.push(matchUpId);

    return { matchUpId, ...value };
  });

  let attributes = [...matchUpIds, analysis.sheetName, 'CONTAINER'];
  let result = generateStructureId({ attributes });
  const { structureId: containerStructureId } = result;

  attributes = [...matchUpIds, analysis.sheetName, 'ITEM'];
  result = generateStructureId({ attributes });
  const { structureId: itemStructureId } = result;

  const structure = {
    structures: [{ structureId: itemStructureId, matchUps, positionAssignments }],
    structureId: containerStructureId,
    finishingPositions: 'WATERFALL',
    structureType: 'CONTAINER',
    structureName: 'MAIN'
  };

  return {
    participants,
    structure
  };
}
