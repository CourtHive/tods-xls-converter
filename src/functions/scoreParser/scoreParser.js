import { transforms } from './transforms';
import { scoreParser } from './tidyScore';

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

export function tidyScore(score, stepLog, fullLog) {
  let matchUpStatus, result;

  processingOrder.forEach((method) => {
    result = transforms[method]({ score, matchUpStatus });
    if (stepLog && (fullLog || result.score !== score || result.matchUpStatus !== matchUpStatus)) {
      if (matchUpStatus) {
        console.log({ score: result.score, matchUpStatus }, method);
      } else {
        console.log({ score: result.score }, method);
      }
    }
    if (result.matchUpStatus) matchUpStatus = result.matchUpStatus;
    score = result.score;
  });

  score = scoreParser.tidyScore(score);
  if (stepLog) console.log({ score }, 'tidyScore');

  return { score, matchUpStatus };
}

export function transformScore(score) {
  return scoreParser.transformScore(score).transformed_score;
}
