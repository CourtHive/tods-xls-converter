import { utilities } from 'tods-competition-factory';
import { getLoggingActive } from '../global/state';
import { logColors } from '../assets/logColors';
import { isString } from './identification';

const namedLogs = {};
const globalLog = [];

export function pushGlobalLog(value, logName) {
  if (!getLoggingActive()) return;

  if (isString(value)) value = { method: value };
  if (isString(logName)) {
    if (namedLogs[logName]) {
      namedLogs[logName].push(value);
    } else {
      namedLogs[logName] = [value];
    }
  } else {
    globalLog.push(value);
  }
}

export function popGlobalLog(value) {
  return globalLog.pop(value);
}

export function getGlobalLog({ purge, logName } = {}) {
  const globalLogCopy = logName && namedLogs[logName] ? namedLogs[logName].slice() : globalLog.slice();
  if (purge) purgeGlobalLog(logName);
  return globalLogCopy;
}

const internalKeys = ['color', 'keyColors', 'method', 'newLine', 'lineAfter', 'separator', 'divider'];

export function printGlobalLog(props) {
  const globalLogCopy = getGlobalLog(props);
  printLog(globalLogCopy);
}

export function printLog(logArray) {
  if (!Array.isArray(logArray)) return;

  const modifiedText = logArray.map((line) => {
    const { color, keyColors = {}, method, newLine, lineAfter, divider, separator = '-' } = line;
    const methodColor = Object.keys(logColors).includes(color) ? logColors[color] : logColors.cyan;
    const bodyKeys = Object.keys(line).filter((key) => !internalKeys.includes(key));
    const attributeColor =
      (Object.keys(keyColors).includes('attributes') && logColors[keyColors.attributes]) || logColors.white;
    const body = bodyKeys
      .map((key) => {
        if (line[key] === undefined) return;

        const keyColor =
          keyColors && Object.keys(keyColors).includes(key) ? logColors[keyColors[key]] : logColors.brightwhite;

        return `${attributeColor}${key}: ${keyColor}${line[key]}`;
      })
      .filter(Boolean)
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

export function purgeGlobalLog(logName) {
  if (logName) {
    if (namedLogs[logName]) namedLogs[logName].length = 0;
  } else {
    globalLog.length = 0;
  }
}

export default {
  purgeGlobalLog,
  printGlobalLog,
  pushGlobalLog,
  getGlobalLog,
  popGlobalLog,
  printLog
};
