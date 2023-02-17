import { utilities } from 'tods-competition-factory';
import { writeFileSync } from 'fs-extra';
import { utils, writeFile } from 'xlsx';

import { ROUND_ROBIN } from '../constants/sheetTypes';

export function writeTODS08CSV({ matchUps, writeDir, writeXLSX }) {
  const getPerspectiveScoreString = (matchUp) => {
    const { score, winningSide } = matchUp;
    matchUp.perspectiveScoreString =
      !winningSide || winningSide === 1 ? score?.scoreStringSide1 : score?.scoreStringSide2;
  };
  matchUps.forEach(getPerspectiveScoreString);
  matchUps = matchUps.filter((m) => m.perspectiveScoreString);

  const getFirstChar = (value) => value?.slice(0, 1);
  const config = {
    delimiter: `"`,
    columnJoiner: `|`,
    includeTransformAccessors: true, // will include columnTransoforms in columnAccessors; otherwise [] value will return all columns
    columnAccessors: [],
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
      Side2Player1ID: [
        'sides.1.participant.individualParticipants.0.participantId',
        'sides.1.participant.participantId'
      ],
      Side2Player2: ['sides.1.participant.individualParticipants.1.participantName'],
      Side2Player2ID: ['sides.1.participant.individualParticipants.1.participantId'],

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
      // MatchUpFormat: ['matchUpFormat'],
      Gender: ['gender'],
      RoundNumber: ['roundNumber'],
      RoundPosition: ['roundPosition'],
      DrawStructure: ['drawType'],
      IdentifierType: ['identifierType'],
      Filename: ['fileName']
    },
    valuesMap: {
      MatchUpStatus: { COMPLETED: 'CO', RETIRED: 'RET', DEFAULTED: 'DEF', TO_BE_PLAYED: 'TBP', WALKOVER: 'WO' },
      Gender: { MALE: 'M', FEMALE: 'F', MIXED: 'X', ANY: 'A' }
    },
    functionMap: {
      DrawStructure: (value) => (value === ROUND_ROBIN ? 'RR' : 'KO'),
      IndoorOutdoor: (value) => getFirstChar(value),
      MatchUpType: (value) => getFirstChar(value)
    },
    sortOrder: [
      'TournamentEndDate',
      'TournamentName',
      'TournamentID',
      'MatchUpStartDate',
      'MatchUpEndDate',
      'MatchUpID',
      'MatchUpStatus',
      'MatchUpType',
      'RoundNumber',
      'RoundPosition',
      'ScoreString',
      'WinningSide',
      'Side1Player1ID',
      'Side2Player1ID',
      'Side1Player2ID',
      'Side2Player2ID',
      'Side1Player1',
      'Side2Player1',
      'Side1Player2',
      'Side2Player2'
    ]
  };

  if (writeXLSX) {
    const flatJSONmatchUps = utilities.JSON2CSV(matchUps, { ...config, returnTransformedJSON: true });
    const worksheet = utils.json_to_sheet(flatJSONmatchUps);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'matchUps');
    writeFile(workbook, `${writeDir}/matchUps.xlsx`, { compression: true });
  }
  const csvMatchUps = utilities.JSON2CSV(matchUps, config);
  writeFileSync(`${writeDir}/matchUps.csv`, csvMatchUps, 'UTF-8');
}
