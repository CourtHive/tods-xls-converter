import { genderConstants, matchUpTypes, entryStatusConstants } from 'tods-competition-factory';
import { postProcessors } from '../functions/postProcessors';
import { isNumeric } from '../utilities/identification';

import { HEADER, FOOTER, ROUND } from '../constants/sheetElements';
import {
  KNOCKOUT,
  ROUND_ROBIN,
  PARTICIPANTS,
  INFORMATION,
  REPORT,
  SIGN_UP,
  INDETERMINATE
} from '../constants/sheetTypes';
import {
  CATEGORY,
  CITY,
  DISTRICT,
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

const roundNames = [
  'round 1',
  '2nd round',
  '3rd round',
  'pre-quarters',
  'pre quarter finals',
  'round of 32',
  'quarterfinals',
  'quarter finals',
  'semifinal',
  'semifinals',
  'semi finals',
  'semi-finals',
  'finals',
  'final'
];
const categories = ['U10', 'U12', 'U14', 'U16', 'U18', 'OPEN', 'under-12', 'under-14', 'under-16', 'under-18'];
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
    matchUpStatuses: { bye: 'BYE', walkover: 'w/o', retired: 'cons' },
    matchOutcomes: ['def', 'ret', 'w.o', 'w/o', 'wo', 'cons', 'abandoned', 'default', 'retired'],
    entryStatusMap,
    categories,
    rowDefinitions: [
      {
        type: HEADER,
        id: 'signup',
        elements: ['practice courts', { text: 'sign-in', options: { startsWith: true } }],
        rows: 1,
        minimumElements: 1
      },
      {
        type: HEADER,
        id: 'playersList',
        elements: [`Player's List`],
        rows: 1,
        minimumElements: 1
      },
      {
        type: HEADER,
        id: 'notice',
        elements: ['notice'],
        rows: 1,
        minimumElements: 1
      },
      {
        type: HEADER,
        id: 'setup',
        elements: [{ text: 'setup page', options: { startsWith: true } }],
        rows: 1,
        minimumElements: 1
      },
      {
        type: HEADER,
        id: 'report',
        elements: [{ text: 'report cover', options: { startsWith: true } }, 'offence report', 'medical certification'],
        rows: 1,
        minimumElements: 1
      },
      {
        type: HEADER,
        id: 'knockoutParticipants',
        elements: [
          'rank',
          'seed',
          'name',
          'family name',
          'first name',
          'aita no',
          'reg no.',
          'reg.no',
          'state',
          ...roundNames
        ],
        rows: 1,
        minimumElements: 4
      },
      {
        type: FOOTER,
        id: 'drawFooter',
        elements: [
          { text: 'lucky losers', options: { includes: true } },
          'acc. ranking',
          'seeded players',
          'lucky losers',
          'replacing',
          'draw date/time',
          'alternates',
          'qualifiers',
          'qualifires',
          'aita representative'
        ],
        rows: 9,
        minimumElements: 2
      }
    ],
    headerColumns: [
      { attr: ENTRY_STATUS, header: { text: 'st', equals: true }, limit: 1 },
      { attr: RANKING, header: 'rank', limit: 1 },
      { attr: SEED_VALUE, header: 'seed', limit: 1 },
      { attr: LAST_NAME, header: 'family name', limit: 1 },
      { attr: FIRST_NAME, header: ['first name', 'fisrt name'], limit: 1 },
      {
        attr: PERSON_ID,
        header: [
          { text: 'reg no', options: { startsWith: true } },
          { text: 'reg.', options: { startsWith: true } },
          'aita no',
          'reg.no',
          'state',
          'nationality'
        ],
        limit: 1,
        skipWords: ['reg', 'umpire'],
        valueRegex: '^\\d{6}$'
      }, // TODO: implement regex check for id
      { attr: STATE, header: ['state'], limit: 1 },
      { attr: DISTRICT, header: ['dist'], limit: 1 },
      { attr: ROUND, header: [...roundNames] }
    ],
    sheetDefinitions: [
      {
        type: KNOCKOUT,
        infoClass: 'drawInfo',
        rowIds: ['knockoutParticipants', 'drawFooter'],
        minimumElements: 2
      },
      {
        type: ROUND_ROBIN,
        infoClass: 'drawInfo',
        rowIds: ['roundRobinParticipants', 'drawFooter'],
        minimumElements: 2
      },
      {
        type: INDETERMINATE,
        infoClass: 'drawInfo',
        rowIds: ['knockoutParticipants'],
        minimumElements: 2
      },
      {
        type: REPORT,
        rowIds: ['report']
      },
      {
        type: SIGN_UP,
        rowIds: ['signup']
      },
      {
        type: INFORMATION,
        rowIds: ['notice']
      },
      {
        type: INFORMATION,
        rowIds: ['setup']
      },
      {
        type: INFORMATION,
        rowIds: ['tournamentInfo', 'tournamentOrganization']
      },
      {
        type: PARTICIPANTS,
        rowIds: ['playersList']
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
        return columnProfile.character;
      }
    },
    converters: {
      category: (value) => {
        const re = new RegExp('under-', 'g');
        return value?.replace(re, 'u');
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
  },
  identifiers: ['AITA JUNIOR TOUR', { text: 'SPORTS india', includes: true }, { text: 'sportindia', includes: true }]
};
