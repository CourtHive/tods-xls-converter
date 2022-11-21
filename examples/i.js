// node
// ..then..
// .load build.js

const { xlsTODS } = require('../dist');

let result;
const props = {
  sheetTypes: ['INDETERMINATE'],
  readDir: './sheets',
  sheetNumbers: [],
  processLimit: 0,
  startIndex: 0,
  sheetLimit: 0
};

result = xlsTODS.setLoggingActive(true);
if (result); // stop linter complaint
result = xlsTODS.processDirectory(props);
xlsTODS.printGlobalLog();
