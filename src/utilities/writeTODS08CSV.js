import { utilities } from 'tods-competition-factory';
import { writeFileSync } from 'fs-extra';

export function writeTODS08CSV({ matchUps, writeDir }) {
  const getPerspectiveScoreString = (matchUp) => {
    const { score, winningSide } = matchUp;
    matchUp.perspectiveScoreString =
      !winningSide || winningSide === 1 ? score.scoreStringSide1 : score.scoreStringSide2;
  };
  matchUps.forEach(getPerspectiveScoreString);

  const getFirstChar = (value) => value?.slice(0, 1);
  const config = {
    delimiter: '"',
    includeTransformAccessors: true,
    columnTransform: {
      MatchUpID: ['matchUpId'],
      // SIDE 1
      Side1Player1: [
        'sides.0.participant.individualParticipants.0.participantName',
        'sides.0.participant.participantName'
      ],
      Side1Player1ID: [
        'sides.0.participant.individualParticipants.0.participantId',
        'sides.0.participant.participantId'
      ],
      Side1Player2: ['sides.0.participant.individualParticipants.1.participantName'],
      Side1Player2ID: ['sides.0.participant.individualParticipants.1.participantId'],

      // SIDE 2
      Side2Player1: [
        'sides.1.participant.individualParticipants.0.participantName',
        'sides.1.participant.participantName'
      ],
      Side2Player1Id: [
        'sides.1.participant.individualParticipants.0.participantId',
        'sides.1.participant.participantId'
      ],
      Side2Player2: ['sides.1.participant.individualParticipants.1.participantName'],
      Side2Player2Id: ['sides.1.participant.individualParticipants.1.participantId'],

      WinningSide: ['winningSide'],
      ScoreString: ['perspectiveScoreString'],
      MatchUpStatus: ['matchUpStatus'],
      MatchUpType: ['matchUpType'],
      TournamentID: ['tournamentId'],
      TournamentName: ['tournamentName'],
      MatchUpStartDate: ['endDate'],
      MatchUpEndDate: ['endDate'],
      TournamentEndDate: ['endDate'],
      AgeCategoryCode: ['category.ageCategoryCode'],
      TournamentLevel: ['level'],
      MatchUpFormat: ['matchUpFormat'],
      Gender: ['gender'],
      IndoorOutdoor: ['indoorOutdoor'],
      RoundNumber: ['roundNumber'],
      RoundPosition: ['roundPosition'],
      DrawStructure: ['drawType']
    },
    valueMap: {
      MatchUpStatus: { COMPLETED: 'CO', RETIRED: 'RET', DEFAULTED: 'DEF', TO_BE_PLAYED: 'TBP' },
      Gender: { MALE: 'M', FEMALE: 'F', MIXED: 'X', ANY: 'A' },
      DrawStructure: { ROUND_ROBIN: 'RR', ELIMINATION: 'KO' }
    },
    functionMap: {
      IndoorOutdoor: (value) => getFirstChar(value),
      MatchUpType: (value) => getFirstChar(value)
    }
  };
  const csvMatchUps = utilities.JSON2CSV(matchUps, config);
  writeFileSync(`${writeDir}/matchUps.csv`, csvMatchUps, 'UTF-8');
}
