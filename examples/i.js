// node
// ..then..
// .load build.js

const { xlsTODS } = require('../dist');
xlsTODS.setLoggingActive(true);

const purge = (logName) => {
  console.log('logs purged');
  xlsTODS.purgeGlobalLog(logName);
};

const props = {
  readDir: './sheets',
  sheetNumbers: [],
  sheetTypes: [],
  processLimit: 0,
  startIndex: 0,
  sheetLimit: 0
};

const x = {};
const go = () => {
  const result = xlsTODS.processDirectory(props);
  Object.assign(x, result);
  console.log(Object.keys(x));
};
const print = (props) => xlsTODS.printGlobalLog(props);

go(props);

if (print && purge && x) {
  console.log('x.results; modify props; go(), print(), purge(logName)');
}
