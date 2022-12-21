import { getParticipantValues } from './getParticipantValues';
import { pRankReducer } from './pRankReducer';

export function getColumnParticipantConfidence({ analysis, roundParticipants, targetColumn, confidenceThreshold }) {
  const targetColumnProfile = analysis.columnProfiles.find(({ column }) => column === targetColumn);
  const nextColumnValues = targetColumnProfile?.values;
  const roundParticipantValues = roundParticipants.flat().map(getParticipantValues);

  const confidence = nextColumnValues
    ?.flatMap((value) => roundParticipantValues.map((pValues) => pRankReducer({ pValues, value, confidenceThreshold })))
    .filter(({ confidence }) => confidence);

  return { confidence, valuesCount: nextColumnValues.length };
}
