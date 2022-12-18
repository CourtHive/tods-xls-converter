import { SUCCESS } from '../constants/resultConstants';

let loggingActive = {},
  auditLog = [],
  workbookType,
  workbook;

export function audit(value) {
  auditLog.push(value);
}

export function getAudit() {
  const auditCopy = auditLog.slice();
  auditLog = [];
  return auditCopy;
}

export function resetLogging() {
  loggingActive = {};
}

export function getLoggingActive(type = 'global') {
  return loggingActive[type];
}

export function setLoggingActive(value, type = 'global') {
  loggingActive[type] = !!value;
  return { ...SUCCESS };
}

export function setWorkbook(data) {
  workbook = data;
  return { ...SUCCESS };
}

export function setWorkbookType(data) {
  workbookType = data;
  return { ...SUCCESS };
}

export function getWorkbook() {
  return { workbook, workbookType };
}

export function getWorkbookProps() {
  return { ...workbook, workbookType };
}

export default {
  getLoggingActive,
  setLoggingActive,
  getWorkbookProps,
  setWorkbookType,
  getWorkbook,
  setWorkbook
};
