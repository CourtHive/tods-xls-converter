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

  // -------------------------------
  score = transforms.punctuationAdjustments(score); // Must occure before removeDanglingBits
  if (stepLog) console.log({ score }, 'punctuationAdjustments');
  // -------------------------------

  score = transforms.excisions(score);
  if (stepLog) console.log({ score }, 'excisions');
  score = transforms.handleSpaceSeparator(score);
  if (stepLog) console.log({ score }, 'handleSpaceSeparator');
  score = transforms.removeDanglingBits(score);
  if (stepLog) console.log({ score }, 'removeDanglingBits');

  result = transforms.handleWalkover(score);
  score = result.score;
  if (result.matchUpStatus) matchUpStatus = result.matchUpStatus;

  result = transforms.handleRetired(score);
  score = result.score;
  if (result.matchUpStatus) matchUpStatus = result.matchUpStatus;
  if (stepLog) console.log({ score }, 'handleMatchUpStatus');

  score = transforms.replaceOh(score);
  score = transforms.handleBracketSpacing(score);
  if (stepLog) console.log({ score }, 'handleBracketeSpacing');
  score = transforms.matchKnownPatterns(score);
  if (stepLog) console.log({ score }, 'matchKnownPatterns');
  score = transforms.containedSets(score);
  if (stepLog) console.log({ score }, 'containedSets');
  score = transforms.separateScoreBlocks(score);
  if (stepLog) console.log({ score }, 'separateScoreBlocks');
  score = transforms.handleGameSeparation(score);
  if (stepLog) console.log({ score }, 'handleGameSeparation');
  score = transforms.removeErroneous(score);
  if (stepLog) console.log({ score }, 'removeErroneous');
  score = transforms.joinFloatingTiebreak(score);
  if (stepLog) console.log({ score }, 'joinFloatingTiebreak');
  score = transforms.handleSetSlashSeparation(score);
  if (stepLog) console.log({ score }, 'handleSetSlashSeparation');
  score = transforms.handleTiebreakSlashSeparation(score);
  if (stepLog) console.log({ score }, 'handleTiebreakSlashSeparation');
  score = transforms.properTiebreak(score, matchUpStatus);
  if (stepLog) console.log({ score }, 'properTiebreak');
  score = transforms.sensibleSets(score, matchUpStatus);
  if (stepLog) console.log({ score }, 'sensibleSets');
  score = transforms.superSquare(score);
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
