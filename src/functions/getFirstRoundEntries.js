import { entryStatusConstants, participantConstants } from 'tods-competition-factory';
import { getNonBracketedValue, getSeeding, isBye } from '../utilities/convenience';
import { getIndividualParticipant } from './getIndividualParticipant';
import { limitedSeedAssignments } from './limitedSeedAssignments';
import { isNumeric } from '../utilities/identification';
import { generateParticipantId } from '../utilities/hashing';
import { getRow } from './sheetAccess';

import { SUCCESS } from '../constants/resultConstants';

const { DIRECT_ACCEPTANCE, QUALIFIER } = entryStatusConstants;
const { PAIR } = participantConstants;

export function getFirstRoundEntries({ boundaryIndex, columnProfile, profile, positionRows, preRoundParticipants }) {
  const positionAssignments = [];
  let seedAssignments = [];
  const participants = [];
  const entries = [];

  const doublesSeparators = profile.doubles?.regexSeparators || ['/'];

  const preRoundAdvancedRows =
    preRoundParticipants?.map(({ advancedPositionRef }) => getRow(advancedPositionRef)) || [];

  const isPositionRow = (index) => !positionRows || positionRows.includes(columnProfile.rows[index]);

  let drawPosition = 1;
  columnProfile.values.forEach((value, index) => {
    if (isNumeric(value) || !isPositionRow(index)) return;

    const isPreRoundParticipant = preRoundAdvancedRows.includes(columnProfile.rows[index]);
    const preRoundParticipantIndex = preRoundAdvancedRows.indexOf(columnProfile.rows[index]);
    let baseName = isPreRoundParticipant
      ? preRoundParticipants[preRoundParticipantIndex].participantName
      : getNonBracketedValue(value);

    if (isBye(baseName)) {
      positionAssignments.push({ bye: true, drawPosition });
      drawPosition += 1;
      return;
    }

    // Costa Rica Qualifiers
    const qTest = (name) => /^Q\d+\s/.test(name);
    const isQualifier = qTest(baseName);
    if (isQualifier) baseName = baseName.split(' ').slice(1).join(' ');

    const doublesNameSeparator = doublesSeparators.find((separator) => {
      const x = new RegExp(separator);
      return x.test(baseName);
    });

    let participantId;

    if (doublesNameSeparator) {
      const individualParticipants = baseName
        .split(new RegExp(doublesNameSeparator))
        .map((name) => getIndividualParticipant({ name }));
      const individualParticipantIds = individualParticipants.map(({ participantId }) => participantId);
      participantId = generateParticipantId({ attributes: individualParticipantIds })?.participantId;
      const participantName = individualParticipants.map(({ person }) => person.standardFamilyName).join('/');

      const participant = {
        participantRole: 'COMPETITOR',
        participantType: PAIR,
        individualParticipants,
        participantName,
        participantId
      };
      participants.push(participant);
    } else {
      const participant = getIndividualParticipant({ name: baseName });
      participantId = participant.participantId;
      participants.push(participant);
    }

    const seedValue = getSeeding(value);
    if (seedValue) seedAssignments.push({ seedValue, participantId });

    positionAssignments.push({ drawPosition, participantId });

    const entryStatus = isQualifier ? QUALIFIER : DIRECT_ACCEPTANCE;
    // TODO: const entryStage = qualifyingDraw ? QUALIFYING : MAIN;
    const entry = { participantId, entryStatus };
    entries.push(entry);

    drawPosition += 1;
  });

  const drawSize = columnProfile.values.length;
  seedAssignments = limitedSeedAssignments({ seedAssignments, participants, drawSize });

  if (positionAssignments.length) boundaryIndex += 1;

  return {
    positionAssignments,
    seedAssignments,
    boundaryIndex,
    participants,
    entries,
    ...SUCCESS
  };
}
