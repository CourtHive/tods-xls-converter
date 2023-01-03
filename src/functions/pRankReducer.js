import { fuzzy } from 'fast-fuzzy';

export function pRankReducer({ pValues, value, confidenceThreshold, log }) {
  const pRank = pValues.reduce(
    (result, v) => {
      const confidence = v ? fuzzy(v, value.toString()) : 0;
      if (log?.pRank) console.log({ value, v, confidence, confidenceThreshold });
      return confidence > confidenceThreshold && confidence > result.confidence ? { confidence, match: v } : result;
    },
    { confidence: 0 }
  );
  return pRank;
}
