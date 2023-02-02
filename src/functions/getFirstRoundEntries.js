import { getNonBracketedValue, getSeeding, isBye } from '../utilities/convenience';
import { getIndividualParticipant } from './getIndividualParticipant';
import { limitedSeedAssignments } from './limitedSeedAssignments';
import { entryStatusConstants } from 'tods-competition-factory';
import { getPairParticipant } from './getPairParticipant';
import { isNumeric } from '../utilities/identification';
import { getRow } from './sheetAccess';

import { SUCCESS } from '../constants/resultConstants';

const { DIRECT_ACCEPTANCE, QUALIFIER } = entryStatusConstants;

export function getFirstRoundEntries({
  preRoundParticipants,
  boundaryIndex,
  columnProfile,
  positionRows,
  idColumn,
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
  columnProfile?.values.forEach((value, index) => {
    if (isNumeric(value) || !isPositionRow(index)) return;

    const isPreRoundParticipant = preRoundAdvancedRows.includes(columnProfile.rows[index]);
    const preRoundParticipantIndex = preRoundAdvancedRows.indexOf(columnProfile.rows[index]);
    const preRoundParticipant = preRoundParticipants?.[preRoundParticipantIndex];
    let baseName = isPreRoundParticipant ? preRoundParticipant.participantName : getNonBracketedValue(value);

    if (isBye(baseName)) {
      positionAssignments.push({ drawPosition, bye: true });
      drawPosition += 1;
      return;
    }

    const isValidParticipantName = (participantName) => {
      if (!participantName) return false;
      if (!profile.matchUpStatuses) return true;
      return !Object.values(profile.matchUpStatuses).flat().includes(participantName?.toString().toLowerCase());
    };

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
    if (isPreRoundParticipant) {
      const { drawPosition, advancedPositionRef, ...participant } = preRoundParticipant;
      if (drawPosition && advancedPositionRef);
      participants.push(participant);
      participantId = participant.participantId;
    } else if (doublesNameSeparator) {
      let splitBaseName = baseName.split(new RegExp(doublesNameSeparator));
      if (splitBaseName.length > 2) {
        // if the doublesNameSeparator appears more than once, determine whether to use 1st or last
        const firstIsFull = splitBaseName[0].includes[' '] || splitBaseName[0].includes(',');
        const index = firstIsFull ? 1 : splitBaseName.length - 1;
        const nameOne = splitBaseName.slice(0, index).join(', ');
        const nameTwo = splitBaseName.slice(index).join(', ');
        splitBaseName = [nameOne, nameTwo];
      }
      const individualParticipants = splitBaseName.map((name) => {
        const { participant, isQualifyingPosition, isQualifier } = getIndividualParticipant({ name, analysis });
        if (isQualifier || isQualifyingPosition) qualifyingPosition = true;
        return participant;
      });

      const participant = getPairParticipant({ individualParticipants });
      const participantName = participant.participantName;
      participantId = participant.participantId;
      /*
      const individualParticipantIds = individualParticipants.map(({ participantId }) => participantId);
      participantId = generateParticipantId({ attributes: individualParticipantIds })?.participantId;
      const participantName = individualParticipants
        .map(({ person }) => person.standardFamilyName || person.standardGivenName?.split(' ').reverse()[0])
        .join('/');

      const participant = {
        participantRole: 'COMPETITOR',
        participantType: PAIR,
        individualParticipants,
        participantName,
        participantId
      };
      */
      if (isValidParticipantName(participantName)) {
        participants.push(participant);
      }
    } else {
      const { participant, isQualifier, isQualifyingPosition } = getIndividualParticipant({ name: baseName, analysis });
      if (isQualifier || isQualifyingPosition) qualifyingPosition = true;
      participantId = participant.participantId;

      if (isValidParticipantName(participant.participantName)) {
        participants.push(participant);
      }
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

  const drawSize = columnProfile?.values.length || 0;
  seedAssignments = limitedSeedAssignments({ seedAssignments, participants, drawSize });

  if (positionAssignments.length) boundaryIndex += 1;

  return {
    positionAssignments,
    seedAssignments,
    boundaryIndex,
    participants,
    idColumn,
    entries,
    ...SUCCESS
  };
}
