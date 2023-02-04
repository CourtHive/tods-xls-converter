// aggrete all report.js files from ./sheets/processed/IND/%year$
const fs = require('fs-extra');
const rootDir = './sheets/processed/IND';
const targetFile = 'report.json';
const getDirectories = (source) =>
  fs
    .readdirSync(source, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name);

const unique = (arr) => arr.filter((item, i, s) => s.lastIndexOf(item) === i);

const directories = getDirectories(rootDir);
const aggregate = {};

for (const directory of directories) {
  const targetDirectory = `${rootDir}/${directory}`;
  const files = fs.readdirSync(targetDirectory);
  if (files.includes(targetFile)) {
    const filePath = `${targetDirectory}/${targetFile}`;
    const report = JSON.parse(fs.readFileSync(filePath, 'UTF-8'));
    if (Array.isArray(report)) {
      const latestReport = report.pop();
      for (const key of Object.keys(latestReport)) {
        const type = typeof latestReport[key];
        if (Array.isArray(latestReport[key])) {
          if (!aggregate[key]) aggregate[key] = [];
          aggregate[key].push(...latestReport[key]);
        } else if (type === 'number') {
          if (!aggregate[key]) aggregate[key] = 0;
          aggregate[key] += latestReport[key];
        } else if (type === 'object') {
          for (const error of Object.keys(latestReport[key])) {
            if (!aggregate[key]) aggregate[key] = {};
            if (!aggregate[key][error]) aggregate[key][error] = 0;
            aggregate[key][error] += latestReport[key][error];
          }
        }
      }
    }
  }
}

for (const key of Object.keys(aggregate)) {
  if (Array.isArray(aggregate[key])) {
    aggregate[key] = unique(aggregate[key].map((v) => v.toLowerCase())).sort();
  }
}

fs.writeFileSync(`${rootDir}/aggregateReort.json`, JSON.stringify(aggregate, null, 2), 'UTF-8');
console.log(aggregate);
