let tournamentRecord = {},
  workbookType,
  workbook;

export function setWorkbook(data) {
  workbook = data;
}

export function setWorkbookType(data) {
  workbookType = data;
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
