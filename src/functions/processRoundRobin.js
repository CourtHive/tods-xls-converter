import { getIndividualParticipant, getPairParticipant } from './getIndividualParticipant';
import { generateMatchUpId, generateStructureId } from '../utilities/hashing';
import { utilities, matchUpStatusConstants } from 'tods-competition-factory';
import { onlyAlpha } from '../utilities/convenience';
import { getLoggingActive } from '../global/state';
import { normalizeName } from 'normalize-text';
import { getRow } from './sheetAccess';

import { TOURNAMENT_NAME } from '../constants/attributeConstants';
import { POSITION } from '../constants/columnConstants';
import { SUCCESS } from '../constants/resultConstants';
import { ROUND } from '../constants/sheetElements';
import { MISSING_VALUES } from '../constants/errorConditions';

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

  const { structure, participants, error } = getRoundRobinValues(analysis, profile, sheet);
  if (structure) analysis.structureId = structure.structureId;

  if (error) return { error };

  return { analysis, hasValues: true, structures: [structure], participants, ...SUCCESS };
}

export function getRoundRobinValues(analysis, profile, sheet) {
  const makeHash = (arr) => arr.join('|');
  const breakHash = (str) => str.split('|');

  const frequencyColumns = Object.values(analysis.valuesMap).filter((columns) => columns.length === 2);
  const firstColumn = frequencyColumns.flat(Infinity).sort()[0];
  const hasFirstColumn = (columns) => columns.includes(firstColumn);
  const uniqueFreqencyColumns = utilities.unique(frequencyColumns.filter(hasFirstColumn).map(makeHash)).map(breakHash);
  const commonFirstColumn =
    uniqueFreqencyColumns.every((frequency) => frequency[0] === firstColumn) && uniqueFreqencyColumns.length > 1;
  const resultsColumns = uniqueFreqencyColumns
    .map((frequency) => frequency.length === 2 && frequency[1])
    .filter(Boolean);
  const uniqueResultsColumns = utilities.unique(resultsColumns).length === uniqueFreqencyColumns.length;
  const participantsCount = uniqueFreqencyColumns.length;

  if (!uniqueResultsColumns) return { error: 'Round Robin result columns are not unique' };
  if (!commonFirstColumn) return { error: 'Round Robin no common first column' };

  const positionColumnRows = analysis.columnProfiles.find(({ attribute, character }) => {
    return [attribute, character].includes(POSITION);
  })?.rows;

  if (!positionColumnRows) return { error: MISSING_VALUES, positionColumnRows: false };

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
        // return keyMap ? Object.keys(keyMap).map(getRow).sort(utilities.numericSort).slice(1) : [];
        return keyMap
          ? Object.keys(keyMap)
              .map(getRow)
              .sort(utilities.numericSort)
              .filter((row) => row >= minRow)
          : [];
      })
      .flat(Infinity)
      .sort(utilities.numericSort)
  );

  const rowsWithinBounds = resultRows.every((row) => row >= minRow && row <= maxRow);
  if (!rowsWithinBounds) return { error: 'Results values out of bounds' };

  const positionAssignments = [];
  const positionedMatchUps = {};
  const positionNameMap = {};
  const participantsMap = {};

  const nameSeparator = profile.doubles?.nameSeparator || '/';
  const doublesSeparators = profile.doubles?.regexSeparators || ['/'];

  // const nameValues = Object.keys(analysis.valuesMap);
  const nameValues = analysis.multiColumnValues;
  const keyMap = Object.assign({}, ...analysis.columnProfiles.map(({ keyMap }) => keyMap));
  const nameValueKeys = Object.keys(keyMap).filter((key) => nameValues.includes(keyMap[key]));
  const foundSeparators = nameValueKeys.map((key) => {
    const value = sheet[key].v;
    const doublesNameSeparator = doublesSeparators.find((separator) => {
      const x = new RegExp(separator);
      return x.test(value);
    });
    if (doublesNameSeparator) {
      const pairNames = value.split(new RegExp(doublesNameSeparator));
      return { doublesNameSeparator, pairNames };
    }
  });

  const uniqueFoundSeparators = utilities.unique(foundSeparators.map((separator) => separator?.doublesNameSeparator));
  const uniqueSeparator = foundSeparators.length > 1 && uniqueFoundSeparators.length === 1 && uniqueFoundSeparators[0];
  const pairNames = uniqueSeparator && foundSeparators.map(({ pairNames }) => pairNames);

  let isDoubles = nameValues.length / participantsCount === 2;
  const parseableNames = isDoubles ? utilities.chunkArray(nameValues, 2) : pairNames || nameValues;

  parseableNames.slice(0, nameValues.length).map((name, positionIndex) => {
    if (!name) return;
    let mappedName = name;
    let participantName;
    let participantId;

    if (Array.isArray(name)) {
      mappedName = name.join(nameSeparator);
      const individualParticipants = name.map((n) => getIndividualParticipant({ name: n }));
      individualParticipants.forEach((participant) => (participantsMap[participant.participantId] = participant));
      const pairParticipant = getPairParticipant({ individualParticipants });
      participantName = pairParticipant.participantName;
      participantId = pairParticipant.participantId;
      participantsMap[participantId] = pairParticipant;

      // create a valuesMap entry for the doubles pair name
      analysis.valuesMap[mappedName] = analysis.valuesMap[nameValues[positionIndex]];
    } else {
      participantName = normalizeName(name);
      const participant = getIndividualParticipant({ name });
      participantId = participant.participantId;
      participantsMap[participantId] = participant;
    }

    const drawPosition = positionIndex + 1;
    if (drawPosition > positionColumnRows.length) return;

    positionNameMap[drawPosition] = participantName;

    const finishingPosition = finishingPositions?.[positionIndex];
    const positionAssignment = { drawPosition, participantId };
    const extensions = finishingPosition && [{ name: 'participantResults', value: { finishingPosition } }];
    if (extensions) positionAssignment.extensions = extensions;
    positionAssignments.push(positionAssignment);

    const orderedResultsColumns = resultsColumns.sort();
    // get resultsColumns in which they do not appear
    const targetResultColumns = orderedResultsColumns.filter(
      (column) => !analysis.valuesMap[mappedName].includes(column)
    );

    for (const column of targetResultColumns) {
      const columnProfile = findColumnProfile(column);
      const columnIndex = orderedResultsColumns.indexOf(column);
      if (columnIndex + 1 === drawPosition) continue;

      const positionRow = positionColumnRows?.[positionIndex];

      if (positionRow) {
        const resultRow = positionRow + 1; // TODO: implement findInRowRange and determine rowRange from providerProfile
        const result = columnProfile.keyMap[`${column}${resultRow}`];
        const resultIsMatchOutcome =
          result &&
          onlyAlpha(result, profile) &&
          profile.matchOutcomes.some((outcome) => outcome === result.toLowerCase());

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
        const matchUpStatus =
          result && walkover ? (result.toLowerCase().includes(walkover) ? WALKOVER : undefined) : undefined;

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
  const matchUps = Object.values(positionedMatchUps).map((matchUp) => {
    const participantNames = matchUp.drawPositions.map((drawPosition) => positionNameMap[drawPosition]);
    const { matchUpId } = generateMatchUpId({
      additionalAttributes: [analysis.sheetName, ...analysis.multiColumnValues],
      participantNames, // this will be the unique component for this sheet/structure in the generator
      drawSize
    });
    matchUpIds.push(matchUpId);

    return { matchUpId, ...matchUp };
  });

  let attributes = [...matchUpIds, analysis.sheetName, 'CONTAINER'];
  let result = generateStructureId({ attributes });
  const { structureId: containerStructureId } = result;

  attributes = [...matchUpIds, analysis.sheetName, 'ITEM'];
  result = generateStructureId({ attributes });
  const { structureId: itemStructureId } = result;

  const structure = {
    structures: [{ structureId: itemStructureId, structureType: 'ITEM', matchUps, positionAssignments }],
    structureId: containerStructureId,
    finishingPositions: 'WATERFALL',
    structureType: 'CONTAINER',
    structureName: 'MAIN'
  };

  const participants = Object.values(participantsMap);
  if (getLoggingActive('matchUps')) {
    console.log({ matchUps, positionAssignments, participants });
  }

  return {
    participants,
    structure
  };
}
