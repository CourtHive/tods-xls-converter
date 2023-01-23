export function getWinningSide(score) {
  const setsWon = [0, 0];
  const setWinners = [];
  const sets = score.split(' ');
  const getSetScores = /(\d+)-(\d+)/;
  sets.forEach((set) => {
    if (getSetScores.test(set)) {
      const setScores = set.match(getSetScores).slice(1);
      const winningSide = (setScores[0] > setScores[1] && 1) || (setScores[1] > setScores[0] && 2);
      if (winningSide) {
        setsWon[winningSide - 1] += 1;
        setWinners.push(winningSide);
      }
    }
  });
  const winningSide = (setsWon[0] > setsWon[1] && 1) || (setsWon[1] > setsWon[0] && 2);
  return { setsWon, setWinners, winningSide };
}
