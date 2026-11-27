import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { URL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { parseRegistry, publicGames } from '../portal/src/registry.ts';

const sha = /^[0-9a-f]{40}$/;
const id = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const results = ['PASS', 'FAIL', 'NOT_RUN', 'BLOCKED'];
const text = value => typeof value === 'string' && value.trim().length > 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const refs = (value, required = false) =>
  Array.isArray(value) && (!required || value.length > 0) && value.every(text);
const url = value => typeof value === 'string' && URL.canParse(value) &&
  new URL(value).protocol === 'https:' && !new URL(value).username && !new URL(value).password;
const timestamp = value => typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

function requireState(condition, message) {
  if (!condition) throw new Error(message);
}

function checkResult(check) {
  requireState(object(check) && results.includes(check.result) && refs(check.evidence, check.result !== 'NOT_RUN'),
    'Invalid check result or missing evidence');
}

export function validateGameState(state, { gameId, inspectedCommit, isAncestor, manifest, catalogStatus, resolveEvidence }) {
  requireState(object(state) && state.schemaVersion === 1 && id.test(gameId) && state.gameId === gameId,
    'Invalid game-state identity or schemaVersion');
  requireState(typeof state.baselineCommit === 'string' && sha.test(state.baselineCommit) &&
    inspectedCommit !== state.baselineCommit && isAncestor(state.baselineCommit, inspectedCommit),
  'baselineCommit must be a strict ancestor of the inspected revision');
  requireState(!Object.hasOwn(state, 'counts') && !Object.hasOwn(state, 'levelCount') &&
    !Object.hasOwn(state, 'publicLevelCount'), 'Counts must be derived from records');
  requireState(refs(state.knownGaps), 'Invalid known gaps');
  requireState(state.save === null || (object(state.save) && text(state.save.schema) &&
    Number.isSafeInteger(state.save.version) && state.save.version > 0 && refs(state.save.evidence, true)),
  'Invalid save contract');

  const { publication, deployment } = state;
  requireState(object(publication) && ['unknown', 'pending', 'cleared'].includes(publication.rights) &&
    ['unknown', 'pending', 'approved'].includes(publication.preview) &&
    ['unknown', 'blocked', 'approved'].includes(publication.release) &&
    refs(publication.evidence, publication.rights === 'cleared' ||
      publication.preview === 'approved' || publication.release === 'approved'), 'Invalid publication gates');
  requireState(object(deployment) && object(deployment.checks), 'Missing deployment record');
  const { deployedCommit, observedAt, checks } = deployment;
  requireState(deployment.url === null || url(deployment.url), 'Invalid deployment URL');
  requireState(deployedCommit === null || (typeof deployedCommit === 'string' && sha.test(deployedCommit) &&
    (deployedCommit === inspectedCommit || isAncestor(deployedCommit, inspectedCommit))), 'Invalid deployed commit');
  requireState(observedAt === null || timestamp(observedAt), 'Invalid deployment observation time');
  requireState(deployedCommit === null || (observedAt !== null && deployment.url !== null),
    'Observed deployment must have a URL and an observation time');
  const deploymentCheckNames = ['revision', 'http', 'gameplay'];
  requireState(Object.keys(checks).length === deploymentCheckNames.length, 'Unexpected deployment checks');
  for (const name of deploymentCheckNames) {
    const check = checks[name];
    checkResult(check);
    requireState(check.result !== 'PASS' || (deployment.url !== null && observedAt !== null &&
      (name === 'http' || deployedCommit !== null)), 'PASS requires a deployment observation');
  }
  requireState(deployedCommit === null || checks.revision.result === 'PASS',
    'A deployed commit requires a verified revision marker');
  requireState(checks.gameplay.result !== 'PASS' || checks.http.result === 'PASS',
    'Live gameplay PASS requires successful HTTP verification');

  const counts = { authoredLevels: 0, publicLevels: 0 };
  const ids = new Set();
  requireState(Array.isArray(state.records), 'Missing state records');
  for (const record of state.records) {
    requireState(object(record) && typeof record.id === 'string' && id.test(record.id) && !ids.has(record.id) &&
      ['feature', 'level'].includes(record.kind) && text(record.intendedBehavior) &&
      ['planned', 'implemented'].includes(record.implementation) &&
      ['unknown', 'private', 'public'].includes(record.publicAvailability) &&
      ['unknown', 'pending', 'accepted'].includes(record.acceptance) &&
      refs(record.evidence, record.implementation === 'implemented') &&
      refs(record.acceptanceEvidence, record.acceptance === 'accepted'), 'Invalid or duplicate game-state record');
    ids.add(record.id);
    requireState(record.acceptance !== 'accepted' || record.implementation === 'implemented',
      'Accepted records must be implemented');
    checkResult(record.artifactCheck);
    requireState([null, 'assembled-pages', 'private-fixture'].includes(record.artifactCheck.target) &&
      (record.artifactCheck.result === 'NOT_RUN' || record.artifactCheck.target !== null), 'Invalid artifact check target');
    if (record.kind === 'level') counts.authoredLevels++;
    if (record.publicAvailability === 'public') {
      requireState(record.implementation === 'implemented' && manifest.games.some(game => game.id === gameId) &&
        publication.rights === 'cleared' && (catalogStatus === 'released'
          ? publication.release === 'approved' : publication.preview === 'approved') &&
        record.artifactCheck.result === 'PASS' && record.artifactCheck.target === 'assembled-pages',
      'Public availability requires a catalog entry, clearance and assembled Pages evidence');
      if (record.kind === 'level') counts.publicLevels++;
    }
  }

  if (resolveEvidence) {
    const evidence = [
      ...publication.evidence, ...Object.values(checks).flatMap(check => check.evidence),
      ...(state.save?.evidence ?? []),
      ...state.records.flatMap(record => [...record.evidence, ...record.acceptanceEvidence, ...record.artifactCheck.evidence]),
    ];
    for (const reference of new Set(evidence)) {
      requireState(resolveEvidence(reference), `Unresolvable evidence reference: ${reference}`);
    }
  }
  return counts;
}

export function hasCurrentDeployment(state, currentMain) {
  return typeof currentMain === 'string' && sha.test(currentMain) && state.deployment.deployedCommit === currentMain &&
    ['revision', 'http', 'gameplay'].every(name => state.deployment.checks[name].result === 'PASS');
}

if (import.meta.main) {
  const root = join(import.meta.dirname, '..');
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const inspectedCommit = git('rev-parse', 'HEAD').trim();
  const registry = parseRegistry(JSON.parse(readFileSync(join(root, 'registry/games.json'), 'utf8')));
  const manifest = JSON.parse(readFileSync(join(root, 'deployment/dist/release-manifest.json'), 'utf8'));
  requireState(isDeepStrictEqual(manifest.games,
    publicGames(registry).map(({ id, entry, version }) => ({ id, entry, version })),
  ), 'State validation requires the canonical assembled Pages manifest');
  for (const game of registry.games) {
    const directory = join(root, 'games', game.id);
    const path = join(directory, 'production/GAME_STATE.json');
    const file = lstatSync(path, { throwIfNoEntry: false });
    if (!file) continue;
    requireState(file.isFile(), `Expected a regular state file: ${path}`);
    const state = JSON.parse(readFileSync(path, 'utf8'));
    const counts = validateGameState(state, {
      gameId: game.id, inspectedCommit, manifest, catalogStatus: game.status,
      isAncestor: (base, head) => {
        try {
          git('merge-base', '--is-ancestor', base, head);
          return true;
        } catch (error) {
          if (error.status === 1 || error.status === 128) return false;
          throw error;
        }
      },
      resolveEvidence: reference => {
        if (url(reference)) return true;
        const [file] = reference.split('#');
        return /^(?:design|production|reports|src|tests)\/[a-z\d_./-]+$/i.test(file) &&
          !file.split('/').some(part => part === '.' || part === '..') &&
          Boolean(lstatSync(join(directory, file), { throwIfNoEntry: false })?.isFile());
      },
    });
    const main = process.env.STUDIO_PAGES_BASE_SHA;
    const live = hasCurrentDeployment(state, main) ? 'verified at main' : 'unverified at main';
    process.stdout.write(`${game.id}: ${counts.authoredLevels} authored levels, ${counts.publicLevels} in the public artifact, live gameplay ${live}.\n`);
  }
}
