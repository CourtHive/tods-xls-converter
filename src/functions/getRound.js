import { matchUpStatusConstants, mocksEngine, utilities } from 'tods-competition-factory';
import { getPotentialResult, isNumeric, isScoreLike } from '../utilities/identification';
import { getParticipantValues } from './getParticipantValues';
import { audit, getLoggingActive } from '../global/state';
import { generateMatchUpId } from '../utilities/hashing';
import { getAdvanceTargets } from './getAdvanceTargets';
import { pushGlobalLog } from '../utilities/globalLog';
import { tidyScore } from './scoreParser/scoreParser';
import { tidyLower } from '../utilities/convenience';
import { pRankReducer } from './pRankReducer';
import { getRow } from './sheetAccess';

const { BYE, COMPLETED, DOUBLE_WALKOVER, WALKOVER } = matchUpStatusConstants;

export function getRound({
  columnsWithParticipants,
  subsequentColumnLimit,
  confidenceThreshold,
  positionProgression,
  roundParticipants,
  pairedRowNumbers,
  roundColumns,
  columnIndex,
  roundNumber,
  isPreRound,
  roundRows,
  analysis,
  profile
}) {
  const finalRound = pairedRowNumbers.length === 1;
  const finalMatchUp = finalRound && columnIndex + 1 === roundColumns.length;

  let columnsConsumed = 0; // additional columns processed (when result data spans multiple columns)
  let rangeAdjustment;

  const providerWalkover = tidyLower(profile.matchUpStatuses?.walkover || WALKOVER);
  const providerDoubleWalkover = tidyLower(profile.matchUpStatuses?.doubleWalkover || DOUBLE_WALKOVER);

  const indexedParticipantsAdvancing = {};
  const advancingParticipants = [];
  const advancingPositions = [];
  const participantDetails = [];
  const matchUps = [];

  const relevantSubsequentColumns = roundColumns.slice(columnIndex + 1).slice(0, subsequentColumnLimit);
  let subsequentCount = relevantSubsequentColumns.map((column) => columnsWithParticipants[column]);

  // calculation whether to consider two columns changes when there is a folded final
  const foldedFinalAddition =
    (relevantSubsequentColumns.length === 2 &&
      relevantSubsequentColumns[1] === roundColumns[roundColumns.length - 1] &&
      columnsWithParticipants[relevantSubsequentColumns[1]] > roundParticipants.flat().length &&
      columnsWithParticipants[relevantSubsequentColumns[1]] - roundParticipants.flat().length) ||
    0;

  const overlap = utilities.intersection(relevantSubsequentColumns, Object.keys(columnsWithParticipants));

  const prospectiveResults = finalRound || relevantSubsequentColumns.length;

  if (prospectiveResults) {
    // -------------------------------------------------------------------------------------------------
    // ACTION: pre-process subsequent column values to determine if any results are combined with advancing participant
    // TODO: consider proactively characterizing all values to facilitate meta analysis before pulling values
    const potentialResults = [];
    let columnValues = pairedRowNumbers.map((pair, columnIndex) => {
      let start = pair[0];
      let end = pair[1] + 1;
      if (analysis.separationFactor > 2) {
        rangeAdjustment = true;
        start += 1;
      }
      if (analysis.isSeparatedPersonsDoubles) {
        rangeAdjustment = true;
        end += 1;
      }

      const rowRange = utilities.generateRange(start, end);
      let pv = relevantSubsequentColumns.map((relevantColumn) => {
        const keyMap = analysis.columnProfiles.find(({ column }) => column === relevantColumn).keyMap;
        return Object.keys(keyMap)
          .filter((key) => rowRange.includes(getRow(key)))
          .map((key) => keyMap[key]);
      });
      const pr = pv[0]
        ?.map((value) => {
          const { potentialPosition, potentialResult } = getPotentialResult(value, roundNumber);

          return potentialPosition && potentialResult && { columnIndex, potentialPosition, potentialResult };
        })
        .filter(Boolean);
      if (pr?.length) potentialResults.push(pr);

      return pv;
    });

    if (relevantSubsequentColumns.length === 2) {
      const lengthGreaterThanOne = (value) => value.toString().length > 1;
      // remove all values which are duplicated across columns
      columnValues = columnValues.map((row) => [row[0], row[1].filter((v) => !row[0].includes(v))]);
      // NOTE: not handling situations where doubles participants span two rows
      subsequentCount = columnValues.reduce(
        (count, row) => {
          count[0] += row[0].filter(lengthGreaterThanOne).length;
          count[1] += row[1].filter(lengthGreaterThanOne).length;

          // handle situations where some scoreLike results are invisible
          const multipleScoreLike = row.flat().filter(isScoreLike).length;
          count[2] -= multipleScoreLike - 1;
          return count;
        },
        [0, 0, 0]
      );
    }

    // START: Position Progression
    const pairedPotentialPositions = roundParticipants.map((pair) => pair.map(({ drawPosition }) => drawPosition));
    const allPotentialPositions = pairedPotentialPositions.flat();
    const ppMap = columnValues
      .map((column, columnIndex) => {
        let potentialPosition;
        let potentialResult;
        column.forEach((values) => {
          const ptp = values.find((v) => allPotentialPositions.includes(v));
          if (ptp && !potentialPosition) {
            potentialPosition = ptp;
          }
          const ptr = values.find((v) => !allPotentialPositions.includes(v));
          if (ptr && isScoreLike(ptr) && !potentialResult) {
            potentialResult = ptr;
          }
        });
        if (potentialPosition) return [{ potentialPosition, potentialResult, columnIndex }];
      })
      .filter(Boolean);

    // integrity check for pure progressed positions (not mashed with scores)
    const progressedPositions = ppMap.flat().map(({ potentialPosition }) => potentialPosition);
    const isSorted = (arr) => arr.every((v, i, a) => !i || a[i - 1] <= v);
    const validProgressedPositions = progressedPositions.length && isSorted(progressedPositions);
    if (validProgressedPositions) potentialResults.push(...ppMap);

    // must be sorted in case those pushed by ppMap are out of order
    potentialResults.sort((a, b) => a[0]?.columnIndex - b[0]?.columnIndex);

    const potentialPositions = potentialResults
      .map((potential) => {
        const potentialPosition = potential[0]?.potentialPosition;
        if (isNumeric(potentialPosition)) return potentialPosition;
      })
      .filter(Boolean);
    const validPotentialPositions = pairedPotentialPositions.filter(
      (pairedPositions, i) => !potentialPositions[i] || pairedPositions.includes(potentialPositions[i])
    );
    const advancingPotentialPositions = [];
    if (validPotentialPositions.length) {
      let lastPotentialPosition = 0;
      potentialPositions.forEach((pp) => {
        // do not accept positions which are out of order
        // next potentialPositions must be greater than the previous
        if (pp > lastPotentialPosition) {
          lastPotentialPosition = pp;
          advancingPotentialPositions.push(pp);
        }
      });
    }

    advancingPotentialPositions.forEach((pos) => {
      const positionIndex = potentialResults.flat().find((r) => r.potentialPosition === pos)?.columnIndex;
      if (positionIndex !== undefined)
        indexedParticipantsAdvancing[positionIndex] = roundParticipants
          .flat()
          .find(({ drawPosition }) => drawPosition === pos);
    });
    // END: Position Progression

    // considerTwo recognizes when the total of the values in two subsequent columns
    // is less than or equal to the expected number of values (roundParticipants * 2)
    // which is the number of participants and the number of results for each advancing participant
    const considerTwo =
      !subsequentCount[0] ||
      subsequentCount.reduce((a, b) => a + b, 0) <= roundParticipants.flat().length + foldedFinalAddition;

    const log = getLoggingActive('columnValues');
    if (log && (!log.roundNumber || log.roundNumber === roundNumber)) {
      console.log(columnValues);
      console.log({ subsequentCount, roundNumber, considerTwo });
    }

    if (potentialResults.length > 1) {
      // IF: there are participantNames combined with results
      // AND: the subsequent column contains potentialParticipants
      // THEN: limit the column look ahead to only one subsequent column
      const targetColumn = roundColumns[columnIndex + 2];

      // ~~~~
      // TODO: replace with getColumnParticipantConfidence({ targetColumn, confidenceThreshold, roundParticipants, analysis})
      const nextColumnProfile = analysis.columnProfiles.find(({ column }) => column === targetColumn);
      const nextColumnValues = nextColumnProfile?.values;
      const roundParticipantValues = roundParticipants.flat().map(getParticipantValues);
      const withConfidence = nextColumnValues
        ?.flatMap((value) =>
          roundParticipantValues.map((pValues) => pRankReducer({ pValues, value, confidenceThreshold }))
        )
        .filter(({ confidence }) => confidence);
      // ~~~~

      if (withConfidence?.length) {
        columnValues = columnValues.map((c) => c.slice(0, 1));

        if (getLoggingActive('potentialResults')) {
          const message = `participantName (result) { roundNumber: ${roundNumber} }`;
          pushGlobalLog({
            method: 'notice',
            color: 'brightyellow',
            keyColors: { message: 'cyan', attributes: 'brightyellow' },
            message
          });
        }
      }
    } else if (overlap.length > 1 && !considerTwo) {
      columnValues = columnValues.map((c) => c.slice(0, 1));
    }
    // -------------------------------------------------------------------------------------------------

    // -------------------------------------------------------------------------------------------------
    // ACTION: process all roundPositions
    pairedRowNumbers?.forEach((_, pairIndex) => {
      const consideredParticipants = roundParticipants?.[pairIndex]?.filter(Boolean);
      if (!consideredParticipants) {
        advancingParticipants.push({});
        return;
      }

      let advancingParticipant;

      const isBye = consideredParticipants?.find(({ isByePosition }) => isByePosition);
      let potentialValues = columnValues[pairIndex];

      let advancedSide, result;

      const roundPosition = pairIndex + 1;
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      const finalMatchUpPotentialValues = () => {
        const relevantColumns = roundColumns.slice(columnIndex - 1).reverse();
        potentialValues = relevantColumns.map((relevantColumn, relevantIndex) => {
          const relevantProgression = roundRows[roundRows.length - relevantIndex - 1]?.flat() || [];
          const pairCount = relevantProgression.length / 2;
          const relevantPair = relevantProgression.slice(pairCount - 1, pairCount + 1);

          // NOTE: add buffer to avoid multiple result values
          const pairRange = utilities.generateRange(
            relevantPair[0] + 3 + (relevantIndex ? 0 : 2),
            relevantPair[1] + 1 - 3 - (relevantIndex ? 0 : 2)
          );
          const keyMap = analysis.columnProfiles.find(({ column }) => column === relevantColumn).keyMap;

          return Object.keys(keyMap)
            .filter((key) => pairRange.includes(getRow(key)))
            .map((key) => keyMap[key]);
        });
      };
      // ACTION: if column contains one matchUp (final) then consider value may occur in prior or current colummn
      if (finalMatchUp) finalMatchUpPotentialValues();
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

      if (!positionProgression) {
        const advanceTargets = getAdvanceTargets({
          providerDoubleWalkover,
          consideredParticipants,
          confidenceThreshold,
          providerWalkover,
          potentialValues,
          roundPosition,
          roundNumber,
          analysis,
          profile
        });
        if (advanceTargets.columnsConsumed > columnsConsumed) {
          columnsConsumed = advanceTargets.columnsConsumed;
        }

        ({ advancedSide, result } = advanceTargets);

        if (finalMatchUp && (!advancedSide || !result)) {
          // console.log({ finalRound, consideredParticipants, potentialValues });
          // console.log({ finalMatchUp }, 'No Result');
          // console.log({ sheetName: analysis.sheetName, pairedRowNumbers, potentialValues });
        }

        if (advancedSide) {
          if (roundParticipants?.length) {
            advancingParticipant = consideredParticipants[advancedSide - 1];
          }
        }
      }

      const drawPositions = consideredParticipants?.map(({ drawPosition }) => drawPosition).filter(Boolean);
      if (!advancedSide && (potentialPositions.length || advancingPotentialPositions.length)) {
        const drawPosition = indexedParticipantsAdvancing[pairIndex]?.drawPosition;
        if (drawPosition && drawPositions.includes(drawPosition)) {
          advancingParticipant = indexedParticipantsAdvancing[pairIndex];
          advancingPositions.push(advancingParticipant.drawPosition);
          advancedSide = consideredParticipants.reduce((advanced, considered, index) => {
            return advancingPositions.includes(considered.drawPosition) ? index + 1 : advanced;
          }, undefined);
          const advancedPosition = advancedSide && consideredParticipants[advancedSide - 1].drawPosition;
          result = potentialResults.find((r) => r[0]?.potentialPosition === advancedPosition)?.[0]?.potentialResult;
          if (finalRound && !result) {
            finalMatchUpPotentialValues();
            const potentialScore = potentialValues.flat().find((v) => v !== advancedPosition && isScoreLike(v));
            result = potentialScore;
          }
        }
      }

      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      // ACTION: construct matchUp object; determine matchUpStatus and winningSide
      const matchUp = { roundNumber, roundPosition, drawPositions };

      if (isBye) {
        matchUp.matchUpStatus = BYE;
        const consideredToAdvance = consideredParticipants.find((p) => !p.isByePosition);
        // handle positionProgression scenarios where no valid drawPosition is found
        if (consideredToAdvance && !advancingPositions.includes(consideredToAdvance?.drawPosition)) {
          advancingParticipant = consideredToAdvance;
        }
      } else if (result === providerDoubleWalkover?.toLowerCase()) {
        matchUp.matchUpStatus = DOUBLE_WALKOVER;
      } else if ([providerWalkover, WALKOVER, 'w/o'].map((w) => (w || '').toLowerCase()).includes(result)) {
        matchUp.matchUpStatus = WALKOVER;
        matchUp.winningSide = advancedSide;
      } else if (advancedSide) {
        matchUp.matchUpStatus = COMPLETED;
        matchUp.winningSide = advancedSide;
      } else {
        // console.log('SOMETHING', { lowerResult, roundNumber, roundPosition });
      }
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      // IF: a result exists and the matchUpStatus is NOT a WALKOVER
      // THEN: parse the result to create a TODS score object
      if (matchUp.winningSide && result && ![WALKOVER, DOUBLE_WALKOVER].includes(matchUp.matchUpStatus)) {
        const sideString = matchUp.winningSide === 2 ? 'scoreStringSide2' : 'scoreStringSide1';
        matchUp.score = { [sideString]: result };
        const { score: scoreString, matchUpStatus, isValid } = tidyScore({ score: result, profile, ...analysis });
        if (matchUpStatus) matchUp.matchUpStatus = matchUpStatus;
        const outcome =
          isValid &&
          mocksEngine.generateOutcomeFromScoreString({
            winningSide: matchUp.winningSide,
            scoreString
          }).outcome;
        const stringScore = !outcome?.score?.scoreStringSide1 ? { [sideString]: scoreString } : undefined;
        const score = { ...outcome?.score, ...stringScore };
        matchUp.score = score;
        if (getLoggingActive('scoreAudit')) {
          audit({ scoreString, result, fileName: analysis.fileName });
        }
        if (getLoggingActive('scores')) console.log({ result, scoreString, outcome, score });
      }
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

      if (!result && !isBye) {
        // TODO: in some draws preRound results appear as part of advancedSide participantName
        if (isPreRound) {
          const message = 'check for result at end of advancedSide participantName';
          pushGlobalLog({
            method: 'notice',
            color: 'brightyellow',
            keyColors: { message: 'cyan', attributes: 'brightyellow' },
            message
          });
        } else if (matchUp.winningSide) {
          // if (logging) console.log('No win reason', { resultRow, resultColumn });
        }
      }

      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      // ACTION: if matchUp contains participant names, generate matchUpId and push matchUp
      let pairedParticipantNames = consideredParticipants?.map(({ participantName }) => participantName);
      if (pairedParticipantNames?.filter(Boolean).length) {
        const additionalAttributes = [
          matchUp.drawPositions.reduce((a, b) => a || 0 + b || 0, 0),
          roundPosition,
          roundNumber
        ];
        const result = generateMatchUpId({ participantNames: pairedParticipantNames, additionalAttributes });
        matchUp.matchUpId = result.matchUpId;
        if (result.error) console.log({ error: result.error, matchUp });
        matchUps.push(matchUp);
      }
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      advancingParticipants.push(advancingParticipant || {});
    });
    // -------------------------------------------------------------------------------------------------
  }

  const log = getLoggingActive('matchUps');
  if (log?.roundNumber || log?.logPosition) {
    const filteredMatchUps = matchUps.filter(
      (matchUp) =>
        (!log.roundNumber || log.roundNumber === matchUp.roundNumber) &&
        (!log.roundPosition || log.roundPosition === matchUp.roundPosition)
    );
    if (filteredMatchUps.length) console.log(filteredMatchUps);
  } else if (log) {
    if (matchUps.length) console.log(matchUps);
  }

  if (getLoggingActive('singlePositions')) {
    const missingDrawPosition = matchUps.filter((m) => !m.drawPositions || m.drawPositions.length < 2);
    if (missingDrawPosition.length) console.log(missingDrawPosition);
  }

  if (getLoggingActive('columnValues')) console.log(roundColumns[columnIndex], { columnsConsumed });

  return { matchUps, participantDetails, advancingParticipants, columnsConsumed, rangeAdjustment };
}
