import { genderConstants, matchUpTypes, entryStatusConstants } from 'tods-competition-factory';
import { postProcessors } from '../functions/postProcessors';
import { isNumeric } from '../utilities/identification';

import { KNOCKOUT, ROUND_ROBIN, PARTICIPANTS, INFORMATION } from '../constants/sheetTypes';
import { HEADER, FOOTER, ROUND } from '../constants/sheetElements';
import {
  CATEGORY,
  CITY,
  ENTRY_STATUS,
  EVENT_NAME,
  FIRST_NAME,
  GENDER,
  LAST_NAME,
  PERSON_ID,
  RANKING,
  REFEREE,
  SEED_VALUE,
  STATE,
  TOURNAMENT_ID,
  TOURNAMENT_NAME
} from '../constants/attributeConstants';

const { DIRECT_ACCEPTANCE, QUALIFYING, LUCKY_LOSER, WILDCARD } = entryStatusConstants;
const { SINGLES_MATCHUP, DOUBLES_MATCHUP } = matchUpTypes;
const { MALE, FEMALE, ANY } = genderConstants;

const categories = ['U10', 'U12', 'U14', 'U16', 'U18', 'OPEN'];
const entryStatusMap = {
  DA: DIRECT_ACCEPTANCE,
  LL: LUCKY_LOSER,
  Q: QUALIFYING,
  WC: WILDCARD
};

export const config = {
  organization: 'IND',
  mustContainSheetNames: [],
  profile: {
    providerId: 'IND-0123',
    skipWords: ['winner', 'winner;', 'winner:', 'umpire', 'none', 'finalist', { text: '\\\\\\', startsWith: true }],
    skipExpressions: ['[0-9,/, ]+pont', 'umpire'],
    considerAlpha: ['0'], // '0' is the participantName given to BYE positions
    considerNumeric: ['-'], // '-' is a placeholder when no ranking
    matchStatuses: ['def', 'ret', 'bye', 'w.o', 'w/o', 'wo', 'cons', 'abandoned'],
    matchUpStatuses: { bye: 'BYE', walkover: 'w/o' },
    matchOutcomes: ['def', 'ret', 'w.o', 'w/o', 'wo', 'cons', 'abandoned'],
    entryStatusMap,
    categories,
    rowDefinitions: [
      {
        type: HEADER,
        id: 'notice',
        elements: ['notice'],
        rows: 1,
        minimumElements: 1
      },
      {
        type: HEADER,
        id: 'knockoutParticipants',
        elements: [
          'rank',
          'seed',
          'family name',
          'first name',
          'reg.no',
          'state',
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
      { attr: ENTRY_STATUS, header: 'st.' },
      { attr: RANKING, header: 'rank' },
      { attr: SEED_VALUE, header: 'seed' },
      { attr: LAST_NAME, header: 'family name' },
      { attr: FIRST_NAME, header: 'first name' },
      { attr: PERSON_ID, header: ['reg.no', 'state'], valueRegex: '^\\d{6}$' },
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
        type: INFORMATION,
        rowIds: ['notice']
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
    tournamentInfo: [],
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
        attribute: [CITY],
        searchText: 'city',
        options: { startsWith: true },
        rowOffset: 1,
        postProcessor: 'cityParser'
      },
      {
        attribute: [STATE],
        searchText: 'city',
        options: { startsWith: true },
        rowOffset: 1,
        postProcessor: 'stateParser'
      },
      {
        attribute: [REFEREE],
        searchText: ['referee', 'refree'],
        options: { includes: true },
        rowOffset: 1,
        columnOffset: 1
      },
      {
        attribute: [EVENT_NAME],
        searchText: 'main draw',
        options: { startsWith: true },
        rowOffset: -1
      },
      {
        attribute: [CATEGORY],
        searchText: 'main draw',
        options: { startsWith: true },
        columnOffset: 4,
        postProcessor: 'categoryParser'
      },
      {
        attribute: 'matchUpType',
        searchText: 'main draw',
        options: { startsWith: true },
        rowOffset: -1,
        postProcessor: 'matchUpTypeParser'
      },
      {
        attribute: [GENDER],
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
      return male ? MALE : female ? FEMALE : ANY;
    },
    matchUpTypeParser: (value) => {
      return value?.toString().toLowerCase().includes('dobles') ? DOUBLES_MATCHUP : SINGLES_MATCHUP;
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
      if (allProgressionKeys) {
        columnProfile.values = [];
        columnProfile.character = 'progression';
      }
    }
  },
  sheetNameMatcher: (sheetNames) => {
    const potentials = sheetNames.some((sheetName) => {
      const sMain = /Si Main/.test(sheetName);
      const sQual = /Si Qual/.test(sheetName);
      const doMain = /Do Main/.test(sheetName);
      const doQual = /Do Qual/.test(sheetName);
      return sMain || doMain || doQual || sQual;
    });
    return potentials;
  }
};
