import { HEADER, FOOTER } from '../constants/sheetElements';
import { KNOCKOUT, ROUND_ROBIN, PARTICIPANTS, INFORMATION } from '../constants/sheetTypes';

export const config = {
  organization: 'CR',
  mustContainSheetNames: [],
  profile: {
    skipWords: [],
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
    doubles: {
      drawPosition: {
        rowOffset: -1 // missing drawPosition for doubles partner is on previous line
      }
    },
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
      'CAMPEÓN',
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
          'CAMPEÓN',
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
        elements: ['TORNEO'],
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
    headerColumns: [],
    playerRows: { playerNames: true, lastName: true, firstName: true },
    tournamentInfo: [
      {
        attribute: 'tournamentName',
        searchText: 'TORNEO',
        columnOffset: 1
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
        attribute: 'event',
        searchText: 'Versenyszám',
        rowOffset: 0,
        columnOffset: 5
      },
      {
        attribute: 'event',
        searchText: 'Versenyszám',
        rowOffset: 0,
        columnOffset: 4
      },
      {
        attribute: 'gender',
        searchText: 'Versenyszám',
        rowOffset: 0,
        columnOffset: 5,
        postProcessor: 'genderParser'
      },
      {
        attribute: 'gender',
        searchText: 'Versenyszám',
        rowOffset: 0,
        columnOffset: 4,
        postProcessor: 'genderParser'
      },
      {
        attribute: 'dates',
        searchText: 'Dátum',
        rowOffset: 1,
        postProcessor: 'dateParser'
      },
      { attribute: 'city', searchText: 'Város', rowOffset: 1 },
      { attribute: 'category', searchText: 'Kategória', rowOffset: 1 },
      { attribute: 'referee', searchText: 'Versenybíró', rowOffset: 1 }
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
