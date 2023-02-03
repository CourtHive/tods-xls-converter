// aggrete all report.js files from ./sheets/processed/IND/%year$
const fs = require('fs-extra');
const rootDir = './sheets/processed/IND';
const targetFile = 'report.json';
const getDirectories = (source) =>
  fs
    .readdirSync(source, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name);

const directories = getDirectories(rootDir);
const aggregate = { errorsByType: {} };

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
        if (type === 'number') {
          if (!aggregate[key]) aggregate[key] = 0;
          aggregate[key] += latestReport[key];
        } else if (type === 'object' && key === 'errorsByType') {
          for (const error of Object.keys(latestReport[key])) {
            if (!aggregate[key][error]) aggregate[key][error] = 0;
            aggregate[key][error] += latestReport[key][error];
          }
        }
      }
    }
  }
}

fs.writeFileSync(`${rootDir}/aggregateReort.json`, JSON.stringify(aggregate, null, 2), 'UTF-8');
console.log(aggregate);
