import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SAVE_KEY, SaveStore, parseSave } from '../src/save.ts';

const ids = ['fernlight-trail', 'willow-run', 'lantern-oak'];
const clear = (ticks, fireflies) => ({ ticks, fireflies, deaths: 0, flawless: true });

test('save decoding sanitizes settings, ignores unknown or skipped levels, and resets a future schema', () => {
  const parsed = parseSave({
    schemaVersion: 1,
    unlockedLevelIds: [ids[2], 'unknown'],
    bestByLevel: { [ids[0]]: { ticks: 17, fireflies: 9 }, [ids[2]]: { ticks: 17, fireflies: 4 } },
    settings: { master: 10, music: -7, sfx: Infinity, muted: 'true' },
  }, ids, true);
  assert.deepEqual(parsed.unlockedLevelIds, ids.slice(0, 1));
  assert.deepEqual(parsed.bestByLevel, {});
  assert.deepEqual(parsed.settings, { master: 1, music: 0, sfx: .85, muted: false, reducedMotion: true });
  assert.deepEqual(parseSave({ ...parsed, schemaVersion: 2, unlockedLevelIds: ids }, ids, false),
    parseSave(null, ids, false));
});

test('replay records time and fireflies independently and persists only level records and settings', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const save = new SaveStore(ids, false, () => storage);
  save.record(ids[0], clear(200, 8), ids[1]);
  save.record(ids[0], clear(160, 3), ids[1]);
  const restored = new SaveStore(ids, false, () => storage);
  assert.deepEqual(restored.data.unlockedLevelIds, ids.slice(0, 2));
  assert.deepEqual(restored.data.bestByLevel[ids[0]], { ticks: 160, fireflies: 8 });
  assert.deepEqual(Object.keys(JSON.parse(values.get(SAVE_KEY))), [
    'schemaVersion', 'unlockedLevelIds', 'bestByLevel', 'settings',
  ]);
});

test('write failure preserves progress in the current tab', () => {
  const storage = { getItem: () => null, setItem() { throw new Error('Storage full'); } };
  const save = new SaveStore(ids, false, () => storage);
  save.record(ids[0], clear(200, 8), ids[1]);
  assert.equal(save.unavailable, true);
  assert.deepEqual(save.data.unlockedLevelIds, ids.slice(0, 2));
});
