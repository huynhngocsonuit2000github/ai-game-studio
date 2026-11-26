import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import process from 'node:process';
import { parseRegistry } from '../portal/src/registry.ts';

const registry = 'registry/games.json';
const editableFields = ['title', 'description', 'engine', 'version', 'cover'];
const privateMetadata = ['title', 'description', 'version'];

export function validateScope(paths, readBase, readHead, policy = {}, head = '') {
  const approvedHeads = policy.approvedHeads ?? {};
  if (Object.hasOwn(approvedHeads, head)) {
    const approvedPaths = approvedHeads[head];
    if (!Array.isArray(approvedPaths) || !isDeepStrictEqual([...approvedPaths].sort(), [...paths].sort())) {
      throw new Error('Trusted Studio exception does not match the exact changed paths.');
    }
    return 'approved Studio exception';
  }

  const targets = new Set();
  const studioPaths = [];
  for (const path of paths) {
    if (path === registry) continue;
    const target = /^games\/([a-z0-9]+(?:-[a-z0-9]+)*)\/.+$/s.exec(path)?.[1];
    if (target && target !== 'studio') targets.add(target);
    else if (path.startsWith('games/') && path !== 'games/README.md') {
      throw new Error(`Invalid game scope path: ${path}`);
    } else studioPaths.push(path);
  }

  if (targets.size === 0) return 'studio';
  if (targets.size > 1 || studioPaths.length) {
    throw new Error('A game PR must stay within one game directory and its authorized registry fields.');
  }

  const [id] = targets;
  if (paths.includes(registry)) {
    const grants = policy.registryFields ?? {};
    const fields = Object.hasOwn(grants, id) ? grants[id] : [];
    const priorRegistry = JSON.parse(readBase(registry));
    const nextRegistry = JSON.parse(readHead(registry));
    parseRegistry(priorRegistry);
    parseRegistry(nextRegistry);
    const { games: prior, ...priorRoot } = priorRegistry;
    const { games: next, ...nextRoot } = nextRegistry;
    if (!isDeepStrictEqual(priorRoot, nextRoot) ||
        !isDeepStrictEqual(prior.map((game) => game.id), next.map((game) => game.id))) {
      throw new Error('Game PR registry edits must preserve the registry contract and entry order.');
    }
    const before = prior.find((game) => game.id === id);
    const after = next.find((game) => game.id === id);
    if (!before || !after || !Array.isArray(fields) || !isDeepStrictEqual(
      prior.filter((game) => game.id !== id),
      next.filter((game) => game.id !== id),
    )) {
      throw new Error('Game PR registry edits must preserve the game ID and all other entries.');
    }
    for (const field of new Set([...Object.keys(before), ...Object.keys(after)])) {
      const standingGrant = before.visibility === 'development' && after.visibility === 'development' &&
        ['planned', 'development'].includes(before.status) && before.status === after.status &&
        privateMetadata.includes(field);
      if (!isDeepStrictEqual(before[field], after[field]) &&
          !standingGrant && (!editableFields.includes(field) || !fields.includes(field))) {
        throw new Error(`Registry field is outside the trusted grant: ${id}.${field}`);
      }
    }
  }
  return id;
}

if (process.argv[1] && import.meta.main) {
  const [, , base, head] = process.argv;
  if (![base, head].every((sha) => /^[a-f0-9]{40}$/.test(sha ?? ''))) {
    throw new Error('Supply the full Git commit SHAs for the PR base and head.');
  }
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
  const fork = git('merge-base', base, head).trim();
  const paths = git('diff', '--name-only', '--no-renames', '-z', fork, head).split('\0').filter(Boolean);
  const readAt = (sha) => (path) => {
    if (!git('ls-tree', sha, '--', path).startsWith('100644 blob ')) {
      throw new Error(`Expected a regular, nonexecutable file: ${path}`);
    }
    return git('show', `${sha}:${path}`);
  };
  const policy = JSON.parse(readAt(base)('studio/production/registry-scope.json'));
  const scope = validateScope(paths, readAt(fork), readAt(head), policy, head);
  process.stdout.write(`Verified ${scope} scope across ${paths.length} changed paths.\n`);
}
