import { isNumeric } from '../utilities/identification';
import { getCellValue } from './sheetAccess';

export function getCheckedValue({ profile, sheet, key }) {
  let rawValue = getCellValue(sheet[key]).split('.').join(' ').trim(); // remove '.'
  if (profile.exciseWords) {
    profile.exciseWords.forEach(({ regex }) => {
      const re = new RegExp(regex);
      if (re.test(rawValue.toString().toLowerCase())) {
        rawValue = rawValue.toString().toLowerCase().split(re).join('').trim();
      }
    });
  }
  if (profile.replaceWords) {
    profile.replaceWords.forEach(({ regex, value, replacement }) => {
      if (value && rawValue.toLowerCase() === value) {
        rawValue = replacement;
      } else if (regex) {
        const re = new RegExp(regex);
        if (re.test(rawValue.toString().toLowerCase())) {
          rawValue = replacement;
        }
      }
    });
  }

  const value = (isNumeric(rawValue) && parseFloat(rawValue)) || (rawValue !== 'undefined' ? rawValue : '');

  return { value, rawValue };
}
