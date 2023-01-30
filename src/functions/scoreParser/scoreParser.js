import { isValidPattern } from './validPatterns';
import { transforms } from './transforms';

let invalid = [];

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

// secondPass is used to process only numbers which have been extracted from strings
const secondPass = ['handleNumeric', 'separateScoreBlocks', 'sensibleSets', 'superSquare'];

export function getInvalid() {
  return invalid;
}
export function dumpInvalid() {
  invalid = [];
}

export function tidyScore({ score: incomingScore, stepLog, fullLog, profile, identifier }) {
  let matchUpStatus, result, attributes;
  const modifications = [];

  let score = incomingScore;

  const doProcess = (methods) => {
    methods.forEach((method) => {
      result = transforms[method]({
        profile, // config object compatible with provider profiles
        identifier, // optional identifier (used in test harness)
        matchUpStatus,
        attributes,
        score
      });
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
    if (attributes?.removed) {
      score = score + attributes.removed;
      attributes.removed = undefined;
    }
    doProcess(secondPass);

    isValid = isValidPattern(score);
    if (!isValid) {
      invalid.push(incomingScore);
      score = '';
    }
  }

  return { score, matchUpStatus: matchUpStatus?.toUpperCase(), modifications, isValid };
}
