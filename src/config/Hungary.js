import { TOURNAMENT_NAME } from '../constants/attributeConstants';
import { HEADER, FOOTER } from '../constants/sheetElements';
import { KNOCKOUT, ROUND_ROBIN, PARTICIPANTS, INFORMATION } from '../constants/sheetTypes';

export const config = {
  organization: 'MTSZ',
  mustContainSheetNames: ['Altalanos'],
  profile: {
    providerId: 'MTSZ_07982e2f-eb41-42b2-9b75-da3054fe70a8',
    skipWords: ['umpire', '0', 'Győztes'],
    skipExpressions: ['[0-9,/, ]+pont', 'umpire'],
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
      'Abandoned',
      'fa.',
      'jn betegség',
      'jn.',
      'j n.',
      'j.n.',
      'jn beteg',
      'jn sérülés',
      'feladta',
      'megserult'
    ],
    doubles: {
      drawPosition: {
        rowOffset: -1 // missing drawPosition for doubles partner is no previous line
      }
    },
    columnsMap: {
      position: 'A',
      rank: '',
      id: '',
      seed: '',
      lastName: '',
      firstName: '',
      club: '',
      rounds: 'K'
    },
    rowDefinitions: [
      {
        type: HEADER,
        id: 'knockoutParticipants',
        elements: [
          'rangs',
          'rangsor',
          'kód',
          'kódszám',
          'kiem',
          'családi név',
          'keresztnév',
          'egyesület',
          'döntő',
          '2. forduló'
        ],
        rows: 1,
        minimumElements: 5
      },
      {
        type: HEADER,
        id: 'roundRobinParticipants',
        elements: [
          'kiem',
          'kódszám',
          'rangsor',
          'vezetéknév',
          'keresztnév',
          'egyesület',
          'helyezés',
          'pontszám',
          'bónusz'
        ],
        rows: 1,
        minimumElements: 7
      },
      {
        type: HEADER,
        id: 'singlesParticipants',
        elements: [
          'sor',
          'családi név',
          'keresztnév',
          'egyesület',
          'kódszám',
          'aláírás',
          'nevezési rangsor',
          'elfogadási státusz',
          'sorsolási rangsor',
          'kiemelés'
        ],
        rows: 1,
        minimumElements: 8
      },
      {
        type: HEADER,
        id: 'doublesParticipants',
        elements: [
          'ssz.',
          'családi név',
          'keresztnév',
          'egyesületi',
          'kódszám',
          '1. játékos ranglista',
          'aláírás',
          '2. játékos ranglista',
          'páros egyesített rangsora',
          'kIemelés'
        ],
        rows: 1,
        minimumElements: 8
      },
      {
        type: FOOTER,
        id: 'drawFooter',
        elements: [
          'rangsor',
          'kiemeltek',
          'alternatívok',
          'helyettesítik',
          'sorsolás ideje',
          'szerencés vesztes',
          'sorsolás időpontja',
          'kiemelt párosok'
        ],
        rows: 9,
        minimumElements: 3
      },
      {
        type: HEADER,
        id: 'tournamentInfo',
        elements: ['a verseny dátuma (éééé.hh.nn)', 'város', 'versenybíró'],
        rows: 1,
        minimumElements: 2
      },
      {
        type: HEADER,
        id: 'tournamentOrganization',
        elements: ['orvos neve', 'verseny rendezője', 'versenyigazgató'],
        rows: 1,
        minimumElements: 2
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
    headerColumns: [
      { attr: 'rank', header: 'Rangs' },
      { attr: 'rank', header: 'Rangsor' },
      { attr: 'id', header: 'kód' },
      { attr: 'id', header: 'Kódszám' },
      { attr: 'seed', header: 'Kiem' },
      { attr: 'lastName', header: 'Családi név' },
      { attr: 'lastName', header: 'Vezetéknév' },
      { attr: 'firstName', header: 'Keresztnév' },
      { attr: 'club', header: 'Egyesület' },
      { attr: 'rounds', header: 'Döntő' },
      { attr: 'rounds', header: '2. forduló' }
    ],
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
  }
};
