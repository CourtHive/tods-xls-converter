import { utilities } from 'tods-competition-factory';
import { findValueRefs } from './sheetAccess';

import { MULTIPLE_MATCHES, VALUE_MISMATCH } from '../constants/errorConditions';

export function getCategory({ sheet, sheetName, profile }) {
  const categories = profile.categories;
  if (!categories?.length) return {};

  const exactCategoryMatches = findValueRefs({ searchDetails: categories, sheet, mapValues: true });
  const includesCategoryMatches = !Object.keys(exactCategoryMatches).length
    ? findValueRefs({
        options: { includes: true, requiredSeparator: ' ' },
        searchDetails: categories,
        mapValues: true,
        sheet
      })
    : undefined;

  const values = Object.values(includesCategoryMatches || exactCategoryMatches);

  const sheetCategories = utilities.unique(values.map(({ value }) => value));
  const sheetNameCategory = sheetName && categories.find((category) => sheetName.includes(category));

  if (sheetCategories.length > 1) return { error: MULTIPLE_MATCHES };

  if (sheetNameCategory && sheetNameCategory !== sheetCategories[0]) {
    return { error: VALUE_MISMATCH };
  }

  const loweredCategory = (sheetCategories[0] || sheetNameCategory)?.toLowerCase();
  const category = categories.find((c) => loweredCategory?.includes(c.toLowerCase()));

  return { category };
}
