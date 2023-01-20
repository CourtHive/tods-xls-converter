import { scoreSlicer } from './legacyScoreTransforms';
import { transforms } from './transforms';
import { isValidPattern } from './validPatterns';

const processingOrder = [
  'handleNumeric',
  'stringScore',
  'punctuationAdjustments',
  'excisions',
  'handleSpaceSeparator',
  'removeDanglingBits',
  'handleWalkover',
  'handleRetired',
  'replaceOh',
  'handleBracketSpacing',
  'matchKnownPatterns',
  'containedSets',
  'separateScoreBlocks',
  'handleGameSeparation',
  'removeErroneous',
  'joinFloatingTiebreak',
  'handleSetSlashSeparation',
  'handleTiebreakSlashSeparation',
  'properTiebreak',
  'sensibleSets',
  'superSquare'
];

export function tidyScore(score, stepLog, fullLog, identifier) {
  let matchUpStatus, result, attributes;

  processingOrder.forEach((method) => {
    result = transforms[method]({ score, matchUpStatus, attributes });
    if (stepLog && (fullLog || result.score !== score || result.matchUpStatus !== matchUpStatus)) {
      if (matchUpStatus) {
        console.log({ score: result.score, matchUpStatus }, method);
      } else {
        console.log({ score: result.score }, method);
      }
    }

    if (result.matchUpStatus) matchUpStatus = result.matchUpStatus;
    if (result.attributes) attributes = result.attributes;
    score = result.score;
  });

  // check whether legacy sliceAndDice is necessary
  result = scoreSlicer.sliceAndDice(score);
  if (result !== score) {
    if (identifier !== undefined) console.log({ identifier });
    console.log({ result, score }, 'sliceAndDice');
    if (result.length === score.length) {
      result.split('').forEach((char, i) => {
        console.log(char === score[i], char, score[i]);
      });
    } else {
      console.log(result.length, score.length);
    }
    score = result;
  }

  const isValid = isValidPattern(score);

  return { score, matchUpStatus, isValid };
}

export function transformScore(score) {
  return scoreSlicer.transformScore(score).transformed_score;
}
