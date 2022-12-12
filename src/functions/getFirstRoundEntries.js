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

export function getFirstRoundEntries({
  preRoundParticipants,
  boundaryIndex,
  columnProfile,
  positionRows,
  analysis,
  profile
}) {
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
      positionAssignments.push({ drawPosition, bye: true });
      drawPosition += 1;
      return;
    }

    // Costa Rica Qualifiers
    const qTest = (name) => /^[Q,q]\d+\s/.test(name);
    const isQualifier = qTest(baseName);
    if (isQualifier)
      baseName = baseName
        .split(' ')
        .slice(1)
        .map((x) => x.trim())
        .filter(Boolean)
        .join(' ');

    const doublesNameSeparator = doublesSeparators.find((separator) => {
      const x = new RegExp(separator);
      return x.test(baseName);
    });

    let participantId;

    let qualifyingPosition;
    if (doublesNameSeparator) {
      const individualParticipants = baseName.split(new RegExp(doublesNameSeparator)).map((name) => {
        const { participant, isQualifyingPosition, isQualifier } = getIndividualParticipant({ name, analysis });
        if (isQualifier || isQualifyingPosition) qualifyingPosition = true;
        return participant;
      });
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
      if (participant.participantName) participants.push(participant);
    } else {
      const { participant, isQualifier, isQualifyingPosition } = getIndividualParticipant({ name: baseName, analysis });
      if (isQualifier || isQualifyingPosition) qualifyingPosition = true;
      participantId = participant.participantId;
      if (participant.participantName) participants.push(participant);
    }

    const seedValue = getSeeding(value);
    if (seedValue) seedAssignments.push({ seedValue, participantId });

    if (participantId) {
      positionAssignments.push({ drawPosition, participantId });
    } else if (qualifyingPosition) {
      positionAssignments.push({ drawPosition, qualifer: true });
    }

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
