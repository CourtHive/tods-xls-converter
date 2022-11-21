import { SUCCESS } from '../constants/resultConstants';

let tournamentRecord = {},
  loggingActive,
  workbookType,
  workbook;

export function getLoggingActive() {
  return loggingActive;
}

export function setLoggingActive(value) {
  loggingActive = !!value;
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
