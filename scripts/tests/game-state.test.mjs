import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { URL } from 'node:url';
import { hasCurrentDeployment, validateGameState } from '../game-state.mjs';

const baseline = 'a'.repeat(40);
const head = 'b'.repeat(40);
const gameId = 'example-game';
const evidence = ['reports/QA.md'];
const pass = { result: 'PASS', evidence };
const options = {
  gameId, inspectedCommit: head, isAncestor: (base, revision) => base === baseline && revision === head,
  manifest: { games: [{ id: gameId }] },
  resolveEvidence: reference => evidence.includes(reference),
};

function fixture() {
  const state = JSON.parse(readFileSync(new URL(
    '../../studio/templates/game/production/GAME_STATE.example.json', import.meta.url,
  ), 'utf8'));
  state.baselineCommit = baseline;
  return state;
}

function publicFixture() {
  const state = fixture();
  state.publication = { rights: 'cleared', preview: 'approved', release: 'blocked', evidence };
  Object.assign(state.records[0], {
    implementation: 'implemented',
    publicAvailability: 'public',
    evidence,
    artifactCheck: { target: 'assembled-pages', ...pass },
  });
  return state;
}

test('adopts unknown state and derives counts from public and private records', () => {
  assert.deepEqual(validateGameState(fixture(), options), { authoredLevels: 1, publicLevels: 0 });
  const state = publicFixture();
  state.records.push({ ...fixture().records[0], id: 'second-level', publicAvailability: 'private' });
  assert.deepEqual(validateGameState(state, options), { authoredLevels: 2, publicLevels: 1 });
});

test('rejects self and unrelated baselines', () => {
  const state = fixture();
  for (const revision of [head, 'f'.repeat(40)]) {
    state.baselineCommit = revision;
    assert.throws(() => validateGameState(state, options), /strict ancestor/);
  }
});

test('rejects missing and invalid evidence', () => {
  const state = publicFixture();
  state.records[0].artifactCheck.evidence = [];
  assert.throws(() => validateGameState(state, options), /missing evidence/);
  state.records[0].artifactCheck.evidence = ['reports/missing.md'];
  assert.throws(() => validateGameState(state, options), /Unresolvable evidence/);
  state.records[0].artifactCheck.result = 'OK';
  assert.throws(() => validateGameState(state, options), /Invalid check result/);
});

test('rejects false public claims and evidence from a private fixture', () => {
  const state = publicFixture();
  assert.throws(() => validateGameState(state, { ...options, manifest: { games: [] } }), /Public availability/);
  state.records[0].artifactCheck.target = 'private-fixture';
  assert.throws(() => validateGameState(state, options), /Public availability/);
  state.records[0].artifactCheck.target = 'assembled-pages';
  state.publication.rights = 'pending';
  assert.throws(() => validateGameState(state, options), /Public availability/);
});

test('requires the release gate for a released entry independently of preview clearance', () => {
  const state = publicFixture();
  const released = { ...options, catalogStatus: 'released' };
  assert.throws(() => validateGameState(state, released), /Public availability/);
  state.publication.release = 'approved';
  state.publication.preview = 'unknown';
  assert.doesNotThrow(() => validateGameState(state, released));
});

test('rejects duplicate IDs and inconsistent manual counts', () => {
  const state = publicFixture();
  state.records.push(state.records[0]);
  assert.throws(() => validateGameState(state, options), /duplicate/);
  state.records.pop();
  state.publicLevelCount = 2;
  assert.throws(() => validateGameState(state, options), /derived/);
});

test('requires evidence of a human decision to record acceptance', () => {
  const state = publicFixture();
  state.records[0].acceptance = 'accepted';
  assert.throws(() => validateGameState(state, options), /Invalid or duplicate/);
  state.records[0].acceptanceEvidence = evidence;
  assert.doesNotThrow(() => validateGameState(state, options));
});

test('treats HTTP, gameplay and SHA freshness independently', () => {
  const state = fixture();
  assert.equal(hasCurrentDeployment(state, head), false);
  state.deployment = {
    deployedCommit: baseline,
    url: 'https://example.github.io/studio/',
    observedAt: '2026-11-26T20:00:00.000Z',
    checks: { revision: pass, http: pass, gameplay: { result: 'NOT_RUN', evidence: [] } },
  };
  assert.doesNotThrow(() => validateGameState(state, options));
  assert.equal(hasCurrentDeployment(state, baseline), false);
  state.deployment.checks.gameplay = pass;
  assert.equal(hasCurrentDeployment(state, baseline), true);
  assert.equal(hasCurrentDeployment(state, head), false);
  state.deployment.deployedCommit = null;
  assert.throws(() => validateGameState(state, options), /PASS requires a deployment observation/);
});
