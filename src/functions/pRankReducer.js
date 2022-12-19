import { fuzzy } from 'fast-fuzzy';

export function pRankReducer({ pValues, value, confidenceThreshold }) {
  return pValues.reduce(
    (result, v) => {
      const confidence = v ? fuzzy(v, value.toString()) : 0;
      return confidence > confidenceThreshold && confidence > result.confidence ? { confidence, match: v } : result;
    },
    { confidence: 0 }
  );
}
