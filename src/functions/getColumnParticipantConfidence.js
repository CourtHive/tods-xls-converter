import { getParticipantValues } from './getParticipantValues';
import { pRankReducer } from './pRankReducer';

export function getColumnParticipantConfidence({ analysis, roundParticipants, targetColumn, confidenceThreshold }) {
  const targetColumnProfile = analysis.columnProfiles.find(({ column }) => column === targetColumn);
  const targetColumnValues = targetColumnProfile?.values;
  const roundParticipantValues = roundParticipants?.flat().map(getParticipantValues) || [];

  const confidence = targetColumnValues
    ?.flatMap((value) => roundParticipantValues.map((pValues) => pRankReducer({ pValues, value, confidenceThreshold })))
    .filter(({ confidence }) => confidence);

  return { confidence, valuesCount: targetColumnValues.length, targetColumnValues };
}
