import { genderConstants, matchUpTypes } from 'tods-competition-factory';
import { isString } from '../utilities/identification';

import { KNOCKOUT, ROUND_ROBIN, MENU, INDETERMINATE, ORDER_OF_PLAY } from '../constants/sheetTypes';
import { HEADER, FOOTER, ROUND } from '../constants/sheetElements';
import { TOURNAMENT_NAME } from '../constants/attributeConstants';
const { SINGLES_MATCHUP, DOUBLES_MATCHUP } = matchUpTypes;
const { MALE, FEMALE, ANY } = genderConstants;

// NOTE: Players names are generally LASTNAME, FIRSTNAME in the first column in which they appear
// however, sometimes the comma is missing... the lastName can be derived from subsequent rounds,
// provided that a player advanced!

// INTEREST: '*LL: LUCKY LOSER', '*LL: ....', '(Si el servicio toca la red y entra en el cuadro de', 'servicio correcto, la bola sigue en juego)'
// 'G: WO', 'V: PRESENTE', 'R: WO'

const roundNames = [
  'primera ronda',
  'prmera ronda',
  'segunda ronda',
  'tercera ronda',
  'ronda',
  'octavos',
  'cuartos',
  'semifinal',
  'semifinales',
  'final',
  'finales',
  'campeon',
  'ganador',
  'ganadora',
  'clasificados',
  'clasificadas'
];

const qualifyingIdentifiers = [
  'Q1',
  'Q2',
  'Q3',
  'Q4',
  'Q5',
  'Q6',
  'Q7',
  'Q8',
  'clasificadas',
  'clasificados',
  'preclasificados', // TODO: differentiate qualifying and pre-qualifying
  'preclasificadas'
];
const categories = ['U10', 'U12', 'U14', 'U16', 'U18', 'OPEN'];
const genderIdentifiers = [
  { searchText: 'open', gender: ANY },
  { searchText: 'varones', gender: MALE },
  { searchText: 'damas', gender: FEMALE },
  { searchText: 'masculino', gender: MALE },
  { searchText: 'femenino', gender: FEMALE }
];

