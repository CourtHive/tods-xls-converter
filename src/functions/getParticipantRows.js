import { getRow, getCol, cellsContaining, numberValue, getCellValue } from './sheetAccess';
import { validRanking } from '../utilities/validators';
import { maxInstance } from '../utilities/convenience';
// import { sheetAnalyzer } from './sheetAnalyzer';

export function getParticipantRows(props) {
  const { headerRow, footerRow, avoidRows, columns, profile, sheet } = props;
  if (!profile) return { rows: [], preRoundRows: [] };

  // const analyzer = sheetAnalyzer(props);

  const skipWords = profile.skipWords;
  const skipExpressions = profile.skipExpressions;
  const isStringValue = (key) => {
    const value = getCellValue(sheet[key]);
    return value && typeof value === 'string';
  };
  const isNumeric = (value) => /^\d+(a)?$/.test(value);
  const isNumericValue = (key) => {
    const value = getCellValue(sheet[key]);
    return value && isNumeric(value);
  };

  // ensure that the key is of the form [A-Z][#], not 'AA1', for example
  const isSingleAlpha = (key) => key && key.length > 1 && isNumeric(key[1]);
  const inRowBand = (key) => {
    const row = key && getRow(key);
    return row && row > headerRow && row < footerRow;
  };
  const targetColumn = (key, column) => getCol(key) === columns[column];
  function isSkipExpression(value, expression) {
    const re = new RegExp(expression, 'g');
    return value && re.test(value);
  }
  function isNotSkipExpression(key) {
    const value = getCellValue(sheet[key]);
    const matchesExpression =
      skipExpressions &&
      skipExpressions.reduce((matchesExpression, expression) => {
        return isSkipExpression(value, expression) ? true : matchesExpression;
      }, false);
    return !matchesExpression;
  }

  const isNotSkipWord = (key) => {
    const value = getCellValue(sheet[key]);
    const isSkipWord = (skipWords || []).map((skipWord) => skipWord.toLowerCase()).includes(value.toLowerCase());
    return !isSkipWord;
  };

  const filteredKeys = Object.keys(sheet).filter(inRowBand).filter(isSingleAlpha).filter(isNotSkipExpression);

  const getValue = (key) => getCellValue(sheet[key]);
  const assessColumn = (column) => {
    const isColumnKey = (key) => getCol(key) === column;
    const prospectColumnKeys = filteredKeys.filter(isColumnKey);

    return prospectColumnKeys.reduce(
      (assessment, key) => {
        const value = getValue(key).split('.').join('');
        const skip = profile.skipContains?.some((sv) => value.toLowerCase().includes(sv));
        if (!skip) {
          assessment.values.push(value);
          if (isNumeric(value)) {
            assessment.containsNumeric = true;
          } else if (value) {
            assessment.allNumeric = false;
          }
        }
        return assessment;
      },
      {
        containsNumeric: false,
        allNumeric: !!prospectColumnKeys.length,
        values: []
      }
    );
  };
  // -------

  const knockOutRounds = profile.knockOutRounds;
  function getDrawColumnKeys() {
    const inRow = (key) => getRow(key) === headerRow;
    const inKnockOutRounds = (key) => {
      const value = getValue(key);
      return knockOutRounds.includes(value);
    };
    return Object.keys(sheet).filter(inRow).filter(isSingleAlpha).filter(inKnockOutRounds);
  }

  if (knockOutRounds) {
    const drawColumnKeys = getDrawColumnKeys();
    const firstColumnKey = drawColumnKeys?.[0];
    const firstColumn = getCol(firstColumnKey);
    const prospectColumn = firstColumnKey && String.fromCharCode(firstColumn.charCodeAt(0) - 1);
    const secondColumn = firstColumnKey && String.fromCharCode(firstColumn.charCodeAt(0) + 1);

    const { containsNumeric, allNumeric } = assessColumn(prospectColumn);

    if (!containsNumeric && !allNumeric) {
      // find column with numbers
      const columnTargets = ['A', 'B', 'C', 'D'];
      const numericColumn = columnTargets.find((column) => {
        let { containsNumeric } = assessColumn(column);
        return containsNumeric;
      });
      if (numericColumn) {
        const targetColumn = columnTargets[columnTargets.indexOf(numericColumn) + 1];
        console.log('pre-round', firstColumn);
        console.log('players in column', targetColumn);
      }
    } else if (containsNumeric && !allNumeric) {
      console.log('pre-round', firstColumn);
      console.log('players in column', secondColumn);
    } else {
      console.log('players in column', firstColumn);
    }
  }

  let roundRobinResult = [];
  let playerNames = filteredKeys
    .filter((key) => targetColumn(key, 'players'))
    .filter(isStringValue)
    .filter(isNotSkipWord)
    .map(getRow);
  let firstNames = filteredKeys
    .filter((key) => targetColumn(key, 'firstName'))
    .filter(isStringValue)
    .filter(isNotSkipWord)
    .map(getRow);
  let lastNames = filteredKeys
    .filter((key) => targetColumn(key, 'lastName'))
    .filter(isStringValue)
    .filter(isNotSkipWord)
    .map(getRow);
  let clubs = filteredKeys
    .filter((key) => targetColumn(key, 'club'))
    .filter(isStringValue)
    .filter(isNotSkipWord)
    .map(getRow);
  let ids = filteredKeys
    .filter((key) => targetColumn(key, 'id'))
    .filter(isStringValue)
    .filter(isNotSkipWord)
    .map(getRow);
  let seeds = filteredKeys
    .filter((key) => targetColumn(key, 'seed'))
    .filter(isNumericValue)
    .map(getRow);
  let drawPositions = filteredKeys.filter((key) => targetColumn(key, 'position')).map(getRow);
  let rankings = filteredKeys
    .filter((key) => targetColumn(key, 'rank') && validRanking(getCellValue(sheet[key])))
    .map(getRow);

  let expectedDrawPosition = 1;
  const drawPositionsAreOrdered = drawPositions.reduce((areOrdered, row) => {
    let drawPosition = numberValue(sheet, `${columns.position}${row}`);
    let isExpected = drawPosition === expectedDrawPosition;
    if (isExpected) expectedDrawPosition++;
    return (!drawPosition || isExpected) && areOrdered;
  }, true);
  const orderedStartRow = drawPositions.length && drawPositionsAreOrdered && drawPositions[0];

  let finals;

  // check whether this is Round Robin
  if (columns.roundRobinResult) {
    roundRobinResult = Object.keys(sheet)
      // eslint-disable-next-line no-useless-escape
      .filter((f) => f[0] === columns.roundRobinResult && /\d/.test(f[1]) && /^\d+[\.]*$/.test(getCellValue(sheet[f])))
      .map((ref) => getRow(ref));
    rankings = rankings.filter((f) => roundRobinResult.indexOf(f) >= 0);
  }

  let sources = [ids, seeds, firstNames, lastNames, drawPositions, rankings, clubs, roundRobinResult];

  // Necessary for finding all player rows in TP Doubles Draws
  /*
  if (profile.playerRows && profile.playerRows.playerNames) {
     let additions = [];
     playerNames.forEach(f => {
        // additions is just a counter
        if (getCellValue(sheet[`${columns.players}${f}`]).toLowerCase() === 'bye') additions.push(f - 1); 
     });
     sources.push(playerNames);
  }
  */

  let allRows = []
    .concat(...sources)
    .filter((item, i, s) => s.lastIndexOf(item) === i)
    .sort((a, b) => a - b);

  let drawRows; // must be undefined for RR to work!
  let preRoundRows = [];

  if (profile.gaps && profile.gaps.draw) {
    let gaps = findGaps({ sheet, term: profile.gaps['draw'].term });

    if (gaps.length) {
      let gap = gaps[profile.gaps['draw'].gap];
      if (!columns.roundRobinResult) {
        // filter rows by gaps unless Round Robin Results Column
        drawRows = allRows.filter((row) => row > gap[0] && row < gap[1]);
      } else {
        // names that are within gap in round robin
        finals = playerNames.filter((row) => row > gap[0] && row < gap[1]);
      }

      if (gaps.length > 1) {
        let gap = gaps[profile.gaps['preround'].gap];
        preRoundRows = allRows.filter((row) => row > gap[0] && row < gap[1]);
      }
    }
  }

  drawRows = drawRows || allRows;

  const startRows = sources.map((source) => source[0]).filter(Boolean);
  const startRow = orderedStartRow || parseInt(maxInstance(startRows));
  const endRow = drawRows[drawRows.length - 1];
  const range = [startRow, endRow];

  const rows = allRows.filter((row) => row >= startRow && row <= endRow && !avoidRows.includes(row));

  // determine whether there are player rows outside of Round Robins
  finals = finals ? finals.filter((f) => drawRows.indexOf(f) < 0) : undefined;
  finals = finals && finals.length ? finals : undefined;

  return { rows, range, finals, preRoundRows };
}

function findGaps({ sheet, term }) {
  let gaps = [];
  let gap_start = 0;
  let instances = cellsContaining({ sheet, term })
    .map((reference) => getRow(reference))
    .filter((item, i, s) => s.lastIndexOf(item) === i);
  instances.unshift(0);
  let nextGap = (index) => {
    while (+instances[index + 1] === +instances[index] + 1 && index < instances.length) {
      index += 1;
    }
    return index;
  };
  let gap_end = nextGap(0);
  while (gap_end < instances.length) {
    if (gap_start) gaps.push([instances[gap_start], instances[gap_end]]);
    gap_start = nextGap(gap_end);
    gap_end = nextGap(gap_start + 1);
  }
  // only accept gaps which are considered to be "main page body"
  gaps = gaps.filter((f) => f[1] - f[0] > 3);
  return gaps;
}
