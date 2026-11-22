#!/usr/bin/env node
// A branch that does not contain main replays main's squash as a second copy.
// PR #4 (ac303c5) conflicted that way on 0e8c7ed and c38e6ca. The tip before the merge was 0200c3d.
'use strict';
const { execFileSync } = require('child_process');
const anc = (a, b) => {
	try { execFileSync('git', ['merge-base', '--is-ancestor', a, b], { stdio: 'ignore' }); return true; }
	catch (e) { return false; }
};
const has = rev => {
	try { execFileSync('git', ['cat-file', '-e', rev], { stdio: 'ignore' }); return true; }
	catch (e) { return false; }
};
if (process.argv.includes('--prove')) {
	if (!has('0200c3d') || !has('c38e6ca') || !has('ac303c5')) {
		console.log('FAIL --prove needs 0200c3d, c38e6ca, and ac303c5. Fetch origin feat/addons-window-polish.');
		process.exit(1);
	}
	if (anc('c38e6ca', '0200c3d')) { console.log('FAIL prove: 0200c3d contains c38e6ca. The guard no longer sees the stale branch.'); process.exit(1); }
	console.log('FAIL 0200c3d does not contain c38e6ca. That is the stale branch before PR #4 merged.');
	if (!anc('0e8c7ed', 'ac303c5') || !anc('c38e6ca', 'ac303c5')) { console.log('FAIL prove: ac303c5 should contain 0e8c7ed and c38e6ca.'); process.exit(1); }
	console.log('ok ac303c5 contains 0e8c7ed and c38e6ca');
}
const base = process.env.GUARD_BASE || 'origin/main';
if (!has(base)) { console.log('FAIL ' + base + ' is not in this clone. Fetch it. Do not treat a missing base as a pass.'); process.exit(1); }
if (!anc(base, 'HEAD')) {
	console.log('FAIL HEAD does not contain ' + base + '.');
	console.log('Merge origin/main before you push. PR #4 conflicted because the branch did not contain the squash commits 0e8c7ed and c38e6ca.');
	process.exit(1);
}
console.log('ok HEAD contains ' + base);
