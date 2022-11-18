export const postProcessors = {
  dateParser: (dateString, splitChars = ['.', '/', '-'], order = ['day', 'month', 'year']) => {
    const splitChar = splitChars.find((char) => dateString.includes(char));
    const splitDate = dateString.split(splitChar);
    const day = splitDate[order.indexOf('day')];
    const month = splitDate[order.indexOf('month')];
    const year = splitDate[order.indexOf('year')];
    const fullyear = year?.length === 4 ? year : `${year < 50 ? 20 : 19}${year}`;
    return [fullyear, month, day].join('-');
  },
  parseInt: (value) => {
    if (!isNaN(value)) return parseInt(value);
    return value;
  },
  removeSpaces: (value) => value.split(' ').join('')
};
