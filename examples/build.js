const { xlsTODS } = require('../dist');
const readDir = './sheets';

const sheetNumbers = [];
const sheetTypes = ['INDETERMINATE'];
const sheetLimit = 0;

const processLimit = 0;
const startIndex = 0;

let result = xlsTODS.processDirectory({
  log: { details: true },
  processLimit,
  sheetNumbers,
  startIndex,
  sheetLimit,
  sheetTypes,
  readDir
});
xlsTODS.printLog(result.processLog);
