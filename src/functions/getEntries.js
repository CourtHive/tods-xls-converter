import { tournamentEngine, utilities, matchUpStatusConstants, entryStatusConstants } from 'tods-competition-factory';
import { generateParticipantId } from '../utilities/hashing';
import { isString } from '../utilities/identification';
import { getLoggingActive } from '../global/state';
import { getRow } from './sheetAccess';

import { ENTRY_DETAILS } from '../constants/attributeConstants';
import { POLICY_SEEDING_ITF } from '../assets/seedingPolicy';
const { DIRECT_ACCEPTANCE } = entryStatusConstants;
const { BYE } = matchUpStatusConstants;

export function getEntries({ analysis, profile, positionRefs, columns, preRoundColumn, positionColumn }) {
  const positionAssignments = [];
  const seedAssignments = [];
  const rowParticipants = {};
  const entries = [];

  const attributeColumns = Object.keys(analysis.columns);
  const entryDetailAttributes = ENTRY_DETAILS.filter((attribute) => attributeColumns.includes(attribute));
  const entryDetailColumns = entryDetailAttributes.flatMap((attribute) => analysis.columns[attribute]);

  const boundaryColumnsToConsider = [preRoundColumn, positionColumn, ...entryDetailColumns].filter(Boolean);
  const boundaryIndex = Math.max(...boundaryColumnsToConsider.map((column) => columns.indexOf(column)), 0);

  for (const attribute of entryDetailAttributes) {
    const attributeColumn = analysis.columns[attribute];
    if (Array.isArray(attributeColumn)) {
      console.log('error: multipple attribute columns');
      continue;
    }
    const columnProfile = analysis.columnProfiles.find((profile) => profile.column === attributeColumn);
    const rows = positionRefs.map(getRow).sort(utilities.numericSort);
    rows.forEach((row, i) => {
      const cellRef = `${attributeColumn}${row}`;
      if (!rowParticipants[row]) rowParticipants[row] = {};
      const value = columnProfile.keyMap[cellRef];
      // const value = getCellValue(sheet[cellRef]);
      if (value) rowParticipants[row][attribute] = value;
      rowParticipants[row].drawPosition = i + 1;
    });
  }

  const isBye = (participant) =>
    Object.values(participant).some((value) => isString(value) && value.toLowerCase() === BYE.toLowerCase());

  const participantCount = Object.values(rowParticipants).filter((participant) => !isBye(participant)).length;
  const drawSize = positionRefs.length;
  const policyDefinitions = { ...POLICY_SEEDING_ITF };
  const { seedsCount } = tournamentEngine.getSeedsCount({
    policyDefinitions,
    participantCount,
    drawSize
  });

  const participants = Object.values(rowParticipants)
    .filter((participant) => {
      if (participant.seedValue > seedsCount) {
        delete participant.seedValue;
      }
      const participantIsBye = isBye(participant);
      const { drawPosition, personId, firstName, lastName, ranking, participantName, seedValue } = participant;
      const participantId =
        personId ||
        generateParticipantId({ attributes: [firstName, lastName, ranking, participantName].filter(Boolean) });
      const positionAssignment = participantIsBye ? { drawPosition, bye: true } : { drawPosition, participantId };

      positionAssignments.push(positionAssignment);
      participant.participantId = participantId;

      if (!participantIsBye) {
        const entryStatus = profile.entryStatusMap?.[participant.entryStatus] || DIRECT_ACCEPTANCE;
        const entry = { participantId, entryStatus };
        entries.push(entry);
      }

      if (seedValue) {
        seedAssignments.push({ seedValue, participantId });
      }

      return !participantIsBye;
    })
    .map((participant) => {
      const { participantId, ranking, personId, firstName, lastName } = participant;
      const person = { standardFamilyName: lastName, standardGivenName: firstName, personId };
      const participantName = participant.participantName || `${lastName}, ${firstName}`;

      // TODO: ranking should be attached as a timeItem
      return { participantId, participantName, person, ranking };
    });

  if (getLoggingActive('dev')) {
    // console.log(analysis.columnProfiles);
    // console.log(Object.keys(analysis));
    // console.log(analysis.attributeMap);
  }

  return { entries, boundaryIndex, participants, positionAssignments, seedAssignments };
}
