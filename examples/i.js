// node
// ..then..
// .load build.js

const { xlsTODS } = require('../dist');
xlsTODS.setLoggingActive(true);

const x = {
  purge: (props) => {
    console.log('logs purged');
    xlsTODS.purgeGlobalLog(props);
  }
};
const props = {
  sheetTypes: ['INDETERMINATE'],
  readDir: './sheets',
  sheetNumbers: [],
  processLimit: 0,
  startIndex: 0,
  sheetLimit: 0
};

const go = (props) => {
  const result = xlsTODS.processDirectory(props);
  Object.assign(x, result);
};
const print = (props) => xlsTODS.printGlobalLog(props);

go(props);
print(props);
