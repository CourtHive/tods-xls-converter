export const cleanScore = (function () {
  // eslint-disable-next-line no-useless-escape
  let clean = (score) => score?.replace(/\,/g, ' ').replace(/\;/g, ' ').replace(/\./g, ' ');

  let parseScore = (score, tiebreak, ceiling = 7) => {
    let set;
    let scores =
      score.indexOf('-') > 0
        ? score.split('-')
        : score.indexOf('/') > 0
        ? score.split('/')
        : score.indexOf(':') > 0
        ? score.split(':')
        : score.indexOf('.') > 0
        ? score.split('.')
        : score.length === 2
        ? score.split('')
        : [];
    scores = scores.map((m) => +m);

    if (scores.filter((p) => isNaN(p)).length) return false;
    if (scores.length !== 2) return false;

    /* test if any number is greater than ceiling */
    if (scores.map((m) => +m > ceiling).filter((f) => f).length) {
      if (!supertiebreak(scores)) return false;
      set = { type: 'supertiebreak', score: scores.join('-') };
    } else {
      set = { type: 'normal', score: scores.join('-') };
    }
    if (tiebreak) set.score += `(${tiebreak})`;
    return set;
  };

  let removeBrackets = (set_score) => {
    let brackets = /\[(\d+)-(\d+)\]/;
    if (!brackets.test(set_score)) return set_score;
    const withoutBrackets = brackets
      .exec(set_score)
      .filter((f, i) => i && i < 3)
      .join('-');
    return withoutBrackets;
  };

  let scoreDiff = (scores) => {
    if (!Array.isArray(scores) || scores.length !== 2) return false;
    return Math.abs(scores.reduce((a, b) => +a - +b));
  };

  let supertiebreak = (scores) => {
    if (!Array.isArray(scores) || scores.length !== 2) return false;
    // at least one score must be greater than or equal to 10
    let gt10 = scores.map((m) => +m >= 10).filter((f) => f).length;
    let diff = scoreDiff(scores);
    if (!gt10) return false;
    if (gt10 === 2 && diff !== 2) return false;
    return true;
  };

  let supertiebreakSet = (set_score) => {
    set_score = removeBrackets(set_score);
    let set = parseScore(set_score);
    return set && set.type === 'supertiebreak' ? set.score : false;
  };

  let parseTiebreak = (set_score, totals = [9, 13]) => {
    let tiebreak_score;
    // eslint-disable-next-line no-useless-escape
    let tiebreak = /^([\d\:\.\-\/]+)\((\d+)\)/;
    // eslint-disable-next-line no-useless-escape
    let backwards = /^\((\d+)\)([\d\:\.\-\/]+)/;
    let validSetScore = (ss) => {
      const setTotal = ss
        .match(/[\d+]/g)
        .map((m) => +m)
        .reduce((a, b) => +a + +b);
      const valid = totals.includes(setTotal);
      return valid;
    };

    if (backwards.test(set_score)) {
      let sst = backwards.exec(set_score);
      if (validSetScore(sst[2])) {
        set_score = sst[2];
        tiebreak_score = sst[1];
      }
    } else if (tiebreak.test(set_score)) {
      let sst = tiebreak.exec(set_score);
      if (validSetScore(sst[1])) {
        set_score = sst[1];
        tiebreak_score = sst[2];
      }
    }
    return { set_score, tiebreak_score };
  };

  let normalSet = (set_score) => {
    let tiebreak_score;
    set_score = set_score.replace(/O/g, '0');

    let alpha = /[a-zA-Z]+/;
    if (alpha.test(set_score)) return false;

    ({ set_score, tiebreak_score } = parseTiebreak(set_score));

    set_score = removeBrackets(set_score);
    let set = parseScore(set_score, tiebreak_score);
    return set && set.type === 'normal' ? set.score : false;
  };

  // set score is a standalone tiebreak score
  let tiebreakScore = (set_score) => /^\(\d+\)$/.test(set_score);

  let normalSets = (set_scores) => {
    let match_score = set_scores?.map(normalSet).filter((f) => f);
    if (match_score?.length === set_scores?.length) return match_score;

    if (set_scores?.length === 1 && set_scores?.[0].length === 4) {
      let nums = set_scores[0].split('');
      if (+nums[0] === 6 && +nums[2] === 6) {
        set_scores = [nums.slice(0, 2).join(''), nums.slice(2).join('')];
      }
    }

    let last_set = set_scores[set_scores.length - 1];
    if (set_scores.length > 1 && tiebreakScore(last_set)) {
      let tiebreak = set_scores.pop();
      last_set += tiebreak;
    }

    if (set_scores.length === 4) {
      if (+set_scores[2] >= 10 && scoreDiff(set_scores.slice(2, 4)) >= 2) {
        let score = set_scores.pop();
        set_scores[2] = `[${set_scores[2]}-${score}]`;
      }
    }
    match_score = set_scores.map(normalSet).filter((f) => f);
    if (match_score.length === set_scores.length) return match_score;

    // normalize last set supertiebreak with no divider
    let digits = last_set.match(/\d+/g);
    if (+last_set[0] === 1 && digits) {
      let nums = digits.join('').split('');
      if (nums.length >= 3 && nums.length <= 4) {
        let scores = [nums.slice(0, 2).join(''), nums.slice(2).join('')];
        if (scoreDiff(scores) >= 2 && +scores[0] >= 10) {
          set_scores.pop();
          set_scores.push(scores.join('-'));
        }
      }
    }

    match_score = set_scores.map(normalSet).filter((f) => f);
    if (match_score.length === set_scores.length) return match_score;
  };

  let endedEarly = (score) => {
    let alpha = score.match(/[A-Za-z]+/g);
    if (!Array.isArray(alpha) || !alpha.length) return false;
    let termination = ['wo', 'abandoned', 'ret', 'def', 'default'];
    let outcome = alpha.join('').toLowerCase();
    return termination.indexOf(outcome) >= 0 ? outcome : false;
  };

  let walkout = (set_scores) => {
    if (set_scores?.length < 2) return false;
    let last2 = set_scores?.slice(set_scores.length - 2, set_scores.length);
    if (last2?.join('').toLowerCase() === 'wo') return true;
  };

  let wo = (score) =>
    walkout(
      clean(score)
        .split(' ')
        .filter((f) => f)
    );

  let okScore = (set_scores) => {
    // all sets are "normal"
    let test_scores = set_scores?.slice();
    let normal = normalSets(test_scores);
    if (normal) return normal;
    if (walkout(set_scores)) return ['wo'];

    let last_set = test_scores?.pop();
    normal = normalSets(test_scores);
    if (!normal) return false;

    let ended_early = endedEarly(last_set);
    if (ended_early) {
      normal.push(last_set);
      return normal;
    }

    let supertiebreak = supertiebreakSet(last_set);
    if (supertiebreak) {
      normal.push(supertiebreak);
      return normal;
    }
    return false;
  };

  let normalize = (score) =>
    okScore(
      clean(score)
        ?.split(' ')
        .filter((f) => f)
    );

  return { walkout: wo, normalize, endedEarly };
})();

export function normalizeScore(score) {
  let clean_score = cleanScore.normalize(score);
  if (clean_score) return clean_score.join(' ');
  return score;
}