// const organization = 'FEDERACION COSTARRICENSE DE TENIS';
const organization = 'CR';
export const config = {
  organization,
  mustContainSheetNames: [],
  profile: {
    exciseWords: [
      { regex: 'grupo\\s[A-Za-z]' },
      { regex: 'grup\\s[A-Za-z]' },
      { regex: '\\ssacc' },
      { regex: `\\*ll:` },
      { regex: `\\*ll` },
      { regex: `^r:\\s` },
      { regex: `^g:\\s` },
      { regex: '^w:[a-z]{2}' }
    ],
    skipWords: [
      // TODO: introduce { regex } // which would be an exact match
      'final',
      'medalla',
      'campeon',
      'subcampeon',
      ...categories, // use regex
      { text: ' tba', startsWith: true },
      { text: ' pm', endsWith: true },
      { text: 'puntos', endsWith: true },
      { text: ' dobles', endsWith: true },
      { text: 'dobles', startsWith: true },
      { text: 'varones', includes: true },
      { text: 'valones', endsWith: true },
      { text: 'partidos', includes: true },
      { text: 'punto en el ranking', includes: true },
      { text: 'menu', includes: true },
      { text: 'break', includes: true },
      { text: 'grado', includes: true },
      { text: 'damas', includes: true },
      { text: 'nota', startsWith: true },
      { text: 'formato', startsWith: true },
      { text: 'fiscales', startsWith: true },
      { text: 'servicio', includes: true },
      { text: 'en casto de', includes: true },
      { text: 'clasifica', includes: true },
      { text: 'clasificado', includes: true },
      { text: 'clasifcado', includes: true },
      { text: 'clasficada', includes: true },
      { text: 'clasificada', includes: true },
      { text: 'claficicada', includes: true },
      { text: 'lugar', includes: true },
      { text: 'grupo', includes: true },
      { text: 'break a', includes: true },
      { text: 'ranking', includes: true },
      { text: 'sets con', includes: true },
      { text: 'sets sin', includes: true },
      { text: 'con ventajas', includes: true },
      { text: 'ganadadora', startsWith: true },
      { text: 'tba', startsWith: true },
      { text: 'ganadora', startsWith: true },
      { text: 'ganador', startsWith: true },
      { text: 'club', startsWith: true },
      { text: 'sede', startsWith: true },
      { text: 'ano', startsWith: true },
      { text: 'principal', includes: true },
      { text: 'lluvia', exact: true },
      { text: 'sencillos', includes: true },
      { text: 'nacionales', includes: true },
      // clubs
      { text: 'ota', startsWith: true },
      { text: 'la paz', startsWith: true },
      { text: 'cnt la paz', startsWith: true },
      { text: 'club ', startsWith: true },

      { startsWithEndsWith: { startsWith: [1, 2, 3, 4, 5, 6, 7, 8, 9], endsWith: 'm' }, remove: ['"."'] }
    ],
    skipProfile: { skipFloatValues: true },
    skipContains: ['página', 'pagina', 'categoria'],
    skipExpressions: [],
    considerAlpha: [',', '(', ')', '/', ':'],
    matchStatuses: ['doble wo', 'ret', 'def', 'bye', 'w.o', 'w/o', 'wo', 'abandoned'],
    matchUpStatuses: { bye: 'BYE', doubleWalkover: 'doble wo', walkover: 'wo' },
    subsequentColumnLimit: 1, // elimination structure outcome look ahead
    qualifyingIdentifiers,
    doubles: {
      regexSeparators: ['/', /\s{3,}/g]
    },
    genderIdentifiers,
    matchOutcomes: [
      'doble wo',
      'ret',
      'def',
      'w/o',
      'wo',
      'abandoned',
      'gana x wo',
      'ganan x wo',
      'gana wo',
      'ganan wo',
      'pierde x wo',
      'pierden x wo',
      'pierde wo',
      'pierden wo'
    ],
    winIdentifier: 'gana',
    lossIdentifier: 'pierde',
    categories,
    columnsMap: {},
    knockOutRounds: roundNames,
    rowDefinitions: [
      {
        type: HEADER,
        id: 'knockoutParticipants',
        elements: [...roundNames],
        extractColumns: true,
        minimumElements: 2,
        rows: 1
      },
      {
        type: HEADER,
        id: 'roundRobinParticipants',
        elements: ['1', '2', '3', '4'],
        minimumElements: 3,
        rows: 1
      },
      {
        type: FOOTER,
        id: 'drawFooter',
        elements: ['testigos', 'fiscales', 'fiscal'],
        minimumElements: 1,
        rowBuffer: 2,
        rows: 8
      },
      {
        type: HEADER,
        id: 'menuHeader',
        elements: [{ text: 'panel de navegacion', options: { includes: true } }],
        minimumElements: 1,
        rows: 1
      },
      {
        type: HEADER,
        id: 'federationHeader',
        elements: [{ text: organization, options: { startsWith: true } }],
        minimumElements: 1,
        rows: 1
      },
      {
        type: HEADER,
        id: 'programHeader',
        elements: ['PROGRAMACION DE PARTIDOS'],
        minimumElements: 1,
        rows: 1
      }
    ],
    // these should be ordered such that least certain matches are last
    sheetDefinitions: [
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
        type: ORDER_OF_PLAY,
        rowIds: ['programHeader']
      },
      {
        type: MENU,
        rowIds: ['menuHeader']
      },
      {
        type: INDETERMINATE,
        infoClass: 'drawInfo',
        rowIds: ['federationHeader', 'drawFooter']
      }
    ],
    headerColumns: [
      {
        header: roundNames,
        attr: ROUND
      }
    ],
    tournamentInfo: [],
    drawInfo: [
      {
        attribute: [TOURNAMENT_NAME],
        searchText: 'torneo',
        columnOffset: 1
      },
      {
        attribute: 'matchUpType',
        searchText: 'categoria',
        columnOffset: 1,
        instance: 0,
        postProcessor: 'matchUpTypeParser'
      },
      {
        attribute: 'gender',
        searchText: 'categoria',
        columnOffset: 1,
        instance: 0,
        postProcessor: 'genderParser'
      },
      {
        attribute: 'category',
        searchText: 'categoria',
        columnOffset: 1,
        instance: 0,
        postProcessor: 'categoryParser'
      },
      {
        attribute: 'venue',
        searchText: 'lugar',
        columnOffset: 1
        // postProcessor: 'venueParser'
      },
      {
        attribute: 'dateRange',
        searchText: 'fecha',
        columnOffset: 1
        // postProcessor: 'textDateParser'
      },
      {
        attribute: 'director',
        searchText: 'director',
        columnOffset: 1
        // postProcessor: 'officialParser'
      },
      {
        attribute: 'referee',
        searchText: 'supervisor',
        options: { startsWith: true },
        columnOffset: 1
        // postProcessor: 'officialParser'
      },
      {
        attribute: 'representatives',
        searchText: 'testigos',
        stopOnEmpty: true,
        columnOffset: 1,
        rowCount: 2,
        postProcessor: (value) => isString(value) && value.split(',')
      },
      { attribute: 'financial', searchText: 'fiscales', columnOffset: 1 },
      {
        attribute: 'delegate',
        searchText: ['delegada', 'delegado'],
        columnOffset: 1
        // postProcessor: 'officialParser'
      },
      {
        attribute: 'subDelegate',
        searchText: ['subdelegada', 'subdelegado'],
        columnOffset: 1
        // postProcessor: 'officialParser'
      },
      {
        attribute: 'seedNumbers',
        searchText: ['sembrados', 'sembradas'],
        columnCountMinimum: true,
        preserveNonCounter: true,
        stopOnEmpty: true,
        columnOffset: -1,
        rowOffset: 1,
        rowCount: 16
      },
      {
        attribute: 'seededParticipantNames',
        searchText: ['sembrados', 'sembradas'],
        columnCountMinimum: true,
        stopOnEmpty: true,
        rowOffset: 1,
        rowCount: 16
      },
      {
        attribute: 'preQualifiers',
        searchText: ['preclasificados', 'preclasificadas'],
        stopOnEmpty: true,
        rowOffset: 1,
        rowCount: 8
      },
      {
        attribute: 'preQualifyingnumbers',
        searchText: ['preclasificados', 'preclasificadas'],
        stopOnEmpty: true,
        columnOffset: -1,
        rowOffset: 1,
        rowCount: 8
      },
      {
        attribute: 'rankingPoints',
        searchText: ['puntos en el ranking:'],
        stopOnEmpty: true,
        rowOffset: 1,
        rowCount: 8
      }
    ],
    dateParser: (date) => {
      const splitDate = date.split('-');
      const startDate = splitDate[0].split('.').join('-');
      let result = { startDate };
      if (splitDate[1]) {
        const endSplit = splitDate[1].split('.').filter(Boolean);
        const yearMonth = startDate.split('-').slice(0, 3 - endSplit.length);
        const endDate = [].concat(...yearMonth, ...endSplit).join('-');
        result.endDate = endDate;
      }
      return result;
    },
    matchUpTypeParser: (value) => {
      return value?.toString().toLowerCase().includes('dobles') ? DOUBLES_MATCHUP : SINGLES_MATCHUP;
    },
    genderParser: (value) => {
      const gender = genderIdentifiers.find((identifier) =>
        value?.toString().toLowerCase().includes(identifier.searchText.toLowerCase())
      )?.gender;
      return gender;
    },
    categoryParser: (value) => {
      const category = categories.find((category) => value.includes(category));
      return category;
    },
    fileDateParser: (fileName) => {
      const re = new RegExp('^(\\d{8})[\\s-]{1}');
      if (re.test(fileName)) {
        const dateParts = fileName.match(re)[1].split('');
        const year = dateParts.slice(0, 4).join('');
        const month = dateParts.slice(4, 6).join('');
        const day = dateParts.slice(6).join('');
        const dateString = [year, month, day].join('-');
        return dateString;
      }
    }
  },
  sheetNameMatcher: (sheetNames) => {
    const potentials = sheetNames.some((sheetName) => {
      const mTest = /^[ABC] MASC/.test(sheetName);
      return mTest;
    });
    return potentials;
  },
  identifiers: [organization, { text: 'COSTARRICENSE', includes: true }]
};
