import test from 'node:test';
import assert from 'node:assert/strict';
import { checkLockstep, distTag } from '../release/versions.mjs';
import { executeGuard, nextRc, planTag } from '../release/plan-tag.mjs';

test('lockstep ok, drift and invalid semver', () => {
  assert.equal(checkLockstep([{ file: 'a', version: '1.0.0' }, { file: 'b', version: '1.0.0' }]).ok, true);
  const drift = checkLockstep([{ file: 'a', version: '1.0.0' }, { file: 'b', version: '1.0.1' }]);
  assert.equal(drift.ok, false);
  assert.equal(drift.problems.length, 2);
  assert.match(checkLockstep([{ file: 'a', version: 'one' }]).problems[0], /invalid version/);
});

test('dist-tag rule', () => {
  assert.equal(distTag('1.0.0-rc.0'), 'next');
  assert.equal(distTag('1.0.0'), 'latest');
});

test('planTag yields the tag command and display-only push; never executes a push', () => {
  const p = planTag('1.0.0', '1.0.0');
  assert.deepEqual(p.errors, []);
  assert.deepEqual(p.commands, [['git', ['tag', '-a', 'v1.0.0', '-m', 'Contentools 1.0.0']]]);
  assert.match(p.displayOnly[0], /^git push origin v1\.0\.0/);
  assert.ok(p.commands.every(([, a]) => !a.includes('push')));
  assert.equal(planTag('1.0.0-rc.3', '1.0.0-rc.3').errors.length, 0);
});

test('mismatching or invalid versions are errors', () => {
  assert.equal(planTag('1.0.1', '1.0.0').errors.length, 1);
  assert.equal(planTag('x', '1.0.0').errors.length, 1);
});

test('nextRc', () => {
  assert.equal(nextRc('1.0.0', ['v1.0.0-rc.0', 'v1.0.0-rc.1']), '1.0.0-rc.2');
  assert.equal(nextRc('1.0.0', []), '1.0.0-rc.0');
  assert.equal(nextRc('1.0.0-rc.1', ['v1.0.0-rc.1', 'v0.9.0-rc.7']), '1.0.0-rc.2');
});

test('executeGuard refuses a dirty tree and an existing tag', () => {
  const git = (map) => (args) => map[args[0]] ?? { status: 0, stdout: '' };
  assert.equal(executeGuard('v1.0.0', git({ status: { status: 0, stdout: ' M a\n' } })), 'git tree is not clean');
  assert.match(executeGuard('v1.0.0', git({ 'rev-parse': { status: 0, stdout: 'abc' } })), /already exists/);
  assert.equal(executeGuard('v1.0.0', git({ 'rev-parse': { status: 1, stdout: '' } })), null);
});
