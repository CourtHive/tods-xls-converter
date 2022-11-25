import { utilities } from 'tods-competition-factory';
import { findValueRefs } from './sheetAccess';

import { MULTIPLE_MATCHES, VALUE_MISMATCH } from '../constants/errorConditions';

export function getCategory({ sheet, sheetName, profile }) {
  const categories = profile.categories;
  if (!categories?.length) return {};

  const categoryMatches = findValueRefs({ searchDetails: categories, sheet, mapValues: true });
  const sheetCategories = utilities.unique(Object.values(categoryMatches).map(({ value }) => value));

  const sheetNameCategory = sheetName && categories.find((category) => sheetName.includes(category));

  if (sheetCategories.length > 1) return { error: MULTIPLE_MATCHES };

  if (sheetNameCategory && sheetNameCategory !== sheetCategories[0]) {
    return { error: VALUE_MISMATCH };
  }

  const category = sheetCategories[0] || sheetNameCategory;

  return { category };
}
