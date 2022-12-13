export const scoreParser = (function () {
  let fx = {};

  let counters = {
    scores: {},
    transformed: {},
    transformations: {},
    hard_fixes: {}
  };
  fx.clearCounters = () => {
    counters = { scores: {}, transformations: {}, transformed: {} };
  };
  fx.countType = (value, type) =>
    !value ? undefined : (counters[type][value] = counters[type][value] ? counters[type][value] + 1 : 1);
  fx.countScoreType = (value) => fx.countType(value, 'scores');
  fx.countTransformedScoreType = (value) => fx.countType(value, 'transformed');
  fx.countTransformationType = (value) => fx.countType(value, 'transformations');
  fx.countHardFix = (value) => fx.countType(value, 'hard_fixes');

  fx.scoresCounts = () => counters.scores;
  fx.transformationsCounts = () => counters.transformed;
  fx.transformedScoresCounts = () => counters.transformations;
  fx.hardFixes = () => counters.hard_fixes;

  let setDelim = ' ';
  let gameDelim = '-';
  let altGameDelim = ':';
  let tieDelim = '(';
  //  let tieTerm = ')';
  let sqTieDelim = '[';
  //  let sqTieTerm = ']';
  let tieGameDelim = /\//g;
  //  let commaDelim = ',';
  //  let semiDelim = ';';

  /* eslint-disable no-useless-escape */
  let zeroZero = /^0 0$/;
  let dashParen = /-\(/g;
  let curlyTieDelim = /[\{]/g;
  let curlyTieTerm = /[\}]/g;
  let oddDelim = /[.;,]/g;
  let multiDash = /[-]+/g;
  let multiCloseParen = /[\)]+/g;
  let multiOpenParen = /[\(]+/g;
  let emptyParen = /\(\)/g;
  let closeParen = /\)/g;
  let colonDelim = /:/g;
  let leadingCloseParen = /^\)\s/;
  let trailingCloseParen = /\s([-0-9]+)\)/;
  let trailingOpenParen = /\($/;
  let dashDangleStart = /^-(\d)/;
  let dashDangleLeft = /\s-(\d)/g;
  let dashDangleRight = /(\d)-\s/g;
  let dashDangleEnd = /(\d)-$/;
  let outcomeCircumstance = /([a-zA-Z]+)\(([a-zA-z]+)\)/;

  /*
  let tidies = [
     { active: true, abbr: 'zsz',  description: 'Zero Zero',     regex: /^0 0$/,                                         replacement: '0-0'},
  ];
  */

  fx.tidyScore = (before_score = '') => {
    const enclosed = /^\((.*)\)$/;
    if (enclosed.test(before_score)) {
      before_score = before_score.match(enclosed)[1];
    }
    let cleaned = before_score
      ?.toString()
      .replace(zeroZero, '0-0')
      .replace(dashParen, '(')
      .replace(colonDelim, gameDelim)
      .replace(multiDash, gameDelim)
      .replace(oddDelim, setDelim)
      .replace(curlyTieDelim, '(')
      .replace(curlyTieTerm, ')')
      .replace(multiCloseParen, ')')
      .replace(multiOpenParen, '(')
      .replace(dashDangleStart, '$1')
      .replace(dashDangleEnd, '$1')
      .replace(dashDangleLeft, ' $1')
      .replace(dashDangleRight, '$1 ')
      .replace(emptyParen, '')
      .replace(leadingCloseParen, '')
      .replace(trailingOpenParen, '')
      .replace(trailingCloseParen, '$1')
      .replace(outcomeCircumstance, '$1 ($2)')
      .replace(tieGameDelim, '-')
      .replace(closeParen, `)${setDelim}`);

    return cleaned
      ?.split(setDelim)
      .filter((f) => f)
      .join(setDelim);
  };

  let transformations = [
    { active: true, abbr: 'mcp', description: 'Missing Close Paren', regex: /\((\d+)$/, replacement: '($1)' },
    {
      active: true,
      abbr: 'mss1',
      description: 'Mashed Set Scores 1',
      regex: /(\d)-(\d)(\d)-(\d)/g,
      replacement: '$1-$2 $3-$4'
    },
    {
      active: true,
      abbr: 'mss2',
      description: 'Mashed Set Scores 2',
      regex: /(\d\d)-(\d)-(\d)/g,
      replacement: '$1-$2 $3-$4'
    },
    {
      active: true,
      abbr: 'mss3',
      description: 'Mashed Set Scores 3',
      regex: /(\d)-(\d)-(\d)(\d)/g,
      replacement: '$1-$2 $3-$4'
    },
    { active: true, abbr: 'msr1', description: 'Mashed Supertiebreak 1', regex: /\s10(\d)$/g, replacement: ' 10-$1' },
    {
      active: true,
      abbr: 'msr2',
      description: 'Mashed Supertiebreak 2',
      regex: /\s(11|12|13|14)(9|10|11|12)$/g,
      replacement: ' $1-$2'
    },
    { active: true, abbr: 'msr3', description: 'Mashed Supertiebreak 3', regex: /^10(\d)$/g, replacement: '10-$1' },
    {
      active: true,
      abbr: 'msr4',
      description: 'Mashed Supertiebreak 4',
      regex: /^(11|12|13|14)(9|10|11|12)$/g,
      replacement: '$1-$2'
    },
    { active: true, abbr: 'swb', description: 'Super with bracket', regex: /1-0\(([0-8])\)/, replacement: '[10-$1]' },
    {
      active: true,
      abbr: 'mts1',
      description: 'Mangled Tie Set 1',
      regex: /^6\((\d)\)*\s(\d)-(\d)\s\[*(\d+)-(\d+)\]*$/,
      replacement: '6-7($1) $2-$3 $4-$5'
    },
    {
      active: true,
      abbr: 'mts2',
      description: 'Mangled Tie Set 2',
      regex: /^(\d)-(\d)\s6\((\d)\)*\s\[*(\d+)-(\d+)\]*$/,
      replacement: '$1-$2 6-7($3) $4-$5'
    },
    {
      active: true,
      abbr: 'mts3',
      description: 'Mangled Tie Set 3',
      regex: /^6-(\d)\s6\((\d)\)*\s7-6\(([0-9]+)\)$/,
      replacement: '6-$1 6-7($2) 7-6($3)'
    },
    {
      active: true,
      abbr: 'mts4',
      description: 'Mangled Tie Set 4',
      regex: /^6\((\d)\)*\s7-6\((\d+)\)\s6-(\d)$/,
      replacement: '6-7($1) 7-6($2) 6-$3'
    },
    {
      active: true,
      abbr: 'sjs',
      description: 'Set Joined Super',
      regex: /\s(\d)-(\d)(\d\d)-(\d+)$/g,
      replacement: ' $1-$2 $3-$4'
    },
    {
      active: true,
      abbr: 'ns2a',
      description: 'No Separator Two Sets a',
      regex: /^([0-7])([0-7])([0-7])([0-7])(.*)/,
      replacement: '$1-$2 $3-$4$5'
    },
    {
      active: true,
      abbr: 'ns2b',
      description: 'No Separator Two Sets b',
      regex: /^([0-7])\s([0-7])([0-7])([0-7])(.*)/,
      replacement: '$1-$2 $3-$4$5'
    },
    {
      active: true,
      abbr: 'ns2c',
      description: 'No Separator Two Sets c',
      regex: /(.*)\s([0-7])([0-7])([0-7])([0-7])$/,
      replacement: '$1 $2-$3 $4-$5'
    },
    {
      active: true,
      abbr: 'ns3',
      description: 'No Separator Three Sets',
      regex: /^([0-7])([0-7])([0-7])([0-7])([0-7])([0-7])(.*)/,
      replacement: '$1-$2 $3-$4 $5-$6$7'
    },
    {
      active: true,
      abbr: 'nss',
      description: 'No Separator Supertie',
      regex: /^([0-7])([0-7])([0-7])([0-7])10$/,
      replacement: '$1-$2 $3-$4 1-0'
    },
    {
      active: true,
      abbr: 'nsz',
      description: 'No Separator No Zero',
      regex: /^6([6,7])([0-7])10$/,
      replacement: '0-6 $1-$2 1-0'
    },
    {
      active: true,
      abbr: 'tsl',
      description: 'Tie is Super (left)',
      regex: /6-([0-4])\(([0-8])\)/,
      replacement: '$1-6 [10-$2]'
    },
    {
      active: true,
      abbr: 'tsr',
      description: 'Tie is Super (right)',
      regex: /([0-4])-6\(([0-8])\)/,
      replacement: '$1-6 [10-$2]'
    },
    {
      active: true,
      abbr: 'ts7',
      description: 'Tie is Super (7-5)',
      regex: /7-5\(([0-8])\)/,
      replacement: '7-5 [10-$1]'
    },
    {
      active: true,
      abbr: 'ts5',
      description: 'Tie is Super (5-7)',
      regex: /5-7\(([0-8])\)/,
      replacement: '5-7 [10-$1]'
    },
    { active: true, abbr: 'tss', description: 'Tie as Set Score', regex: /7-6\s+7-([0-4])/, replacement: '7-6($1)' },
    {
      active: true,
      abbr: 'dss',
      description: 'Duplicate Set Score',
      regex: /7-6\s+7-6\(([-0-9]+)\)/,
      replacement: '7-6($1)'
    },
    {
      active: true,
      abbr: 'jst',
      description: 'Joined Sets',
      regex: /(\d)-(\d)-(\d)-(\d)/g,
      replacement: '$1-$2 $3-$4'
    },
    { active: true, abbr: 'cpn', description: 'Close Paren & Number', regex: /\)([0-9]+)/g, replacement: ') $1' },
    {
      active: true,
      abbr: 'mst',
      description: 'Mashed Super',
      regex: /(\d-\d)\(10[-/]*([0-8]+)\)/,
      replacement: '$1 [10-$2]'
    },
    {
      active: true,
      abbr: 'sim',
      description: 'Super is Mangled',
      regex: /(\d)-(\d)\(10[-/]*([0-7]+)\)/,
      replacement: '[10-$3]'
    },
    {
      active: true,
      abbr: 'sis',
      description: 'Super is Separated',
      regex: /\s(\d)-(\d)-1 0-([0-8])/,
      replacement: ' $1-$2 [10-$3]'
    },
    {
      active: true,
      abbr: 'sid',
      description: 'Super is Duplicate',
      regex: /6-7 7-6\((\d)\) ([0-9]+)-([0-9]+) 10-([0-7]+)/,
      replacement: '6-7($1) $2-$3 [10-$4]'
    },
    { active: true, abbr: 'sat', description: 'Super as Tie', regex: /7-6\(10-([0-8])\)/, replacement: '[10-$1]' },
    { active: true, abbr: 'sas', description: 'Super as Set', regex: /\s1[0]*\(([0-8])\)/, replacement: ' [10-$1]' },
    { active: true, abbr: 'btx', description: 'Bracketed Text', regex: /\(([A-Za-z]*)\)/, replacement: ' $1 ' }
  ];

  fx.activeTransformattions = () => transformations.filter((t) => t.active).map((t) => t.description);
  fx.activateTransformation = (abbr) =>
    transformations.forEach((t) => {
      if (t.abbr === abbr) t.active = true;
    });
  fx.deactivateTransformation = (abbr) =>
    transformations.forEach((t) => {
      if (t.abbr === abbr) t.active = false;
    });

  fx.transformScore = (before_score) => {
    let applied_transformations = [];
    let transformed_score = before_score;

    transformations.forEach((t) => {
      let ts = transformed_score && transformed_score.replace(t.regex, t.replacement);
      if (t.active && ts !== transformed_score) {
        transformed_score = ts;
        applied_transformations.push({ transformation: t.description, transformed_score });
        fx.countTransformationType(t.description);
      }
    });

    return { transformed_score, applied_transformations };
  };

  let hard_fixes = [{ score: '', fixed_score: '' }];

  fx.hardFixScore = (before_score) => {
    let fixed_score;
    hard_fixes.forEach((f) => {
      if (before_score === f.fixed_score) {
        fixed_score = f.fixed_score;
        fx.countHardFix(before_score);
      }
    });

    return { fixed_score };
  };

  fx.parse = (score, transform = true) => {
    score = score && score.trim();
    let parsedScore = {};

    if (!score) return parsedScore;
    parsedScore.source = score;

    let scoreIsOutcome = fx.isOutcome(score);
    if (scoreIsOutcome) {
      parsedScore.Outcome = scoreIsOutcome;
      return parsedScore;
    }

    let tidy_score = fx.tidyScore(score);
    let { transformed_score, applied_transformations } = fx.transformScore(tidy_score);
    if (applied_transformations.length) parsedScore.transformations = applied_transformations;

    let working_score = transform ? transformed_score : tidy_score;
    let { fixed_score } = fx.hardFixScore(working_score);
    if (fixed_score) working_score = fixed_score;

    let setStrings = (transform ? transformed_score : tidy_score).split(setDelim).filter((f) => f);
    let outcome = setStrings.reduce((p, c) => fx.isOutcome(c) || p, undefined);
    let circumstance = setStrings.reduce((p, c) => fx.isCircumstance(c) || p, undefined);

    if (outcome) parsedScore.Outcome = outcome;
    if (circumstance) parsedScore.Circumstance = circumstance;

    let { parsedSets, setsAnalysis } = fx.parseSets({ setStrings, outcome });

    // erroneous sets are those that don't add up, e.g. 3 sets all won by same player should only occur in best-of-5 set matches
    if (setsAnalysis && setsAnalysis.error === 'erroneous') {
      let { parsedSets: p2, setsAnalysis: a2 } = fx.parseSets({ setStrings, outcome, options: { swapMissing: true } });
      if (!a2) parsedSets = p2;
    }

    let actions = fx.getActions({ parsedSets });
    if (actions.length) parsedScore.actions = actions;

    let warnings = [].concat(...fx.getWarnings({ parsedSets }), (setsAnalysis && setsAnalysis.warning) || []);
    if (warnings.length) parsedScore.warnings = warnings;

    let errors = [].concat(...fx.getErrors({ parsedSets }), (setsAnalysis && setsAnalysis.error) || []);
    if (errors.length) parsedScore.errors = errors;

    parsedScore.raw_sets = parsedSets;
    parsedScore.winner = setsAnalysis.winner;
    parsedScore.score = fx.reconstructScore({ parsedSets: parsedSets, outcome, circumstance });
    parsedScore.Sets = fx.setsTODS(parsedSets);

    return parsedScore;
  };

  fx.setsTODS = (parsedSets) => {
    let Set = parsedSets.map((s, i) => {
      let result = { Number: i + 1 };
      if (s.winningSide) result.WinningSide = s.winningSide;
      if (s.score && s.score.games) {
        if (s.score.games.Side1Score !== undefined) result.Side1Score = s.score.games.Side1Score;
        if (s.score.games.Side2Score !== undefined) result.Side2Score = s.score.games.Side2Score;
      }
      if (s.score && s.score.tiebreak) {
        let winningScore = s.score.tiebreak.winningScore !== 1 ? s.score.tiebreak.winningScore : undefined;
        let losingScore = s.score.tiebreak.losingScore || (winningScore ? 0 : undefined);
        if (s.winningSide === 1) {
          result.Side1TiebreakScore = winningScore;
          result.Side2TiebreakScore = losingScore;
        } else if (s.winningSide === 2) {
          result.Side2TiebreakScore = winningScore;
          result.Side1TiebreakScore = losingScore;
        }
      }
      return result;
    });

    return { Set };
  };

  fx.reconstructScore = ({ parsedSets, outcome, circumstance }) => {
    let reconstructed_sets = (parsedSets && parsedSets.map(fx.reconstructSet)) || [];
    if (outcome) reconstructed_sets.push(outcome.abbrv.toUpperCase());
    if (circumstance) reconstructed_sets.push(`(${circumstance.abbrv})`);
    return reconstructed_sets.join(' ');
  };

  fx.reconstructSet = (set) => {
    let games = set.score && set.score.games && `${set.score.games.Side1Score}-${set.score.games.Side2Score}`;
    let tiebreak = set.score && set.score.tiebreak && `(${set.score.tiebreak.losingScore})`;
    let supertiebreak =
      set.score && set.score.tiebreak && `[${set.score.tiebreak.winningScore}-${set.score.tiebreak.losingScore}]`;
    if (supertiebreak && set.score.tiebreak.winningScore === 1 && set.score.tiebreak.losingScore === 0)
      supertiebreak = '1-0';
    return set.tiebreakOnly ? supertiebreak : games ? `${games}${tiebreak || ''}` : '';
  };

  fx.reverseScore = (score, split = ' ') => {
    let irreversible = null;
    if (score) {
      let reversed = score && score.split(split).map(parseSet).join(split);
      let result = irreversible ? `${irreversible} ${reversed}` : reversed;
      return result;
    }

    function parseSet(set) {
      let divider = set.indexOf('/') > 0 ? '/' : '-';
      let set_scores = set
        .split(divider)
        .map(parseSetScore)
        .reverse()
        .filter((f) => f);
      let set_games = set_scores.map((s) => s.games);
      let tb_scores = set_scores.map((s) => s.tiebreak).filter((f) => f);
      let tiebreak = tb_scores.length === 1 ? `(${tb_scores[0]})` : '';
      let set_score =
        tb_scores.length < 2 ? set_games.join(divider) : set_games.map((s, i) => `${s}(${tb_scores[i]})`).join(divider);
      return `${set_score}${tiebreak}`;
    }

    function parseSetScore(set) {
      let ss = /(\d+)/;
      let sst = /(\d+)\((\d+)\)/;
      if (sst.test(set)) return { games: sst.exec(set)[1], tiebreak: sst.exec(set)[2] };
      if (ss.test(set)) return { games: ss.exec(set)[1] };
      irreversible = set;
      return undefined;
    }
  };

  fx.getActions = ({ parsedSets }) => {
    let actions_array =
      (parsedSets && Array.isArray(parsedSets) && parsedSets.map((s) => s.score && s.score.actions).filter((f) => f)) ||
      [];
    let actions = [].concat(...actions_array);
    return (actions.length && actions) || [];
  };

  fx.getWarnings = ({ parsedSets }) => {
    let warnings =
      (parsedSets && Array.isArray(parsedSets) && parsedSets.map((s) => s.score && s.score.warning).filter((f) => f)) ||
      [];
    return (warnings.length && warnings) || [];
  };

  fx.getErrors = ({ parsedSets }) => {
    let errors =
      (parsedSets && Array.isArray(parsedSets) && parsedSets.map((s) => s.score && s.score.error).filter((f) => f)) ||
      [];
    return (errors.length && errors) || [];
  };

  fx.parseSets = ({ setStrings, outcome, options }) => {
    let parsedSets = setStrings
      .filter((s) => !fx.isOutcome(s) && !fx.isCircumstance(s))
      .map((setString) => fx.analyzeSetString(setString, options));

    if (parsedSets.length === 3 && fx.setIsSuperTiebreak(parsedSets[2])) {
      parsedSets[2] = fx.transformGamesToTiebreak(parsedSets[2]);
      parsedSets[2].tiebreakOnly = true;
    }

    let setsAnalysis = fx.analyzeSets(parsedSets, outcome);

    return { parsedSets, setsAnalysis };
  };

  fx.analyzeSets = (parsedSets, outcome) => {
    let analysis = {};
    let sides = { 1: 0, 2: 0 };
    parsedSets.forEach((s) => (sides[s.winningSide] += 1));
    analysis.winner = sides[1] > sides[2] ? 1 : sides[2] > sides[1] ? 2 : 0;
    if (sides[1] === sides[2] && !outcome) {
      if (sides[1] === 0) {
        analysis.warning = 'outcome is unclear from score';
      } else {
        analysis.error = 'no clear winner';
      }
    } else if ((!sides[1] || !sides[2]) && (sides[1] > 2 || sides[2] > 2)) {
      analysis.error = 'erroneous';
    }
    if (parsedSets.length > 3) analysis.warning = 'more than 3 sets';
    return analysis;
  };

  fx.transformGamesToTiebreak = (set) => {
    let setGames = set.score && set.score.games;
    if (!setGames) return set;

    let winningSide = setGames.Side1Score > setGames.Side2Score ? 1 : 2;
    let games = {
      Side1Score: winningSide === 1 ? 1 : 0,
      Side2Score: winningSide === 2 ? 1 : 0
    };
    let tiebreak = {
      winningScore: winningSide === 1 ? setGames.Side1Score : setGames.Side2Score,
      losingScore: winningSide === 1 ? setGames.Side2Score : setGames.Side1Score
    };
    set.score.games = games;
    set.score.tiebreak = tiebreak;
    set.winningSide = winningSide;
    return set;
  };

  fx.setIsSuperTiebreak = (set) => {
    if (!set.score || set.score.tiebreak || !set.score.games) return false;
    if (set.score.games.Side1Score === 10 || set.score.games.Side2Score === 10) return true;
    if (fx.oneGameSet({ games: set.score.games })) return true;
  };

  fx.tiebreakIsSuper = (tiebreak) => {
    return tiebreak.winningScore === 10 && tiebreak.losingScore < 8;
  };

  fx.analyzeSetString = (setString, options) => {
    let tiebreakOnly = !fx.isOutcome(setString) && !fx.isCircumstance(setString) && fx.parseTiebreakOnly(setString);
    let tiebreak = !fx.isOutcome(setString) && fx.parseTiebreak(setString);
    let gamesString = fx.getGamesString(setString, tiebreakOnly);
    let score = fx.parseGameString({ gamesString, tiebreak, options });
    let isSuper = fx.oneGameSet({ games: score && score.games });
    let winningSide = fx.calculateWinningSide(score);
    let result = { score };
    if (winningSide) result.winningSide = winningSide;
    if (isSuper && result.score && result.score.tiebreak && result.score.tiebreak.losingScore) {
      result.score.tiebreak.winningScore = Math.max(tiebreak.losingScore + 2, 10);
      result.score.games = undefined;
      tiebreakOnly = true;
    }
    if (tiebreakOnly) {
      result = {
        score: {
          games: { Side1Score: 1, Side2Score: 0 },
          tiebreak: tiebreakOnly
        },
        winningSide: 1,
        tiebreakOnly: true
      };
    }
    return result;
  };

  fx.calculateWinningSide = (score) => {
    if (!score || !score.games) return;
    return score.games.Side1Score > score.games.Side2Score ? 1 : 2;
  };

  fx.parseGameString = ({ gamesString, tiebreak, options }) => {
    if (!gamesString) return undefined;
    let delimiter = gamesString.includes(gameDelim)
      ? gameDelim
      : gamesString.includes(altGameDelim)
      ? altGameDelim
      : undefined;
    return delimiter
      ? fx.parseGamesArray({ gameScores: gamesString.split(delimiter), tiebreak, options })
      : fx.getUndelimitedGames(gamesString, tiebreak);
  };

  fx.parseGamesArray = ({ gameScores, tiebreak, options }) => {
    if (gameScores.length === 1) return fx.inferMissingGames(gameScores[0], tiebreak);
    if (gameScores.length !== 2) return { error: 'too many scores', gameScores };
    if (!fx.validScoreValues(gameScores)) return { error: 'non numerical values', gameScores };
    let Side1Score = fx.isNumber(gameScores[0]) && parseInt(gameScores[0]);
    let Side2Score = fx.isNumber(gameScores[1]) && parseInt(gameScores[1]);
    if (!Side1Score && !Side2Score) return { warning: 'empty scores', gameScores };

    let error;
    let actions = [];
    let result = {};
    let games = { Side1Score, Side2Score };

    let missing_side = Side1Score === false ? 1 : Side2Score === false ? 2 : undefined;
    let existing_score =
      missing_side && (fx.isNumber(Side1Score) ? Side1Score : fx.isNumber(Side2Score) ? Side2Score : undefined);
    let swapMissing = options && options.swapMissing;

    if (missing_side && existing_score) {
      let missing_score;

      if (tiebreak && existing_score === 6) missing_score = 7;
      if (tiebreak && existing_score === 7) missing_score = 6;
      if (!tiebreak && existing_score + 1 < 6) missing_score = 6;
      if (!tiebreak && existing_score === 5) missing_score = 7;

      if (missing_score !== undefined) {
        if (swapMissing) {
          actions.push('swapped missing score position');
          games.missingScore = missing_score;
          if (missing_side === 1) {
            games.Side1Score = existing_score;
            games.Side2Score = missing_score;
          } else {
            games.Side1Score = missing_score;
            games.Side2Score = existing_score;
          }
        } else {
          if (missing_side === 1) {
            games.Side1Score = missing_score;
          } else {
            games.Side2Score = missing_score;
          }
        }

        actions.push('inferred game score');
        games.inferredScore = swapMissing ? 3 - missing_side : missing_side;
      } else {
        error = 'indecipherable score';
      }
    }

    if (actions.length) result.actions = actions;
    if (tiebreak) {
      result.tiebreak = tiebreak;
      if (!fx.oneGameSet({ games }) && fx.tiebreakIsSuper(tiebreak)) result.warning = 'questionable supertiebreak';
    }
    if (error) {
      result.error = error;
      result.gameScores = gameScores;
    } else {
      result.games = games;
    }
    return result;
  };

  fx.oneGameSet = ({ games }) => {
    return games && (games.Side1Score || 0) + (games.Side2Score || 0) === 1;
  };

  fx.getUndelimitedGames = (gamesString, tiebreak) => {
    if (gamesString.length !== 2) return { error: 'unparseable game scores', gamesString };
    return fx.parseGamesArray({ gameScores: gamesString.split(''), tiebreak });
  };

  fx.inferMissingGames = (gamesString) => {
    console.log('missing games:', gamesString);
    return { error: 'missing games', gamesString };
  };

  fx.getGamesString = (stringScore, tiebreakOnly) => {
    if (!stringScore) return undefined;
    return tiebreakOnly
      ? undefined
      : stringScore.includes(tieDelim)
      ? stringScore.split(tieDelim)[0]
      : stringScore.includes(sqTieDelim)
      ? stringScore.split(sqTieDelim)[0]
      : stringScore;
  };

  fx.parseTiebreakOnly = (stringScore) => {
    if (!stringScore) return undefined;
    return stringScore.startsWith(tieDelim)
      ? fx.parseStringTiebreak(stringScore.split(tieDelim)[1])
      : stringScore.startsWith(sqTieDelim)
      ? fx.parseStringTiebreak(stringScore.split(sqTieDelim)[1])
      : undefined;
  };

  fx.parseTiebreak = (stringScore) => {
    if (!stringScore) return undefined;
    return stringScore.includes(tieDelim)
      ? fx.parseStringTiebreak(stringScore.split(tieDelim)[1])
      : stringScore.includes(sqTieDelim)
      ? fx.parseStringTiebreak(stringScore.split(sqTieDelim)[1])
      : undefined;
  };

  fx.parseStringTiebreak = (stringTiebreak) => {
    let tiebreakString = fx.noBrackets(stringTiebreak);
    let delimiter = tiebreakString.includes(gameDelim)
      ? gameDelim
      : tiebreakString.includes(altGameDelim)
      ? altGameDelim
      : undefined;
    return delimiter
      ? fx.getDelimitedTiebreak(tiebreakString.split(delimiter))
      : fx.inferUndelimitedTiebreak(tiebreakString);
  };

  fx.getDelimitedTiebreak = (tiebreakScores) => {
    if (tiebreakScores.length === 1) return fx.inferUndelimitedTiebreak(tiebreakScores[0]);
    if (tiebreakScores.length !== 2) return { error: 'too many scores', tiebreakScores };
    if (!fx.validScoreValues(tiebreakScores)) return { error: 'non numerical values', tiebreakScores };
    let winner_index = parseInt(tiebreakScores[0]) > parseInt(tiebreakScores[1]) ? 0 : 1;
    let winningScore = parseInt(tiebreakScores[winner_index]);
    let losingScore = parseInt(tiebreakScores[1 - winner_index]);
    return { winningScore, losingScore, winningSide: winner_index + 1 };
  };

  fx.inferUndelimitedTiebreak = (tiebreakString) => {
    if (isNaN(tiebreakString)) return { error: 'non numerical value', tiebreakScores: [tiebreakString] };
    let inferredWinningScore = true;
    let losingScore, winningScore;
    if (tiebreakString.length > 3) {
      winningScore = parseInt(tiebreakString.slice(0, 2));
      losingScore = parseInt(tiebreakString.slice(2));
      if (losingScore + 2 !== winningScore)
        return { error: 'tiebreak score invalid', tiebreakScores: [tiebreakString] };
    } else {
      losingScore = parseInt(tiebreakString);
      winningScore = Math.max(7, losingScore + 2);
    }
    return { winningScore, losingScore, inferredWinningScore };
  };

  fx.noBrackets = (value) => value.replace(/[\(]/g, '').replace(/[\)]/g, '').replace(/[\]]/g, '').replace(/[\[]/g, '');
  fx.noPeriods = (value) => value.replace(/[.\s]/g, '');

  fx.isCircumstance = (value) => {
    let circumstances = [
      { abbrv: 'pc', term: 'personal circumstances' },
      { abbrv: 'ns', term: 'no show' },
      { abbrv: 'pps', term: 'point penalty system' },
      { abbrv: 'pe', term: 'player error' },
      { abbrv: 'quit', term: 'quit' },
      { abbrv: 'ill', term: 'illness' },
      { abbrv: 'inj', term: 'injury' },
      { abbrv: 'emerg', term: 'emergency' },
      { abbrv: 'ad', term: 'adult discipline' },
      { abbrv: 'admin', term: 'administrator error' }
    ];

    if (!value || typeof value !== 'string') return false;

    // remove any surrounding spaces, convert to lowercase, remove any periods
    let target = fx.noPeriods(fx.noBrackets(value).trim().toLowerCase());

    return circumstances.reduce((p, c) => (target === c.abbrv ? c : p), undefined);
  };

  // takes an entire score string or a set value
  // set value have no spaces because sets are by definition a score that has already been split by spaces
  fx.isOutcome = (value) => {
    let outcomes = [
      { abbrv: 'ret', term: 'retirement' },
      { abbrv: 'retire', term: 'retirement' },
      { abbrv: 'walk', term: 'walkover' },
      { abbrv: 'wo', term: 'walkover' },
      { abbrv: 'w/o', term: 'walkover' },
      { abbrv: 'bye', term: 'bye' },
      { abbrv: 'dq', term: 'disqualified' },
      { abbrv: 'abd', term: 'abandoned' },
      { abbrv: 'def', term: 'default' },
      { abbrv: 'wd', term: 'withdrawal' },
      { abbrv: 'def/def', term: 'double default' },
      { abbrv: 'wd/wd', term: 'double withdrawal' },
      { abbrv: 'wo/wo', term: 'double walkover' },
      { abbrv: 'unp', term: 'unplayed' }
    ];

    if (!value || typeof value !== 'string') return false;

    // remove any surrounding spaces, convert to lowercase, remove any periods
    let target = fx.noPeriods(value.trim().toLowerCase());

    return outcomes.reduce((p, c) => (target === c.term || target === c.abbrv ? c : p), undefined);
  };

  fx.hasText = (obj, text) => {
    if (typeof obj !== 'object') return;
    return JSON.stringify(obj).includes(text) ? true : false;
  };

  fx.validScoreValues = (narr) => {
    if (!narr || !Array.isArray(narr)) return false;
    return narr.reduce((p, c) => (fx.isNumber(c) || c === '') && p, true);
  };
  fx.isNumber = (n) => {
    if (typeof n === 'string') n = n.trim();
    return !isNaN(n) && n !== '' && n !== false && n >= 0;
  };

  return fx;
})();

