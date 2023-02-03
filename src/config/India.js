import { genderConstants, matchUpTypes, drawDefinitionConstants, entryStatusConstants } from 'tods-competition-factory';
import { postProcessors } from '../functions/postProcessors';
import { isNumeric } from '../utilities/identification';

import { roundNames as stockRoundNames } from './roundNames';
import { HEADER, FOOTER, ROUND } from '../constants/sheetElements';
import { POSITION } from '../constants/columnConstants';
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
  NATIONALITY,
  PERSON_ID,
  RANKING,
  REFEREE,
  SEED_VALUE,
  STATE,
  TOURNAMENT_ID,
  TOURNAMENT_NAME
} from '../constants/attributeConstants';

const { DIRECT_ACCEPTANCE, QUALIFYING, LUCKY_LOSER, WILDCARD } = entryStatusConstants;
const { QUALIFYING: QUALIFYING_STAGE, MAIN } = drawDefinitionConstants;
const { SINGLES_MATCHUP, DOUBLES_MATCHUP } = matchUpTypes;
const { MALE, FEMALE, ANY } = genderConstants;

const roundNames = [...stockRoundNames];

const qualifyingIdentifiers = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8'];
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
    identifierType: 'NationalID',
    replaceWords: [{ value: '-bye-', replacement: 'bye' }],
    exciseWords: [
      { regex: '^page \\d.*' },
      { regex: '.*\\d{2,}[ap]m' },
      { regex: `^q\\d$` },
      { regex: `^a/f$` }, // needs to be removed from id column
      { regex: `^[as|b|a|bs]+$` }, // needs to be removed from round column
      { regex: '^[0-9:]+[a|p]{1}m$' },
      { regex: 'happen$' }, // "Didn't Happen" used for "CANCELLED"
      { regex: "didn't happen$" }, // "Didn't Happen" used for "CANCELLED"
      { regex: '^\\d{1,2}/\\d{1,2}/\\d{2,4}$' } // dates
    ],
    skipWords: [
      // all behave as startsWith
      'winner',
      'a/f',
      'winner;',
      'winner:',
      'umpire',
      'none',
      'finalist',
      'later rounds',
      { text: 'quarterfinalist', startsWith: true },
      { text: '\\\\\\', startsWith: true }
    ],
    skipExpressions: ['[0-9,/, ]+pont', 'umpire'],
    considerAlpha: ['0'], // '0' is the participantName given to BYE positions
    considerNumeric: ['-'], // '-' is a placeholder when no ranking
    matchStatuses: ['def', 'ret', 'bye', 'w.o', 'w/o', 'wo', 'cons', 'abandoned'],
    matchUpStatuses: { bye: 'BYE', walkover: 'wo', retired: 'cons' },
    matchOutcomes: ['def', 'ret', 'w.o', 'w/o', 'wo', 'cons', 'abandoned', 'default', 'retired'],
    subsequentColumnLimit: 2, // elimination structure outcome look ahead
    qualifyingIdentifiers,
    entryStatusMap,
    categories,
    doubles: {
      regexSeparators: ['/', /\s{3,}/g]
    },
    rowDefinitions: [
      {
        type: HEADER,
        id: 'summary',
        elements: ['name', 'point', 'lost in round', { text: 'total point', options: { startsWith: true } }],
        rows: 1,
        minimumElements: 3
      },
      {
        type: HEADER,
        id: 'result',
        elements: ['lost in round'],
        rows: 1,
        minimumElements: 1
      },
      {
        type: HEADER,
        id: 'signup',
        elements: [
          'practice courts',
          { text: 'online sign-in', options: { includes: true } },
          { text: 'sign-in', options: { startsWith: true } }
        ],
        rows: 1,
        minimumElements: 1
      },
      {
        type: HEADER,
        id: 'playersList',
        elements: [
          `player's list`,
          { text: 'acceptance list', options: { startsWith: true } },
          { text: 'no show', options: { includes: true } },
          { text: 'late withdrawal', options: { startsWith: true } },
          { text: 'no show', options: { endsWith: true } }
        ],
        rows: 1,
        minimumElements: 1
      },
      {
        type: HEADER,
        id: 'notice',
        elements: ['notice', { text: 'important', options: { startsWith: true } }],
        rows: 1,
        minimumElements: 1
      },
      {
        type: HEADER,
        id: 'setup',
        elements: [
          { text: 'setup page', options: { includes: true } },
          { text: 'preparation', options: { startsWith: true } }
        ],
        rows: 1,
        minimumElements: 1
      },
      {
        type: HEADER,
        id: 'report',
        elements: [
          { text: 'report cover', options: { startsWith: true } },
          { text: 'compatibility', options: { startsWith: true } },
          { text: 'acceptance sheet', options: { startsWith: true } },
          { text: 'acceptance list', options: { startsWith: true } },
          { text: 'medical certification', options: { startsWith: true } },
          'offence report'
        ],
        rows: 1,
        minimumElements: 1
      },
      {
        type: HEADER,
        id: 'knockoutParticipants',
        extractColumns: true,
        elements: [
          'rank',
          'seed',
          'name',
          'time',
          'name of players',
          'Name of Player',
          'family name',
          'family',
          'player',
          'player name',
          'first name',
          'nationality',
          'aita no',
          'sl no',
          'sr no',
          'member id',
          'aita reg no',
          'reg no.',
          'reg.no',
          'sr.no',
          'reg',
          'state',
          ...roundNames
        ],
        rows: 1,
        minimumElements: 3
      },
      {
        type: FOOTER,
        id: 'drawFooter',
        elements: [
          { text: 'lucky losers', options: { includes: true } },
          'acc. ranking',
          'seeded teams',
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
      { attr: POSITION, header: ['#', 'sr. no', 'sr no', 'sno', 's.n'], valueRegex: '^\\d{1,3}$' },
      { attr: ENTRY_STATUS, header: { text: 'st', equals: true }, limit: 1 },
      { attr: RANKING, header: ['rank', 'co-rank'], limit: 1, valueRegex: `^\\d{0,4}$` },
      {
        attr: SEED_VALUE,
        header: [{ text: 'seed', options: { startsWith: true } }, 'seed', 'seed no', 'sd', 'sd no', 'sd. no'],
        limit: 1,
        valueRegex: `^\\d{0,2}$`
      },
      {
        attr: LAST_NAME,
        header: [
          'name',
          'surname',
          'player',
          'player name',
          'players name',
          'last name',
          'family name',
          'family',
          'familiy name',
          'famlily name',
          { text: 'players', includes: true },
          'round 1'
        ],
        limit: 1,
        skipWords: ['0'],
        valueRegex: "^([A-Za-z\\.'\\- ]+)$"
      },
      {
        attr: FIRST_NAME,
        skipWords: ['0'],
        header: ['first name', 'fiirst name', 'fisrt name', 'given name'],
        limit: 1,
        valueRegex: `^([A-Za-z\\.'\\- ]+)$`
      },
      {
        attr: PERSON_ID, // sometimes appears also in the Rank column
        header: [
          { regex: 'itn$' },
          { text: 'aita', startsWith: true },
          { text: 'reg no', startsWith: true },
          { text: 'state reg', startsWith: true },
          { text: 'reg', startsWith: true },
          { text: 'registration', startsWith: true },
          { text: 'regn no', includes: true },
          { text: 'rect no', includes: true },
          'reg.no',
          'member id',
          's no',
          'sr no',
          'sl no',
          'itn no',
          'state',
          'sate',
          'first name',
          'city',
          'nationality',
          'rank',
          'st'
        ],
        limit: 1,
        required: true,
        skipWords: ['reg', 'umpire', '0', 'a/f', 'AF', 'new id', 'app', 'new', 'applied'],
        valueRegex: '[\\w-]*(\\d{5,})[ A-Za-z]*$',
        valueMatchThreshold: 0.45,
        extract: true
      },
      {
        attr: NATIONALITY,
        header: ['nationality'],
        limit: 1,
        skipWords: ['0'],
        valueRegex: '^[A-Za-z ]*$',
        valueMatchThreshold: 0.2
      },
      { attr: STATE, header: ['state'], limit: 1 },
      { attr: CITY, header: ['city'], limit: 1 },
      { attr: DISTRICT, header: ['dist'], limit: 1 },
      { attr: ROUND, header: [...roundNames] }
    ],
    sheetDefinitions: [
      {
        type: INFORMATION,
        rowIds: ['result']
      },
      {
        type: INFORMATION,
        rowIds: ['summary']
      },
      {
        type: PARTICIPANTS,
        rowIds: ['playersList']
      },
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
        rowIds: ['report'],
        sheetNames: ['report', 'prep', 'sign-in', 'medical']
      },
      {
        type: SIGN_UP,
        rowIds: ['signup']
      },
      {
        type: INFORMATION,
        rowIds: ['notice'],
        sheetNames: ['order of play']
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
        rowIds: ['doublesParticipants']
      }
    ],
    tournamentInfo: [],
    drawInfo: [
      {
        attribute: [TOURNAMENT_NAME],
        cellRefs: ['A1', 'B1'] // function to look at A1, A2 and select the longest value or the value which includes 'tournament'
      },
      {
        attribute: [TOURNAMENT_ID],
        searchText: 'tourn. id',
        rowOffset: 1
      },
      {
        attribute: 'stage',
        regex: '(qualifying)',
        postProcessor: 'stageParser'
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
        attribute: [CATEGORY],
        regex: '(u\\s?\\d{2})',
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
        regex: '(boys|girls)',
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
    stageParser: (stage) => {
      return stage === 'qualifying' ? QUALIFYING_STAGE : MAIN;
    },
    dateParser: (date) => {
      const parts = date.split('/');
      if (parts.length < 3 || !parts.every(isNumeric)) return;
      let [month, day, year] = parts.map((number) => (number.toString()[1] ? number : '0' + number));
      if (year.length === 2) year = '20' + year;
      if (year.length > 4 || parseInt(year) < 2005) return;
      return [year, month, day].join('-');
    },
    dateTimeParser: (dateTimeString) => {
      const [iDate, time] = dateTimeString.split(' ');
      const date = postProcessors.dateParser(iDate);
      return { date, time };
    },
    categoryParser: (value) => {
      value = value
        .toString()
        .toLowerCase()
        .split(' ')
        .filter((c) => !['-'].includes(c))
        .join('');
      return value.includes('u') ? [...value.split('u'), 'U'].join('') : value;
    },
    genderParser: (value) => {
      const male = /^boys/.test(value);
      const female = /^girls/.test(value);
      return (male && MALE) || female ? FEMALE : ANY;
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
    columnCharacter: ({ columnProfile }) => {
      const { values } = columnProfile;
      const allProgressionKeys = values.every(
        (value) => typeof value === 'string' && ['a', 'b', 'as', 'bs'].includes(value.toLowerCase())
      );
      if (allProgressionKeys) {
        columnProfile.values = [];
        columnProfile.character = 'progression';
        columnProfile.keyMap = {};
        columnProfile.rows = [];
        return columnProfile.character;
      }
      const possiblePersonId = values.some((value) => /(\d{5,})$/.test(value));
      const potentialPersonId = values.every(
        (value) => isNumeric(value) && (parseInt(value) === 0 || /(\d{5,})$/.test(value))
      );
      if (potentialPersonId && possiblePersonId) {
        columnProfile.character = PERSON_ID;
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
  identifiers: [
    'AITA JUNIOR TOUR',
    { text: 'singha sports', includes: true },
    { text: 'SPORTS india', includes: true },
    { text: 'rank as on', includes: true },
    { text: 'sportindia', includes: true },
    { text: 'india ranking', includes: true },
    { text: 'jyta', splitIncludes: true },
    { text: 'aita', splitIncludes: true }
  ]
};
