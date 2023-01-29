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

const secondPass = ['separateScoreBlocks', 'sensibleSets', 'superSquare'];

export function tidyScore({ score, stepLog, fullLog, profile }) {
  let matchUpStatus, result, attributes;
  const modifications = [];

  const doProcess = (methods) => {
    methods.forEach((method) => {
      result = transforms[method]({ score, matchUpStatus, attributes, profile });
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
  };

  doProcess(processingOrder);

  let isValid = isValidPattern(score);
  if (!isValid) {
    // Hail Mary: extract only the numbers from the string
    score = score.replace(/\D/g, '');
    doProcess(secondPass);

    isValid = isValidPattern(score);
    if (!isValid) score = '';
  }

  return { score, matchUpStatus: matchUpStatus?.toUpperCase(), modifications, isValid };
}