function replaceOh(score) {
  if (typeof score !== 'string') return score;
  return score
    .toLowerCase()
    .split(' ')
    .map((part) => {
      if (/^o[1-9]$/.test(part) || /^[1-9]o$/.test(part)) {
        part = part.split('o').join('0');
      }
      return part;
    })
    .join(' ');
}

function separateScoreBlocks(score) {
  if (typeof score !== 'string') return score;
  return score
    .toLowerCase()
    .split(' ')
    .map((part) => {
      if (/^\d+$/.test(part) && part.length > 2 && !(part.length % 2)) {
        part = chunkArray(part.split(''), 2)
          .map((c) => c.join(''))
          .join(' ');
      }
      return part;
    })
    .join(' ');
}

function joinFloatingTiebreak(score) {
  if (typeof score !== 'string') return score;
  const parts = score.split(' ');
  const floatingTiebreak = parts.find((part) => /^\(\d+\)$/.test(part));
  if (floatingTiebreak) {
    const index = parts.indexOf(floatingTiebreak);
    const prior = parts[index - 1];
    if (/^\d+$/.test(prior) && prior.length === 2) {
      const scores = prior.split('');
      const diff = Math.abs(scores.reduce((a, b) => +a - +b));
      if (diff === 1) {
        const bits = [parts.slice(0, index - 1), [prior, floatingTiebreak].join(''), parts.slice(index + 1)]
          .flat()
          .join(' ');
        return bits;
      }
    }
  }
  return score;
}

function removeErroneous(score) {
  if (typeof score !== 'string') return score;
  return score
    .toLowerCase()
    .split(' ')
    .map((part) => {
      if (/^\d+$/.test(part) && part.length === 1) {
        return;
      }
      if (/^\d+$/.test(part) && part.length === 3) {
        return part.slice(0, 2);
      }
      return part;
    })
    .filter(Boolean)
    .join(' ');
}

function correctShiftErrors(score) {
  if (typeof score !== 'string') return score;
  const err = /^(\d{2})\((\d+)9$/;
  return score
    .toLowerCase()
    .split(' ')
    .map((part) => {
      if (err.test(part)) {
        const bits = part.match(err);
        return `${bits[1]}(${bits[2]})`;
      }
      return part;
    })
    .join(' ');
}

export function tidyScore(score) {
  if (typeof score === 'number') {
    score = score.toString();
    if (!(score.length % 2)) {
      score = chunkArray(score.split(''), 2)
        .map((part) => part.join(''))
        .join(' ');
    }
  }
  score = separateScoreBlocks(score);
  score = correctShiftErrors(score);
  score = removeErroneous(score);
  score = joinFloatingTiebreak(score);
  return scoreParser.tidyScore(replaceOh(score));
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
