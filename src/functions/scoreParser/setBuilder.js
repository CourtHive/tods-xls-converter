import { isNumeric } from '../../utilities/identification';

export function setBuilder({ score }) {
  const chars = score.split('');
  let set = [undefined, undefined];
  // let tiebreak = '';
  const sets = [];

  const getDiff = () => {
    return set[0] !== undefined && set[1] !== undefined && Math.abs(parseInt(set[0]) - parseInt(set[1]));
  };

  while (chars.length) {
    const char = chars.shift();
    const digit = isNumeric(char) && parseInt(char);

    if (digit) {
      if (set[0] === undefined) {
        set[0] = digit;
        continue;
      }
      if (set[1] === undefined) {
        set[1] = digit;
        if (getDiff() > 1) {
          sets.push(set.join('-'));
          continue;
        }
      }
      // const diff = getDiff();
    }
  }

  console.log({ sets });

  return { score };
}
