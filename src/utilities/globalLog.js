import { utilities } from 'tods-competition-factory';
import { logColors } from '../assets/logColors';

const globalLog = [];

export function pushGlobalLog(value) {
  if (typeof value === 'string') value = { method: value };
  globalLog.push(value);
}

export function popGlobalLog(value) {
  return globalLog.pop(value);
}

export function getGlobalLog(purge) {
  const globalLogCopy = globalLog.slice();
  if (purge) {
    globalLog.length = 0;
  }
  return globalLogCopy;
}

const internalKeys = ['color', 'keyColors', 'method', 'newLine', 'lineAfter', 'separator', 'divider'];

export function printGlobalLog(purge) {
  const globalLogCopy = getGlobalLog(purge);

  const modifiedText = globalLogCopy.map((line) => {
    const { color, keyColors = {}, method, newLine, lineAfter, divider, separator = '-' } = line;
    const methodColor = Object.keys(logColors).includes(color) ? logColors[color] : logColors.cyan;
    const bodyKeys = Object.keys(line).filter((key) => !internalKeys.includes(key));
    const attributeColor =
      (Object.keys(keyColors).includes('attributes') && logColors[keyColors.attributes]) || logColors.white;
    const body = bodyKeys
      .map((key) => {
        const keyColor =
          keyColors && Object.keys(keyColors).includes(key) && logColors[keyColors[key]]
            ? logColors[keyColors[key]]
            : logColors.brightwhite;
        return `${attributeColor}${key}: ${keyColor}${line[key]}`;
      })
      .join(', ');

    const tabs = method?.length < 15 ? `\t\t` : '\t';
    const separationLine = !isNaN(divider)
      ? utilities
          .generateRange(0, divider)
          .map(() => separator)
          .join('') + '\n'
      : '';

    return [
      newLine ? '\n' : '',
      methodColor,
      method,
      tabs,
      logColors.white,
      body,
      logColors.reset,
      '\n',
      separationLine,
      lineAfter ? '\n' : ''
    ].join('');
  });
  if (modifiedText?.length) console.log(...modifiedText);
}

export function purgeGlobalLog() {
  globalLog.length = 0;
}
