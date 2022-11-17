import { processRoundRobin } from './processRoundRobin';
import { processKnockOut } from './processKnockout';
import { identifySheet } from './identifySheet';
import { extractInfo } from './extractInfo';

import { INFORMATION, PARTICIPANTS, KNOCKOUT, ROUND_ROBIN } from '../constants/sheetTypes';
import { MISSING_SHEET_DEFINITION, UNKNOWN_SHEET_TYPE } from '../constants/errorConditions';

/*
const pushData = ({ drawInfo, playersMap, participantsMap }) => {
  Object.assign(allParticipants, participantsMap || {});
  Object.assign(allPlayers, playersMap || {});
  draws.push(drawInfo);
};
*/

export function processSheet(workbook, profile, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  const sheetDefinition = identifySheet({ sheetName, sheet, profile });

  if (!sheetDefinition) {
    return { error: MISSING_SHEET_DEFINITION };
  } else if (sheetDefinition.type === KNOCKOUT) {
    return processKnockOut({
      sheetDefinition,
      sheetName,
      profile,
      sheet
    });
  } else if (sheetDefinition.type === ROUND_ROBIN) {
    return processRoundRobin({
      sheetDefinition,
      sheetName,
      profile,
      sheet
    });
  } else if (sheetDefinition.type === PARTICIPANTS) {
    //
  } else if (sheetDefinition.type === INFORMATION) {
    return extractInfo({
      infoClass: 'tournamentInfo',
      profile,
      sheet
    });
  } else {
    return { info: UNKNOWN_SHEET_TYPE };
  }
}
