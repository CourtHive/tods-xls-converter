import { findValueRefs } from './sheetAccess';

export function getIsQualifying({ sheet, profile }) {
  const qualifyingIdentifiers = profile.qualifyingIdentifiers;
  if (!qualifyingIdentifiers?.length) return {};

  const qualifyingMatches = findValueRefs({ searchDetails: qualifyingIdentifiers, sheet });

  return { isQualifying: !!qualifyingMatches.length };
}
