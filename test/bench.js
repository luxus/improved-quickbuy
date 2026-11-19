// Stand-in benchmark: node test/bench.js <script> <vanilla|v7> [label]
// Same Panorama stand-in, same HUD tree, same scenarios for both mods. Per-second averages over 20 s.
// reads = text, class and IsValid reads (native calls in the game). heapKB = JS heap growth per second during the
// steady state, run with node --expose-gc --max-semi-space-size=256 so no GC runs inside the window (gcs shows it);
// it includes the stand-in's own job objects for each $.Schedule (sched), which cost nothing in the game's JS heap.
'use strict';
const fs = require('fs');
const S = require('./panorama.js');
const { H, C, advance } = S;
const [file, layout, label] = process.argv.slice(2);
let SRC = fs.readFileSync(file, 'utf8');
const ids = layout === 'v7' ? { tab: 'EnhancedQuickbuyCompLockTab', master: 'EnhancedQuickbuyCompLockRow' } : { tab: 'IqbTab', master: 'IqbRow_on' };
const byId = id => H.root.FindChildTraverse(id);
let noHudpp = false;
const fresh = () => { for (const k in S.storage) delete S.storage[k]; S.buildHud(layout); if (noHudpp) H.menuButton.parent.DeleteAsync(); S.load(SRC); };
const out = {};
const { PerformanceObserver } = require('perf_hooks');
let gcs = 0;
new PerformanceObserver(l => { gcs += l.getEntries().length; }).observe({ entryTypes: ['gc'] });
const heap = () => process.memoryUsage().heapUsed;
// allocKB: what the mod's own JS allocates per second, from V8's sampling heap profiler (every 64 bytes, collected
// objects included). A sample counts when it was allocated in the mod's code or in a builtin the mod called
// (Array, Map, String, RegExp ...); the stand-in's own objects (its panels, job list, $.Schedule) do not count.
const inspector = require('inspector');
const session = new inspector.Session(); session.connect();
const post = (m, p) => { let out; session.post(m, p || {}, (e, r) => { if (e) throw e; out = r; }); return out; };
const startSampling = () => post('HeapProfiler.startSampling', { samplingInterval: 64, includeObjectsCollectedByMinorGC: true, includeObjectsCollectedByMajorGC: true });
const isMod = f => f.url === '' && f.lineNumber >= 0;
const isBuiltin = f => f.url === '' && f.lineNumber < 0;
const stopSampling = () => {
	let bytes = 0;
	const walk = (n, parentMod) => {
		const mod = isMod(n.callFrame) || (isBuiltin(n.callFrame) && parentMod);
		if (mod) bytes += n.selfSize;
		n.children.forEach(c => walk(c, isMod(n.callFrame)));
	};
	walk(post('HeapProfiler.stopSampling').profile.head, false);
	return bytes;
};
const measure = (name, setup, secs, during) => {
	fresh(); S.resetCounts(); advance(3); const boot = Object.assign({}, C);
	if (!out.startup) out.startup = boot;
	setup();
	advance(10); // first-time panel creation and JIT warm-up are not the steady state
	S.resetCounts();
	const step = 0.5;
	if (global.gc) global.gc();
	const g0 = gcs, h0 = heap();
	startSampling();
	for (let t = 0; t < secs; t += step) { if (during) during(t); advance(step); }
	const h1 = heap();
	const own = stopSampling();
	const r = {}; Object.keys(C).forEach(k => { r[k] = Math.round(C[k] / secs * 10) / 10; });
	r.allocKB = Math.round(own / secs / 102.4) / 10;
	if (global.gc) { r.heapKB = Math.round((h1 - h0) / secs / 102.4) / 10; r.gcs = gcs - g0; }
	out[name] = r;
};
const counting = f => { const save = Object.assign({}, C); f(); Object.keys(C).forEach(k => { C[k] = save[k]; }); }; // test-driver actions are not the mod's cost
const openMenuOnTab = () => counting(() => { H.menuButton.events.onactivate(); advance(0.3); byId(ids.tab).events.onactivate(); });
measure('A play, nothing changes', () => {}, 20);
measure('B play, souls change every 0.5 s', () => {}, 20, t => { H.souls._text = String(1000 + Math.round(t * 2) * 37); });
measure('C shop open, nothing changes', () => H.globalClass('gShopOpen', true), 20);
measure('D CompLock menu open on Shop tab', () => { openMenuOnTab(); advance(0.5); }, 20);
measure('E mod switched off', () => { openMenuOnTab(); advance(0.3); counting(() => byId(ids.master).events.onactivate()); advance(0.5); counting(() => H.menuButton.events.onactivate()); advance(1); }, 20);
if (layout !== 'v7') { // states of this mod only (v7 has other settings)
	const setOff = (...keys) => counting(() => { H.menuButton.events.onactivate(); advance(0.3); byId(ids.tab).events.onactivate(); keys.forEach(k => k === 'count' ? [1, 2, 3, 4].forEach(() => byId('IqbCountDown').events.onactivate()) : byId('IqbRow_' + k).events.onactivate()); advance(0.3); H.menuButton.events.onactivate(); advance(1); });
	measure('F play, after the menu was opened once', () => counting(() => { H.menuButton.events.onactivate(); advance(0.5); H.menuButton.events.onactivate(); }), 20);
	measure('G CompLock menu open on a HUD++ tab', () => counting(() => { openMenuOnTab(); advance(0.3); H.tabs.hud.events.onactivate(); }), 20);
	noHudpp = true; measure('K play, no HUD++ (own window, never opened)', () => {}, 20); noHudpp = false;
	measure('H HUD features off (no badges, 1 item)', () => setOff('hud', 'count'), 20);
	measure('I all features off', () => setOff('hud', 'count', 'runningTotals', 'queueTotal'), 20);
	measure('J shop open, all features off', () => { setOff('hud', 'count', 'runningTotals', 'queueTotal'); H.globalClass('gShopOpen', true); }, 20);
}
if (layout !== 'v7') { // what the settings UI costs, in panels created, at each step (once each)
	const steps = {};
	const step = (k, f) => { S.resetCounts(); f(); steps[k] = C.created; };
	fresh(); advance(3);
	step('HUD++ menu first opened', () => { H.menuButton.events.onactivate(); advance(0.5); });
	step('our tab first clicked', () => { const t = byId(ids.tab); if (t) t.events.onactivate(); advance(0.3); });
	step('menu closed, 60 s idle', () => { H.menuButton.events.onactivate(); advance(60); });
	noHudpp = true; fresh(); noHudpp = false;
	step('no HUD++: load until our window is set up', () => advance(3));
	step('no HUD++: ADDONS first opened', () => { const b = byId('AddonSettingsButton'); if (b) b.events.onactivate(); advance(0.3); });
	out['settings panels created'] = steps;
}
console.log(JSON.stringify({ mod: label || file, layout, results: out, errors: S.errors.slice(0, 3) }));
