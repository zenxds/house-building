export const PASS_SCORE = 90;

export function cellKey(row, col) {
  return `${row}:${col}`;
}

export function toCellMap(placements = []) {
  return new Map(
    placements.map((placement) => [
      cellKey(placement.row, placement.col),
      placement.material,
    ]),
  );
}

export function calculateSimilarity(target = [], build = []) {
  if (!target.length && !build.length) return 100;

  const targetMap = toCellMap(target);
  const buildMap = toCellMap(build);
  const occupiedCells = new Set([...targetMap.keys(), ...buildMap.keys()]);
  let matchingCells = 0;

  occupiedCells.forEach((key) => {
    if (targetMap.get(key) && targetMap.get(key) === buildMap.get(key)) {
      matchingCells += 1;
    }
  });

  return Math.round((matchingCells / occupiedCells.size) * 100);
}

export function isPassing(score) {
  return score > PASS_SCORE;
}

export function placeAt(placements, material, row, col) {
  const next = placements.filter(
    (placement) => placement.row !== row || placement.col !== col,
  );

  return [
    ...next,
    {
      id: `${material}-${row}-${col}-${Date.now()}`,
      material,
      row,
      col,
    },
  ];
}

export function removeAt(placements, row, col) {
  return placements.filter(
    (placement) => placement.row !== row || placement.col !== col,
  );
}

export function findHint(target, build) {
  const buildMap = toCellMap(build);
  return target.find(
    (placement) =>
      buildMap.get(cellKey(placement.row, placement.col)) !== placement.material,
  );
}
