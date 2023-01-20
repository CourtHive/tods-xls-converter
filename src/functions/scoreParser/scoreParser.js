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
  'removeDanglingBits'
  /*
  'handleWalkover',
  'handleRetired',
  'replaceOh',
  'handleBracketSpacing',
  'matchKnownPatterns',
  'containedSets',
  'separateScoreBlocks'
  'joinFloatingTiebreak',
  'handleSetSlashSeparation',
  'handleTiebreakSlashSeparation',
  'properTiebreak',
  'sensibleSets'
  */
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

  /*
  // -------------------------------
  result = transforms.punctuationAdjustments({ score }); // Must occure before removeDanglingBits
  score = result.score;
  if (stepLog) console.log({ score }, 'punctuationAdjustments');
  // -------------------------------
  */

  processingOrder.forEach((method) => {
    result = transforms[method]({ score, matchUpStatus });
    if (result.matchUpStatus) matchUpStatus = result.matchUpStatus;
    score = result.score;
    if (stepLog) console.log({ score }, method);
  });

  /*
  result = transforms.excisions({ score });
  score = result.score;
  if (stepLog) console.log({ score }, 'excisions');
  result = transforms.handleSpaceSeparator({ score });
  score = result.score;
  if (stepLog) console.log({ score }, 'handleSpaceSeparator');
  result = transforms.removeDanglingBits({ score });
  score = result.score;
  if (stepLog) console.log({ score }, 'removeDanglingBits');
  */

  result = transforms.handleWalkover({ score });
  score = result.score;
  if (result.matchUpStatus) matchUpStatus = result.matchUpStatus;

  result = transforms.handleRetired({ score });
  score = result.score;
  if (result.matchUpStatus) matchUpStatus = result.matchUpStatus;
  if (stepLog) console.log({ score }, 'handleMatchUpStatus');

  result = transforms.replaceOh({ score });
  score = result.score;
  result = transforms.handleBracketSpacing({ score });
  score = result.score;
  if (stepLog) console.log({ score }, 'handleBracketeSpacing');
  result = transforms.matchKnownPatterns({ score });
  score = result.score;
  if (stepLog) console.log({ score }, 'matchKnownPatterns');
  result = transforms.containedSets({ score });
  score = result.score;
  if (stepLog) console.log({ score }, 'containedSets');
  result = transforms.separateScoreBlocks({ score });
  score = result.score;
  if (stepLog) console.log({ score }, 'separateScoreBlocks');
  result = transforms.handleGameSeparation({ score });
  score = result.score;
  if (stepLog) console.log({ score }, 'handleGameSeparation');
  result = transforms.removeErroneous({ score });
  score = result.score;
  if (stepLog) console.log({ score }, 'removeErroneous');
  result = transforms.joinFloatingTiebreak({ score });
  score = result.score;
  if (stepLog) console.log({ score }, 'joinFloatingTiebreak');
  result = transforms.handleSetSlashSeparation({ score });
  score = result.score;
  if (stepLog) console.log({ score }, 'handleSetSlashSeparation');
  result = transforms.handleTiebreakSlashSeparation({ score });
  score = result.score;
  if (stepLog) console.log({ score }, 'handleTiebreakSlashSeparation');
  result = transforms.properTiebreak({ score, matchUpStatus });
  score = result.score;
  if (stepLog) console.log({ score }, 'properTiebreak');
  result = transforms.sensibleSets({ score, matchUpStatus });
  score = result.score;
  if (stepLog) console.log({ score }, 'sensibleSets');
  result = transforms.superSquare({ score });
  score = result.score;
  if (stepLog) console.log({ score }, 'superSquare');

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
