import { KNOCKOUT, ROUND_ROBIN, PARTICIPANTS, INFORMATION } from '../constants/sheetTypes';
import { HEADER, FOOTER } from '../constants/sheetElements';

export const config = {
  organization: 'CR',
  mustContainSheetNames: [],
  profile: {
    skipWords: ['final'],
    skipContains: ['página', 'pagina'],
    skipExpressions: [],
    matchOutcomes: [
      'ret.',
      'RET',
      'DEF.',
      'Def.',
      'def.',
      'BYE',
      'w.o',
      'w.o.',
      'W.O',
      'W.O.',
      'wo.',
      'WO',
      'Abandoned'
    ],
    identification: {
      includes: [],
      sub_includes: []
    },
    columnsMap: {},
    knockOutRounds: [
      'PRIMERA RONDA',
      'SEGUNDA RONDA',
      'OCTAVOS',
      'CUARTOS',
      'SEMIFINAL',
      'SEMIFINALES',
      'FINAL',
      'CAMPEON',
      'GANADOR',
      'GANADORA'
    ],
    rowDefinitions: [
      {
        type: HEADER,
        id: 'knockoutParticipants',
        elements: [
          'PRIMERA RONDA',
          'SEGUNDA RONDA',
          'OCTAVOS',
          'CUARTOS',
          'SEMIFINAL',
          'SEMIFINALES',
          'FINAL',
          'CAMPEON',
          'GANADOR',
          'GANADORA'
        ],
        rows: 1,
        minimumElements: 3
      },
      {
        type: HEADER,
        id: 'roundRobinParticipants',
        elements: ['1', '2', '3', '4'],
        rows: 1,
        minimumElements: 4
      },
      {
        type: FOOTER,
        id: 'drawFooter',
        elements: [{ text: 'FORMATO', options: { startsWith: true } }],
        rows: 8,
        minimumElements: 1
      }
    ],
    sheetDefinitions: [
      {
        type: INFORMATION,
        rowIds: ['tournamentInfo', 'tournamentOrganization']
      },
      {
        type: KNOCKOUT,
        rowIds: ['knockoutParticipants', 'drawFooter']
      },
      {
        type: ROUND_ROBIN,
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
    headerColumns: [
      {
        attr: 'round',
        header: [
          'PRIMERA RONDA',
          'SEGUNDA RONDA',
          'OCTAVOS',
          'CUARTOS',
          'SEMIFINAL',
          'SEMIFINALES',
          'FINAL',
          'CAMPEÓN',
          'GANADOR',
          'GANADORA'
        ]
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
        attribute: 'tournamentName',
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
        columnOffset: 1,
        postProcessor: (value) => value.split(',')
      },
      { attribute: 'financial', searchText: 'fiscales', columnOffset: 1 },
      { attribute: 'seededPlayerNames', searchText: ['sembrados', 'sembradas'], rowOffset: 1, rowCount: 16 },
      { attribute: 'seedNumbers', searchText: ['sembrados', 'sembradas'], rowOffset: 1, columnOffset: -1, rowCount: 8 }
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
