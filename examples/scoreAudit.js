// node
// ..then..
// .load scoreAudit.js

const { utilities } = require('tods-competition-factory');
const { writeFileSync } = require('fs-extra');
const { xlsTODS: x } = require('../dist');

x.setLoggingActive(true, 'scoreAudit');

const props = {
  readDir: './sheets/testing/working',
  processStructures: false,
  includeWorkbooks: false,
  sheetNumbers: [],
  sheetTypes: [],
  processLimit: 10,
  startIndex: 0,
  sheetLimit: 0
};

const r = {};
const go = () => {
  const result = x.processDirectory(props);
  Object.assign(r, result);
  console.log(Object.keys(r));
  const auditLog = x.getAudit();
  const csvScores = utilities.JSON2CSV(auditLog);
  writeFileSync('../scratch/scoreAudit.csv', csvScores, 'UTF-8');
};

go();
