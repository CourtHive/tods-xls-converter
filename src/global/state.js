import { SUCCESS } from '../constants/resultConstants';

let tournamentRecord = {},
  loggingActive = {},
  workbookType,
  workbook;

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

export function getTournamentRecord() {
  return { tournamentRecord };
}

export function setTournamentRecord(record) {
  tournamentRecord = record;
}

export default {
  getTournamentRecord,
  getLoggingActive,
  setLoggingActive,
  getWorkbookProps,
  setWorkbookType,
  getWorkbook,
  setWorkbook
};
