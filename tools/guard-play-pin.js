#!/usr/bin/env node
// Menu-look model for PLAY's margin. One step here is one step in addon_settings.js.
// liftPins writes the margin from the class it sees. A later .CanChangeHero does not
// rewrite it: HUD++'s stylesheet did not, on lea 22.11 (c4eda93, 7d76853, fdcfd5e, d2eb832).
// step() is the 4 Hz menu look. It updates the margin only when it calls syncPlay().
'use strict';
const fs = require('fs');
const { execFileSync } = require('child_process');

const PIN = 280, SWAP = 350, ROW = 32;
const expect = can => (can ? SWAP : PIN) + ROW;

const uncomment = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');
const bodyOf = (src, name) => {
	const start = src.indexOf('const ' + name + ' = ');
	if (start < 0) return null;
	const open = src.indexOf('{', start);
	if (open < 0) return null;
	let depth = 0;
	for (let i = open; i < src.length; i++) {
		if (src[i] === '{') depth++;
		else if (src[i] === '}') { depth--; if (depth === 0) return uncomment(src.slice(open + 1, i)); }
	}
	return null;
};

const wired = src => {
	const step = bodyOf(src, 'step');
	const sync = bodyOf(src, 'syncPlay');
	const lift = bodyOf(src, 'liftPins');
	const calls = !!(step && /\bsyncPlay\(\)/.test(step));
	const writes = !!(sync && /BHasClass\('CanChangeHero'\)/.test(sync) && /style\.marginBottom\s*=/.test(sync));
	const binds = !!(lift && /W\.play\s*=/.test(lift));
	return { calls, writes, binds, look: calls && writes && binds };
};

// States the code can be in. `look` is syncPlay when the source wires it, and a no-op when it does not.
const actsFrom = (s, look) => {
	const out = [];
	if (!s.placed) out.push({ name: 'liftPins', state: { can: s.can, margin: expect(s.can), bound: true, swap: s.can, placed: true } });
	if (!s.can) out.push({ name: 'CanChangeHero arrives', state: { can: true, margin: s.margin, bound: s.bound, swap: s.swap, placed: s.placed } });
	else out.push({ name: 'CanChangeHero leaves', state: { can: false, margin: s.margin, bound: s.bound, swap: s.swap, placed: s.placed } });
	const looked = { can: s.can, margin: s.margin, bound: s.bound, swap: s.swap, placed: s.placed };
	if (look && looked.bound && looked.can !== looked.swap) { looked.margin = expect(looked.can); looked.swap = looked.can; }
	out.push({ name: 'step (menu look)', state: looked, check: true });
	return out;
};
const keyOf = s => [s.can ? 1 : 0, s.margin, s.bound ? 1 : 0, s.swap ? 1 : 0, s.placed ? 1 : 0].join('|');
const run = look => {
	const start = { can: false, margin: null, bound: false, swap: false, placed: false };
	const seen = new Set([keyOf(start)]);
	let q = [{ s: start, trace: [] }];
	for (let n = 0; n < 6 && q.length; n++) {
		const next = [];
		for (const cur of q) {
			for (const act of actsFrom(cur.s, look)) {
				const trace = cur.trace.concat(act.name);
				if (act.check && act.state.bound && act.state.margin !== expect(act.state.can)) {
					return { trace, margin: act.state.margin, want: expect(act.state.can), can: act.state.can };
				}
				const k = keyOf(act.state);
				if (seen.has(k)) continue;
				seen.add(k);
				next.push({ s: act.state, trace });
			}
		}
		q = next;
	}
	return null;
};

const report = (src, label) => {
	const w = wired(src);
	const fail = run(w.look);
	if (!fail && w.look) return { ok: true, label, w };
	const why = !w.calls ? 'step() does not call syncPlay()'
		: !w.writes ? 'syncPlay() does not write marginBottom from CanChangeHero'
		: !w.binds ? 'liftPins() does not keep W.play'
		: 'the menu look writes the margin and the model still found a bad order';
	return { ok: false, label, w, why, fail };
};

const printFail = r => {
	console.log('FAIL ' + r.label);
	console.log(r.why);
	if (r.fail) {
		console.log('counterexample:');
		r.fail.trace.forEach((t, i) => console.log('  ' + (i + 1) + '. ' + t));
		console.log('PLAY margin is ' + r.fail.margin + 'px. CanChangeHero is ' + (r.fail.can ? 'on' : 'off') + ', so the margin should be ' + r.fail.want + 'px.');
		console.log('PLAY sits on SWAP HERO. lea 22.11, fixed in e17b680.');
	}
};

const gitShow = rev => {
	try { return execFileSync('git', ['show', rev + ':lib/addon-settings/addon_settings.js'], { encoding: 'utf8' }); }
	catch (e) { return null; }
};

const main = () => {
	const args = process.argv.slice(2);
	const prove = args.includes('--prove');
	const self = !args.includes('--no-self-test');
	const file = args.find(a => !a.startsWith('--')) || 'lib/addon-settings/addon_settings.js';
	const src = fs.readFileSync(file, 'utf8');
	const here = report(src, file);
	if (!here.ok) { printFail(here); process.exit(1); }
	console.log('ok ' + file + ': menu look writes PLAY from CanChangeHero');
	if (self) {
		const broken = src.replace(/^[ \t]*syncPlay\(\);\n/m, '');
		if (broken === src) { console.log('FAIL self-test: step() has no syncPlay() line to remove'); process.exit(1); }
		const bad = report(broken, 'source with syncPlay() removed from step()');
		if (bad.ok) { console.log('FAIL self-test: removing syncPlay() from step() still passed'); process.exit(1); }
		console.log('expected failure of the broken source:');
		printFail(bad);
		console.log('ok self-test: that source fails, as it should');
	}
	if (prove) {
		const old = gitShow('d6f1616');
		if (!old) { console.log('FAIL --prove: d6f1616 is not in this clone. Fetch origin feat/addons-window-polish.'); process.exit(1); }
		const past = report(old, 'd6f1616 (parent of e17b680)');
		if (past.ok) { console.log('FAIL --prove: d6f1616 passed. The model no longer catches the bug.'); process.exit(1); }
		printFail(past);
		const fix = gitShow('e17b680');
		if (!fix) { console.log('FAIL --prove: e17b680 is not in this clone.'); process.exit(1); }
		const good = report(fix, 'e17b680');
		if (!good.ok) { printFail(good); process.exit(1); }
		console.log('ok e17b680: the fix passes');
	}
};

main();
