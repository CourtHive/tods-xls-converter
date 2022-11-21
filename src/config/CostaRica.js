import { isString } from '../utilities/convenience';

import { TOURNAMENT_NAME } from '../constants/attributeConstants';
import { KNOCKOUT, ROUND_ROBIN } from '../constants/sheetTypes';
import { HEADER, FOOTER } from '../constants/sheetElements';

// NOTE: Players names are generally LASTNAME, FIRSTNAME in the first column in which they appear
// however, sometimes the comma is missing... the lastName can be derived from subsequent rounds,
// provided that a player advanced!

// INTEREST: '*LL: LUCKY LOSER', '*LL: ....', '(Si el servicio toca la red y entra en el cuadro de', 'servicio correcto, la bola sigue en juego)'
// 'G: WO', 'V: PRESENTE', 'R: WO'

const roundNames = [
  'PRIMERA RONDA',
  'SEGUNDA RONDA',
  'TERCERA RONDA',
  'OCTAVOS',
  'CUARTOS',
  'SEMIFINAL',
  'SEMIFINALES',
  'FINAL',
  'FINALES',
  'CAMPEON',
  'GANADOR',
  'GANADORA',
  'CLASIFICADOS',
  'CLASIFICADAS'
];

export const config = {
  organization: 'Costa Rica',
  mustContainSheetNames: [],
  profile: {
    skipWords: [
      // TODO: introduce { regex } // which would be an exact match
      'final',
      'medalla',
      'fiscales',
      'preclasificados',
      'preclasificadas',
      'U10',
      'U12',
      'U14',
      'U16',
      'U18',
      { text: ' pm', endsWith: true },
      { text: 'puntos', endsWith: true },
      { text: ' dobles', endsWith: true },
      { text: 'dobles', startsWith: true },
      { text: 'varones', includes: true },
      { text: 'valones', endsWith: true },
      { text: 'menu', includes: true },
      { text: 'break', includes: true },
      { text: 'grado', includes: true },
      { text: 'damas', includes: true },
      { text: 'nota', startsWith: true },
      { text: 'formato', startsWith: true },
      { text: 'servicio', includes: true },
      { text: 'clasifica', includes: true },
      { text: 'clasificado', includes: true },
      { text: 'clasficada', includes: true },
      { text: 'clasificada', includes: true },
      { text: 'claficicada', includes: true },
      { text: 'lugar', includes: true },
      { text: 'grupo', includes: true },
      { text: 'ranking', includes: true },
      { text: 'sets con', includes: true },
      { text: 'sets sin', includes: true },
      { text: 'ganadadora', startsWith: true },
      { text: 'ganadora', startsWith: true },
      { text: 'ganador', startsWith: true },
      { text: 'club', startsWith: true },
      { text: 'sede', startsWith: true },
      { text: 'ano', startsWith: true },
      { text: 'principal', includes: true },
      { text: 'lluvia', includes: true },
      { text: 'sencillos', includes: true },
      { text: 'nacionales', includes: true },
      { startsWithEndsWith: { startsWith: [1, 2, 3, 4, 5, 6, 7, 8, 9], endsWith: 'm' }, remove: ['"."'] }
    ],
    skipContains: ['página', 'pagina', 'categoria'],
    skipExpressions: [],
    considerAlpha: [',', '(', ')', '/'],
    matchStatuses: ['doble w.o', 'ret', 'def', 'bye', 'w.o', 'w/o', 'wo', 'abandoned'],
    matchOutcomes: [
      'doble w.o',
      'ret',
      'def',
      'w.o',
      'w/o',
      'wo',
      'abandoned',
      'gana x w.o',
      'pierde x w.o',
      'gana x wo',
      'gana wo',
      'pierde x wo',
      'pierde wo'
    ],
    identification: {
      includes: [],
      sub_includes: []
    },
    columnsMap: {},
    knockOutRounds: roundNames,
    rowDefinitions: [
      {
        type: HEADER,
        id: 'knockoutParticipants',
        elements: [...roundNames],
        rows: 1,
        minimumElements: 2
      },
      {
        type: HEADER,
        id: 'roundRobinParticipants',
        elements: ['1', '2', '3', '4'],
        rows: 1,
        minimumElements: 3
      },
      {
        type: FOOTER,
        id: 'drawFooter',
        elements: [{ text: 'formato', options: { startsWith: true } }, 'testigos'],
        rows: 8,
        minimumElements: 1
      }
    ],
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
      }
    ],
    gaps: { draw: { term: 'Round 1', gap: 0 } },
    headerColumns: [
      {
        attr: 'round',
        header: roundNames
      }
    ],
    playerRows: { playerNames: true, lastName: true, firstName: true },
    tournamentInfo: [
      /*
      {
        attribute: 'categories',
        searchText: 'Versenyszám 1',
        rowOffset: 1,
        columnOffsets: [0, 1, 2, 3, 4]
      }
      */
    ],
    drawInfo: [
      {
        attribute: [TOURNAMENT_NAME],
        searchText: 'torneo',
        columnOffset: 1
      },
      {
        attribute: 'category',
        searchText: 'categoria',
        columnOffset: 1
        // postProcessor: 'categoryParser'
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
        stopOnEmpty: true,
        columnOffset: -1,
        rowOffset: 1,
        rowCount: 16
      },
      {
        attribute: 'seededPlayerNames',
        searchText: ['sembrados', 'sembradas'],
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
    genderParser: (value) => {
      const male = /^F/.test(value);
      const female = /^L/.test(value);
      return { gender: male ? 'M' : female ? 'W' : 'X' };
    }
  },
  sheetNameMatcher: (sheetNames) => {
    const potentials = sheetNames.some((sheetName) => {
      const vTest = /^U1?[VD]??/.test(sheetName);
      const mTest = /^[ABC] MASC/.test(sheetName);
      return vTest || mTest;
    });
    return potentials;
  }
};
