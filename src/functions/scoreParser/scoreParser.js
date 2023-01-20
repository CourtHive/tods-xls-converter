import { punctuationAdjustments } from './punctuationAdjustments';
import { handleBracketSpacing } from './handleBracketSpacing';
import { joinFloatingTiebreak } from './joinFloatingTiebreak';
import { properTiebreak } from './properTiebreak';
import { containedSets } from './containedSets';
import { sensibleSets } from './sensibleSets';
import { superSquare } from './superSquare';
import { scoreParser } from './tidyScore';
import {
  excisions,
  handleGameSeparation,
  handleRetired,
  handleSetSlashSeparation,
  handleSpaceSeparator,
  handleTiebreakSlashSeparation,
  handleWalkover,
  matchKnownPatterns,
  parseSuper,
  removeDanglingBits,
  removeErroneous,
  replaceOh,
  separateScoreBlocks
} from './transforms';

const transforms = {
  handleTiebreakSlashSeparation: handleTiebreakSlashSeparation,
  handleSetSlashSeparation: handleSetSlashSeparation,
  punctuationAdjustments: punctuationAdjustments,
  handleGameSeparation: handleGameSeparation,
  joinFloatingTiebreak: joinFloatingTiebreak,
  handleBracketSpacing: handleBracketSpacing,
  handleSpaceSeparator: handleSpaceSeparator,
  separateScoreBlocks: separateScoreBlocks,
  matchKnownPatterns: matchKnownPatterns,
  removeDanglingBits: removeDanglingBits,
  removeErroneous: removeErroneous,
  handleWalkover: handleWalkover,
  properTiebreak: properTiebreak,
  handleRetired: handleRetired,
  containedSets: containedSets,
  sensibleSets: sensibleSets,
  superSquare: superSquare,
  excisions: excisions,
  replaceOh: replaceOh
};

const processingOrder = [
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

export function tidyScore(score, stepLog) {
  let matchUpStatus, result;

  if (typeof score === 'number') {
    score = score.toString().toLowerCase();

    if (!(score.length % 2)) {
      score = chunkArray(score.split(''), 2)
        .map((part) => part.join(''))
        .join(' ');
    } else {
      score = parseSuper(score) || score;
    }
  }
  score = score.toString().toLowerCase();

  processingOrder.forEach((method) => {
    result = transforms[method]({ score, matchUpStatus });
    if (result.matchUpStatus) matchUpStatus = result.matchUpStatus;
    score = result.score;
    if (stepLog) console.log({ score }, method);
  });

  score = scoreParser.tidyScore(score);
  if (stepLog) console.log({ score }, 'tidyScore');

  return { score, matchUpStatus };
}

export function transformScore(score) {
  return scoreParser.transformScore(score).transformed_score;
}

export function chunkArray(arr, chunksize) {
  return arr.reduce((all, one, i) => {
    const ch = Math.floor(i / chunksize);
    all[ch] = [].concat(all[ch] || [], one);
    return all;
  }, []);
}
