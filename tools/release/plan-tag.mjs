import { SEMVER } from './versions.mjs';

/** Pure: next release candidate for the base version, given existing tag names (`v1.0.0-rc.0`, ...). */
export function nextRc(version, tags) {
  const base = version.replace(/-.*$/, '').replace(/\+.*$/, '');
  const prefix = `v${base}-rc.`;
  const nums = tags
    .filter((t) => t.startsWith(prefix) && /^\d+$/.test(t.slice(prefix.length)))
    .map((t) => Number(t.slice(prefix.length)));
  return `${base}-rc.${nums.length ? Math.max(...nums) + 1 : 0}`;
}

/**
 * Pure: plan the tag. `lockstep` is the repository version. Returns { errors, tag, message, commands, displayOnly }.
 * `commands` are the ones this tool may execute (never a push); `displayOnly` is what the owner runs by hand.
 */
export function planTag(version, lockstep) {
  const errors = [];
  if (!SEMVER.test(String(version))) errors.push(`invalid version "${version}"`);
  else if (version !== lockstep) errors.push(`version ${version} does not match the repository version ${lockstep} (bump first: yarn release:puck:bump ${version})`);
  const tag = `v${version}`;
  const message = `Contentools ${version}`;
  return {
    errors,
    tag,
    message,
    commands: [['git', ['tag', '-a', tag, '-m', message]]],
    displayOnly: [`git push origin ${tag}        # run by the owner at checkpoint CP-3, not by this script`],
  };
}

/**
 * Pure-ish guard for --execute. `git(args)` returns { status, stdout }. Returns an error string or null.
 */
export function executeGuard(tag, git) {
  const st = git(['status', '--porcelain']);
  if (st.status !== 0) return 'not a git repository';
  if (st.stdout.trim() !== '') return 'git tree is not clean';
  if (git(['rev-parse', '-q', '--verify', `refs/tags/${tag}`]).status === 0) return `tag ${tag} already exists`;
  return null;
}
