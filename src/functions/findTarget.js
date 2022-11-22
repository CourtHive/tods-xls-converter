export function findTarget(resultsObject, target) {
  if (!target || typeof target !== 'string') return [];

  if (typeof resultsObject === 'object') {
    if (resultsObject.sheetAnalysis) {
      return processFileResult(resultsObject, target);
    } else if (resultsObject.sheetName) {
      return processSheet(resultsObject, target);
    } else if (Object.values(resultsObject)[0].sheetAnalysis) {
      return processFilesObject(resultsObject, target);
    }
  }

  console.log('no processable object found');

  return [];
}

function processFilesObject(resultsObject, target) {
  const aggregateResults = [];

  for (const fileResult of Object.values(resultsObject)) {
    const results = processFileResult(fileResult, target);
    if (results.length) aggregateResults.push(...results);
  }
  return aggregateResults;
}

function processFileResult(fileResult, target) {
  const { filename, sheetAnalysis } = fileResult;
  const results = [];

  for (const sheet of Object.values(sheetAnalysis)) {
    const sheetResults = processSheet(sheet, target);
    if (sheetResults.length) results.push({ filename, results: sheetResults });
  }

  return results;
}

function processSheet(sheet, target) {
  const { analysis, sheetName } = sheet;
  const sheetResults = [];

  for (const columnProfile of analysis?.columnProfiles || []) {
    const { column, rows, values } = columnProfile;
    const lowerTarget = target.toLowerCase();

    const results = values
      .map((value, i) => {
        if (value && value.toString().toLowerCase().includes(lowerTarget)) {
          return { column, row: rows[i], value };
        }
      })
      .filter(Boolean);

    if (results.length) {
      sheetResults.push({ sheetName, results });
    }
  }

  return sheetResults;
}
