import { postProcessors } from '../functions/postProcessors';
import { isNumeric } from '../utilities/identification';

import { KNOCKOUT, ROUND_ROBIN, PARTICIPANTS, INFORMATION } from '../constants/sheetTypes';
import { TOURNAMENT_ID, TOURNAMENT_NAME } from '../constants/attributeConstants';
import { HEADER, FOOTER, ROUND } from '../constants/sheetElements';

export const config = {
  organization: 'IND',
  mustContainSheetNames: [],
  profile: {
    providerId: 'IND-0123',
    skipWords: ['winner', 'winner;', 'winner:', 'umpire', 'none', 'finalist'],
    skipExpressions: ['[0-9,/, ]+pont', 'umpire'],
    considerAlpha: ['0'], // '0' is the participantName given to BYE positions
    considerNumeric: ['-'], // '-' is a placeholder when no ranking
    matchStatuses: ['def', 'ret', 'bye', 'w.o', 'w/o', 'wo', 'cons', 'abandoned'],
    matchOutcomes: ['def', 'ret', 'w.o', 'w/o', 'wo', 'cons', 'abandoned'],
    /*
    doubles: {
      drawPosition: {
        rowOffset: -1 // missing drawPosition for doubles partner is on previous line
      }
    },
    */
    rowDefinitions: [
      {
        type: HEADER,
        id: 'knockoutParticipants',
        elements: [
          'rank',
          'seed',
          'family name',
          'first name',
          'reg.no',
          '2nd round',
          '3rd round',
          'quarterfinals',
          'semifinals',
          'final'
        ],
        rows: 1,
        minimumElements: 5
      },
      {
        type: FOOTER,
        id: 'drawFooter',
        elements: ['acc. ranking', 'seeded players', 'luck losers', 'replacing', 'draw date/time'],
        rows: 9,
        minimumElements: 3
      }
    ],
    headerColumns: [
      { attr: 'entryStatus', header: 'st.' },
      { attr: 'ranking', header: 'rank' },
      { attr: 'seedValue', header: 'seed' },
      { attr: 'lastName', header: 'family name' },
      { attr: 'firstName', header: 'first name' },
      { attr: 'personId', header: 'reg.no' },
      { attr: ROUND, header: ['2nd round', 'quarterfinals', 'semifinals', 'final'] }
    ],
    sheetDefinitions: [
      {
        type: INFORMATION,
        rowIds: ['tournamentInfo', 'tournamentOrganization']
      },
      {
        type: KNOCKOUT,
        infoClass: 'drawInfo',
        rowIds: ['knockoutParticipants', 'drawFooter']
      },
      {
        type: ROUND_ROBIN,
        infoClass: 'drawInfo',
        rowIds: ['roundRobinParticipants', 'drawFooter']
      },
      {
        type: PARTICIPANTS,
        rowIds: ['singlesParticipants']
      },
      {
        type: PARTICIPANTS,
        rowIds: ['doublesParticipants']
      }
    ],
    gaps: { draw: { term: 'Round 1', gap: 0 } },
    playerRows: { playerNames: true, lastName: true, firstName: true },
    tournamentInfo: [
      {
        attribute: [TOURNAMENT_NAME],
        searchText: 'A verseny neve',
        rowOffset: 1
      },
      {
        attribute: 'dates',
        searchText: 'A verseny dátuma (éééé.hh.nn)',
        rowOffset: 1,
        postProcessor: 'dateParser'
      },
      { attribute: 'city', searchText: 'Város', rowOffset: 1 },
      { attribute: 'referee', searchText: 'Versenybíró:', rowOffset: 1 },
      { attribute: 'doctor', searchText: 'Orvos neve:', rowOffset: 1 },
      {
        attribute: 'organizer',
        searchText: 'Verseny rendezője:',
        rowOffset: 1
      },
      { attribute: 'director', searchText: 'Versenyigazgató', rowOffset: 1 },
      {
        attribute: 'categories',
        searchText: 'Versenyszám 1',
        rowOffset: 1,
        columnOffsets: [0, 1, 2, 3, 4]
      }
    ],
    drawInfo: [
      {
        attribute: [TOURNAMENT_NAME],
        cellRef: 'A1' // function to look at A1, A2 and select the longest value or the value which includes 'tournament'
      },
      {
        attribute: [TOURNAMENT_ID],
        searchText: 'tourn. id',
        rowOffset: 1
      },
      {
        attribute: 'level',
        searchText: 'grade',
        rowOffset: 1
      },
      {
        attribute: 'startDate',
        searchText: 'week of',
        rowOffset: 1,
        postProcessor: 'dateParser'
      },
      {
        attribute: 'city',
        searchText: 'city',
        options: { startsWith: true },
        rowOffset: 1,
        postProcessor: 'cityParser'
      },
      {
        attribute: 'state',
        searchText: 'city',
        options: { startsWith: true },
        rowOffset: 1,
        postProcessor: 'stateParser'
      },
      {
        attribute: 'referee',
        searchText: ['referee', 'refree'],
        options: { includes: true },
        rowOffset: 1,
        columnOffset: 1
      },
      {
        attribute: 'eventName',
        searchText: 'main draw',
        options: { startsWith: true },
        rowOffset: -1
      },
      {
        attribute: 'category',
        searchText: 'main draw',
        options: { startsWith: true },
        columnOffset: 4,
        postProcessor: 'categoryParser'
      },
      {
        attribute: 'gender',
        searchText: 'main draw',
        options: { startsWith: true },
        rowOffset: -1,
        postProcessor: 'genderParser'
      },
      { attribute: 'drawCreationDate', searchText: 'Draw date/time', columnOffset: 2, postProcessor: 'dateTimeParser' },
      { attribute: 'representatives', searchText: 'Player representatives', rowOffset: 1, rowCount: 2 },
      { attribute: 'topDirectAcceptance', searchText: 'Top DA', columnOffset: 2, postProcessor: 'parseInt' },
      { attribute: 'lastDirectAcceptance', searchText: 'Last DA', columnOffset: 2, postProcessor: 'parseInt' },
      {
        attribute: 'rankingDate',
        searchText: 'Acc. ranking',
        rowOffset: 1,
        columnOffset: 2,
        postProcessor: 'dateParser'
      },
      { attribute: 'topSeed', searchText: 'Top seed', columnOffset: 2, postProcessor: 'parseInt' },
      { attribute: 'lastSeed', searchText: 'Last seed', columnOffset: 2, postProcessor: 'parseInt' },
      {
        attribute: 'seedingDate',
        searchText: 'Seed ranking',
        rowOffset: 1,
        columnOffset: 2,
        postProcessor: 'dateParser'
      },
      { attribute: 'seededParticipantNames', searchText: 'Seeded players', rowOffset: 1, rowCount: 8 },
      { attribute: 'luckyLoserPlayerNames', searchText: 'Lucky losers', rowOffset: 1, rowCount: 8 }
    ],
    dateTimeParser: (dateTimeString) => {
      const [iDate, time] = dateTimeString.split(' ');
      const date = postProcessors.dateParser(iDate);
      return { date, time };
    },
    categoryParser: (value) => {
      value = value
        .split(' ')
        .filter((c) => !['-'].includes(c))
        .join('');
      return value.includes('U') ? [...value.split('U'), 'U'].join('') : value;
    },
    genderParser: (value) => {
      const male = /^BOYS/.test(value);
      const female = /^GIRLS/.test(value);
      return { gender: male ? 'M' : female ? 'W' : 'X' };
    },
    cityParser: (value) => {
      const splitChar = [',', '/'].find((char) => value.includes(char));
      return value.split(splitChar)[0];
    },
    stateParser: (value) => {
      const splitChar = [',', '/'].find((char) => value.includes(char));
      const splitValue = value.split(splitChar);
      const state = splitValue.length > 1 ? splitValue[1].trim() : '';
      return state?.toLowerCase() === 'india' ? '' : state;
    },
    isProviderId: (value) => isNumeric(value) && (value === 0 || value.toString().length === 6),
    columnCharacter: ({ columnProfile }) => {
      const { values } = columnProfile;
      const allProgressionKeys = values.every(
        (value) => typeof value === 'string' && ['a', 'b', 'as', 'bs'].includes(value.toLowerCase())
      );
      if (allProgressionKeys) columnProfile.values = [];
    }
  },
  sheetNameMatcher: (sheetNames) => {
    const potentials = sheetNames.some((sheetName) => {
      const mTest = /Si Main/.test(sheetName);
      return mTest;
    });
    return potentials;
  }
};
