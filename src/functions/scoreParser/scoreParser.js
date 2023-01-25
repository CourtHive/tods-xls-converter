import { isValidPattern } from './validPatterns';
import { transforms } from './transforms';

const processingOrder = [
  'handleNumeric',
  'handleWalkover',
  'handleRetired',
  'stringScore',
  'punctuationAdjustments',
  'excisions',
  'handleSpaceSeparator',
  'matchKnownPatterns',
  'removeDanglingBits',
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

export function tidyScore(score, stepLog, fullLog) {
  let matchUpStatus, result, attributes;
  const modifications = [];

  processingOrder.forEach((method) => {
    result = transforms[method]({ score, matchUpStatus, attributes });
    const modified = result.score !== score;
    if (modified) {
      modifications.push({ method, score: result.score });
    }

    if (stepLog && (fullLog || modified || result.matchUpStatus !== matchUpStatus)) {
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

  const isValid = isValidPattern(score);
  if (!isValid) score = '';

  return { score, matchUpStatus, modifications, isValid };
}
