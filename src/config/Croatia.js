import { HEADER, FOOTER } from '../constants/sheetElements';
import {
  KNOCKOUT,
  ROUND_ROBIN,
  PARTICIPANTS
  // INFORMATION,
} from '../constants/sheetTypes';

export const config = {
  organization: 'HTS',
  mustContainSheetNames: ['Pocetna', 'Rang-lista', 'Izvjestaj'],
  profile: {
    skipWords: ['umpire'],
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
        rowOffset: 1 // missing drawPosition for doubles partner is no next line
      }
    },
    identification: {
      includes: [],
      sub_includes: []
    },
    columnsMap: {
      position: 'A',
      rank: '',
      id: '',
      seed: '',
      players: '',
      club: '',
      rounds: 'I'
    },
    rowDefinitions: [
      {
        type: HEADER,
        id: 'knockoutParticipants',
        elements: ['rang', 'st.', 'nositelj', 'prezime, ime', 'klub', '2.kolo', '1/2 finale', 'finale', 'pobjednik'],
        rows: 1,
        minimumElements: 5
      },
      {
        type: HEADER,
        id: 'roundRobinParticipants',
        elements: [],
        rows: 1,
        minimumElements: 7
      },
      {
        type: HEADER,
        id: 'singlesParticipants',
        elements: [],
        rows: 1,
        minimumElements: 8
      },
      {
        type: HEADER,
        id: 'doublesParticipants',
        elements: [],
        rows: 1,
        minimumElements: 8
      },
      {
        type: FOOTER,
        id: 'drawFooter',
        elements: ['rang-lista', '#', 'nositelji', 'sretni gubitnici (LL)/zamjenjuje', 'datum/vrijeme ždrijeba'],
        rows: 9,
        minimumElements: 3
      }
    ],
    sheetDefinitions: [
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
      { attr: 'rank', header: 'Rang' },
      { attr: 'seed', header: 'Nositelj' },
      { attr: 'players', header: 'Prezime, Ime' },
      { attr: 'club', header: 'Klub' },
      { attr: 'rounds', header: '2.kolo' }
    ],
    playerRows: { playerNames: true, lastName: true, firstName: true }
  }
};
