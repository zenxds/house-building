import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRID_COLS,
  GRID_ROWS,
  LEVELS,
  MATERIAL_MAP,
  MATERIALS,
} from './gameData.js';
import {
  calculateSimilarity,
  findHint,
  isPassing,
  placeAt,
  removeAt,
} from './gameLogic.js';

const target = Array.from({ length: 24 }, (_, index) => ({
  id: `target-${index}`,
  material: 'pink-wall',
  row: Math.floor(index / 6),
  col: index % 6,
}));

test('an exact house scores 100 and passes', () => {
  assert.equal(calculateSimilarity(target, target), 100);
  assert.equal(isPassing(100), true);
});

test('a 90 percent score does not pass because the goal is above 90', () => {
  assert.equal(isPassing(90), false);
  assert.equal(isPassing(91), true);
});

test('missing and extra cells both lower similarity', () => {
  const missing = target.slice(0, -1);
  const withExtra = [
    ...target,
    { id: 'extra', material: 'flower', row: 7, col: 8 },
  ];
  assert.equal(calculateSimilarity(target, missing), 96);
  assert.equal(calculateSimilarity(target, withExtra), 96);
});

test('placing replaces a cell and removing clears it', () => {
  const placed = placeAt([], 'pink-wall', 2, 3);
  const replaced = placeAt(placed, 'window-square', 2, 3);
  assert.equal(replaced.length, 1);
  assert.equal(replaced[0].material, 'window-square');
  assert.equal(removeAt(replaced, 2, 3).length, 0);
});

test('hint returns the first missing or incorrect target cell', () => {
  const partial = target.slice(1);
  assert.deepEqual(findHint(target, partial), target[0]);
});

test('the campaign contains six sequential, playable levels', () => {
  assert.equal(LEVELS.length, 6);

  LEVELS.forEach((level, index) => {
    assert.equal(level.number, index + 1);
    assert.match(level.name, /城堡$/);
    assert.ok(level.target.length >= 24, `${level.name} should contain a full castle`);
    assert.equal(calculateSimilarity(level.target, level.target), 100);

    const occupiedCells = new Set();
    const roofColumns = new Set();
    level.target.forEach((placement) => {
      assert.ok(placement.row >= 0 && placement.row < GRID_ROWS);
      assert.ok(placement.col >= 0 && placement.col < GRID_COLS);
      assert.ok(MATERIAL_MAP[placement.material], `${placement.material} should exist`);
      assert.ok(
        level.palette.includes(placement.material),
        `${level.name} should offer ${placement.material}`,
      );
      const key = `${placement.row}:${placement.col}`;
      assert.equal(occupiedCells.has(key), false, `${level.name} should not overlap cells`);
      occupiedCells.add(key);

      if (MATERIAL_MAP[placement.material].kind === 'roof') {
        roofColumns.add(placement.col);
      }
    });

    assert.ok(roofColumns.size >= 3, `${level.name} should have at least three towers`);
  });
});

test('people are available as friendly decorations throughout the campaign', () => {
  const people = MATERIALS.filter(({ kind }) => kind.startsWith('person-'));

  assert.equal(people.length, 3);
  people.forEach((person) => assert.equal(person.category, '装饰'));
  LEVELS.forEach((level) => {
    assert.ok(
      level.target.some(({ material }) => MATERIAL_MAP[material].kind.startsWith('person-')),
      `${level.name} should welcome a character`,
    );
  });
});
