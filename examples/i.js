// node
// ..then..
// .load i.js

const { xlsTODS: x } = require('../dist');
x.setLoggingActive(true);

const purge = (logName) => {
  console.log('logs purged');
  x.purgeGlobalLog(logName);
};

const props = {
  readDir: './sheets/testing',
  processStructures: true,
  includeWorkbooks: false,
  sheetNumbers: [],
  sheetTypes: [],
  processLimit: 0,
  startIndex: 0,
  sheetLimit: 0
};

const r = {};
const go = () => {
  const result = x.processDirectory(props);
  Object.assign(r, result);
  console.log(Object.keys(r));
};
const print = (props) => x.printGlobalLog(props);

go();

if (print && purge && x) {
  console.log('r for results; modify props; go(), print(), purge(logName)');
}
