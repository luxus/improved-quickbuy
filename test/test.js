// Stand-in tests for Improved Quickbuy: node test/test.js build/pak/panorama/scripts/improved_quickbuy.js
'use strict';
const fs = require('fs');
const S = require('./panorama.js');
const { H, C, advance, shown, buildHud, storage, net } = S;
const SRC = fs.readFileSync(process.argv[2] || __dirname + '/../build/pak/panorama/scripts/improved_quickbuy.js', 'utf8');
let fails = 0, passes = 0;
const assert = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL', m); } if (process.env.V) console.log(c ? 'ok  ' : 'FAIL', m); };

const byId = id => { const w = p => { for (const k of p.kids) { if (k.id === id) return k; const r = w(k); if (r) return r; } return null; }; return w(H.root); };
const click = id => byId(id).events.onactivate();
const start = (opts = {}) => { buildHud('vanilla', opts.queue); if (opts.session !== undefined) H.root.attrs['AddonSettings:improved_quickbuy'] = opts.session; S.load(SRC); advance(opts.wait === undefined ? 2 : opts.wait); };
// every HUD panel outside HUD++'s menu and outside our own panels: path -> classes|applied style|text
const hudClasses = () => { const out = {}; const w = (p, path) => p.kids.filter(k => !String(k.id).startsWith('Iqb') && k.id !== 'HudppPanel').forEach((k, i) => { const q = path + '/' + (k.id || i); out[q] = [...k.cls].filter(c => !c.startsWith('Iqb')).sort().join(' ') + '|' + JSON.stringify(k.applied) + '|' + k._text; w(k, q); }); w(H.root, ''); return out; };
// our CSS, applied the way Panorama does: selectors (class/id compounds, descendant), later rules win
const CSS = fs.readFileSync(process.env.IQB_CSS || __dirname + '/../src/improved_quickbuy.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const RULES = CSS.split('}').map(chunk => { const i = chunk.indexOf('{'); if (i < 0) return null; const decl = {}; chunk.slice(i + 1).split(';').forEach(d => { const j = d.indexOf(':'); if (j > 0) decl[d.slice(0, j).trim()] = d.slice(j + 1).trim(); }); return { sels: chunk.slice(0, i).split(',').map(x => x.trim()).filter(Boolean), decl: decl }; }).filter(Boolean);
const compound = (p, c) => (c.match(/[#.][\w-]+/g) || []).every(t => t[0] === '#' ? p.id === t.slice(1) : p.cls.has(t.slice(1)));
const matches = (p, sel) => { const cs = sel.split(/\s+/); if (!compound(p, cs[cs.length - 1])) return false; let a = p.parent; for (let k = cs.length - 2; k >= 0; k--) { while (a && !compound(a, cs[k])) a = a.parent; if (!a) return false; a = a.parent; } return true; };
const styleOf = p => { const st = {}; RULES.forEach(r => { if (r.sels.some(x => matches(p, x))) Object.assign(st, r.decl); }); Object.assign(st, p.applied || {}); return st; };
const visible = p => { for (let a = p; a; a = a.parent) if (styleOf(a).visibility === 'collapse') return false; return true; };
const px = v => { const m = /^(\d+(?:\.\d+)?)px$/.exec(v || ''); return m ? parseFloat(m[1]) : 0; };
// the HUD row: badge n above queue position n (1 = Valve's item), our entries for positions 2..5
const badge = n => byId('IqbBadge' + n);
const stripShown = () => !!badge(1) && visible(badge(1));
const cells = () => [2, 3, 4, 5].map(n => byId('IqbEntry' + n)).filter(c => c && visible(c));
const cellText = () => cells().map(c => { const n = c.id.slice(-1); return (c.cls.has('IqbReady') ? 'ready' : badge(n) ? badge(n).kids[1]._text : '') + ':' + (c.kids[0].img || '').replace(/^.*items\//, '').replace(/_psd\.vtex$/, ''); }).join(' ');
const next = () => { const b = badge(1); return b && visible(b) && !b.cls.has('IqbReady') ? b.kids[1]._text : ''; };
const badges = () => [1, 2, 3, 4, 5].map(badge).filter(b => b && visible(b)).map(b => b.kids[1]._text).join(' ');
const tags = () => H.items.map(i => { const t = i.kids.length && byId2(i, 'IqbRunning'); return t && t.applied.visibility === 'visible' ? t._text : '-'; }).join(' ');
const document_count = id => { let n = 0; const w = p => p.kids.forEach(k => { if (k.id === id) n++; w(k); }); w(H.root); return n; };
const byId2 = (root, id) => { const w = p => { for (const k of p.kids) { if (k.id === id) return k; const r = w(k); if (r) return r; } return null; }; return w(root); };
const total = () => { const t = byId('IqbQueueTotal'); return t && t.applied.visibility === 'visible' ? t._text : ''; };
const bodies = () => [['hud', H.hudBody], ['mm', H.mmBody], ['xh', H.xhBody], ['shop', byId('IqbBody')]].filter(([, b]) => b && shown(b)).map(([k]) => k).join(',');

// ===== 1. fresh install, store empty: defaults =====
for (const k in storage) delete storage[k];
start();
assert(S.errors.length === 0, 'no errors at start: ' + S.errors.join(' | '));
assert(stripShown(), 'strip shown in play');
assert(next() === '' , 'next item (800) affordable with 1,000 souls: no badge');
assert(cellText() === '600:vitality/extra_stamina 1,400:weapon/monster_rounds', 'two upcoming cells (count 3): missing 600 / 1,400 with Valve icons: ' + cellText());
H.souls._text = '500'; advance(0.3);
assert(next() === '300', 'souls drop to 500: next badge shows 300 missing');
assert(cellText().startsWith('1,100:'), 'cells follow the souls: ' + cellText());
H.souls._text = '2,400'; advance(0.3);
assert(next() === '' && cellText() === 'ready:vitality/extra_stamina ready:weapon/monster_rounds', 'enough souls: cells marked ready: ' + cellText());
H.souls._text = '1,000'; advance(0.3);

// no world-blur, no full-HUD search, writes only on change
const css = fs.readFileSync(__dirname + '/../src/improved_quickbuy.css', 'utf8');
assert(!/world-blur\s*:/.test(css) && !/world-blur/.test(SRC.replace(/\/\/.*$/gm, '')), 'no world-blur in our CSS or JS');
S.resetCounts(); advance(10);
assert(C.classWrites === 0 && C.textWrites === 0 && C.images === 0 && C.styleWrites === 0, `10 s in play, nothing changes: no writes (${JSON.stringify(C)})`);
assert(C.finds === 0, '... and no traversals (' + C.finds + ')');
assert(C.sched <= 41 + 41, '... timer at 4 Hz + menu check at 4 Hz: ' + C.sched);

// ===== 2. shop: running totals and queue total =====
H.globalClass('gShopOpen', true); advance(0.05);
assert(!stripShown(), 'shop open: strip hidden');
assert(tags() === '- (1,600) (2,400) (4,000) (5,600)', 'running totals on queue entries still missing: ' + tags());
assert(total() === 'Queue 5,600 - 4,600 to go', 'queue total: ' + total());
H.souls._text = '6,000'; advance(0.25);
assert(tags() === '- - - - -' && total() === 'Queue 5,600 - ready', 'all affordable: totals hidden, queue ready');
H.souls._text = '1,000'; advance(0.25);
H.sell.kids.length = 0; S.entry(H.sell, 'Headshot Booster', '800'); advance(0.25);
assert(total() === 'Queue 5,600 - 4,200 to go', 'sell queue counts half its cost: ' + total());
H.sell.kids.length = 0; advance(0.25);
H.setQueue([['Extra Health', '800'], ['Kinetic Dash', '800']]); advance(0.25);
assert(tags() === '- (1,600)' && total() === 'Queue 1,600 - 600 to go', 'queue changed in the shop: ' + tags() + ' / ' + total());
const labelsBefore = H.items.map(i => i.FindChildrenWithClassTraverse('IqbRunning').length).join();
H.globalClass('gShopOpen', false); advance(0.3); H.globalClass('gShopOpen', true); advance(0.3);
assert(H.items.map(i => i.FindChildrenWithClassTraverse('IqbRunning').length).join() === labelsBefore && labelsBefore === '0,1', 'reopening the shop reuses the running-total labels (made only for items that need one)');
H.globalClass('gShopOpen', false); advance(0.3);
assert(stripShown() && cellText() === '600:weapon/kinetic_dash', 'shop closed: strip back with the new queue: ' + cellText());
H.setQueue([['Extra Health', '800'], ['Extra Stamina', '800'], ['Monster Rounds', '800'], ['Rapid Rounds', '1,600'], ['Mystic Burst', '1,600']]); advance(0.3);

// ===== 3. CompLock menu: HUD++ opens it, our tab follows =====
const before = hudClasses();
assert(S.handlers.every(h => h.ev !== 'Activated') && S.handlers.filter(h => h.p).every(h => /^(Iqb|AddonSettings)/.test(String(h.p.id))), 'event handlers only on our own panels, none on HUD++\'s');
H.menuButton.events.onactivate();
assert(H.menu && H.menu.cls.has('HudppOpen') && shown(H.menu) && bodies() === 'hud', 'menu button: HUD++ opens its menu at once, on its HUD tab');
assert(!byId('IqbTab'), 'our tab is not built before HUD++ opened');
advance(0.3);
assert(byId('IqbTab') && byId('IqbTab').parent.cls.has('HudppTabs') && bodies() === 'hud', 'Shop tab added within 0.25 s, menu still on HUD');
click('IqbTab');
assert(bodies() === 'shop' && H.foot.applied.visibility === 'collapse' && byId('IqbFoot').applied.visibility === 'visible' && byId('IqbTab').cls.has('HudppSelected') && !H.tabs.hud.cls.has('HudppSelected'), 'Shop tab: only our body and foot shown, HUD++ foot (status, reset) hidden, our tab selected');
H.tabs.mm.events.onactivate(); advance(0.06);
assert(bodies() === 'mm' && !byId('IqbTab').cls.has('HudppSelected') && H.foot.applied.visibility === 'visible', 'Shop -> Minimap: only the Minimap body shown');
click('IqbTab'); advance(0.06);
assert(bodies() === 'shop', 'Minimap -> Shop: HUD++ bodies stay hidden under the 3-tab CSS');
H.tabs.xh.events.onactivate(); advance(0.06);
assert(bodies() === 'xh' && !byId('IqbTab').cls.has('HudppSelected') && H.foot.applied.visibility === 'visible' && byId('IqbFoot').applied.visibility === 'collapse', 'Shop -> Crosshair: Crosshair shown within one 50 ms check');
click('IqbTab'); H.tabs.hud.events.onactivate(); advance(0.06);
assert(bodies() === 'hud', 'Shop -> HUD');
// HUD++ showTab returns at once when t === tab. After Crosshair, Quickbuy must still be able to
// open Crosshair again (Kai, 21.11: click from Quickbuy to Crosshair did nothing until HUD or Minimap).
H.tabs.xh.events.onactivate(); advance(0.06);
assert(bodies() === 'xh', 'on Crosshair before the return trip');
click('IqbTab'); advance(0.06);
assert(bodies() === 'shop' && byId('IqbTab').kids[0]._text === 'Quickbuy', 'Crosshair -> Quickbuy; tab title stays Quickbuy');
H.tabs.xh.events.onactivate(); advance(0.06);
assert(bodies() === 'xh' && !byId('IqbTab').cls.has('HudppSelected') && H.foot.applied.visibility === 'visible', 'Quickbuy after Crosshair -> Crosshair again: Crosshair shows');
H.tabs.hud.events.onactivate(); advance(0.06);
click('IqbTab'); advance(0.06);
H.tabs.hud.events.onactivate(); advance(0.06);
assert(bodies() === 'hud', 'Quickbuy after HUD -> HUD again');
assert(!S.handlers.some(h => h.ev === 'Activated' && h.p && [H.tabs.hud, H.tabs.mm, H.tabs.xh].includes(h.p)), 'no Activated hook left on HUD++ tabs after leaving ours');
for (let i = 0; i < 5; i++) { click('IqbTab'); advance(0.1); H.tabs[i % 2 ? 'hud' : 'xh'].events.onactivate(); advance(0.1); }
assert(bodies() === 'xh' || bodies() === 'hud', 'repeated switching stays consistent: ' + bodies());
click('IqbTab'); advance(0.1);
H.menuButton.events.onactivate(); advance(0.1);
assert(!H.menu.cls.has('HudppOpen'), 'button again: HUD++ closes the menu');
H.menuButton.events.onactivate(); advance(0.3);
assert(H.menu.cls.has('HudppOpen') && bodies() === H.tab && H.menu.FindChildrenWithClassTraverse('HudppTab').length === 4, 'reopened (HUD++ refresh puts its tab back), no second Shop tab');
H.menuButton.events.onactivate(); advance(0.1);
const after = hudClasses();
H.menuButton.events.onactivate(); advance(0.3);
const changed = Object.keys(before).filter(k => before[k] !== after[k]);
assert(changed.length === 0, 'outside the menu nothing of the HUD changed: ' + changed.slice(0, 3).join(', '));

// ===== 4. options =====
click('IqbTab');
const row = k => byId('IqbRow_' + k);
const wordsOn = row('on').kids.find(k => k.cls.has('HudppRowText'));
const descOn = wordsOn && wordsOn.kids.find(k => k.cls.has('HudppRowDesc'));
const swOn = row('on').kids.find(k => k.cls.has('HudppSwitch'));
assert(row('on').applied.height === 'fit-children' && row('on').applied.flowChildren === 'right', 'toggle row is not HUD++\'s 34 px line: ' + JSON.stringify(row('on').applied));
assert(wordsOn && wordsOn.applied.flowChildren === 'down' && wordsOn.applied.width === 'fill-parent-flow(1)', 'title and description stack in their own column');
assert(descOn && descOn._text.length > 0 && descOn.parent === wordsOn && swOn && swOn.parent === row('on'), 'description and switch are distinct slots, not over the label');
assert(row('on').cls.has('HudppOn') && row('hud').cls.has('HudppOn') && byId('IqbCountBar') && byId('IqbCountBar').cls.has('HudppSlider') && byId2(byId('IqbCountBar'), 'SliderThumb').kids.some(k => k.cls.has('HudppThumbDot')), 'rows built with HUD++ markup, slider with thumb dot');
assert(Math.abs(byId('IqbCountBar').value - 0.5) < 1e-6 && byId2(row('count'), '').parent, 'slider sits at 3 of 1..5');
click('IqbCountUp'); advance(0.3);
assert(cells().length === 3, 'count 4: three upcoming cells');
byId('IqbCountBar').value = 1; advance(0.3);
assert(cells().length === 4, 'slider to the end: count 5, four cells');
byId('IqbCountBar').value = 0.1; advance(0.3);
assert(cells().length === 0 && badges() === '0' && Math.abs(byId('IqbCountBar').value) < 1e-6, 'slider near the start: count 1, dot snaps to 1, exactly one badge (above Valve\'s item), no extra entries: ' + badges());
click('IqbCountUp'); click('IqbCountUp'); advance(0.3);
click('IqbRow_hud'); advance(0.3);
assert(!stripShown() && badges() === '' && cells().length === 2 && !row('count').cls.has('HudppRowOff'), 'Show Missing Souls off: no badges, the 2 extra entries stay, Items Shown row not dimmed: ' + badges() + ' / ' + cells().length);
click('IqbRow_hud'); advance(0.3);
assert(stripShown(), 'back on');
click('IqbRow_runningTotals'); H.globalClass('gShopOpen', true); advance(0.3);
assert(tags() === '- - - - -' && total() !== '', 'Running Totals off: none on entries, total still there');
click('IqbRow_queueTotal'); advance(0.3);
assert(total() === '', 'Queue Total off');
click('IqbRow_runningTotals'); click('IqbRow_queueTotal'); advance(0.3);
assert(tags() !== '- - - - -' && total() !== '', 'both back on');
H.globalClass('gShopOpen', false); advance(0.3);

// ===== 5. disabled: nothing runs =====
click('IqbRow_on'); advance(0.3);
assert(!stripShown() && row('hud').cls.has('HudppRowOff'), 'master off: strip hidden, rows dimmed');
H.globalClass('gShopOpen', true); advance(0.3);
assert(tags() === '- - - - -' && total() === '', 'master off: nothing in the shop either');
H.globalClass('gShopOpen', false);
H.menuButton.events.onactivate(); advance(0.3); // close the menu
S.resetCounts(); H.souls._text = '123'; advance(10); H.globalClass('gShopOpen', true); advance(1); H.globalClass('gShopOpen', false); advance(1);
const ticks = S.jobs.filter(j => j.f.name === 'tick').length;
assert(ticks === 0 && C.textWrites + C.classWrites + C.images + C.styleWrites + C.finds === 0, `disabled: no update timer, no writes, no lookups (${JSON.stringify(C)})`);
assert(C.sched <= 49, 'disabled: only the 4 Hz menu check runs (' + C.sched + ' schedules in 12 s)');

// ===== 6. persistence =====
H.menuButton.events.onactivate(); advance(0.3); click('IqbTab');
click('IqbRow_on'); advance(1.5); // on again, saved after 0.6 s
const saved = JSON.parse(storage.improved_quickbuy_settings || 'null');
assert(saved && saved.on === true && saved.count === 3 && saved.t > 0, 'saved to the store page under improved_quickbuy_settings: ' + storage.improved_quickbuy_settings);
assert(!('hudpp_settings' in storage), 'CompLock\'s own key never touched');
assert(byId('AddonSettingsVault') && true, 'store page kept open briefly after a save');
advance(4);
assert(!byId('AddonSettingsVault'), '... and closed 3 s later');
click('IqbCountDown'); click('IqbRow_queueTotal'); advance(1.5);
const writes = net.writes.length;
// restart: new game, store has the settings
start({ wait: 0.5 });
advance(2);
assert(cells().length === 1 && S.errors.length === 0, 'after restart: saved count 2 applied (one upcoming cell): ' + cellText());
H.globalClass('gShopOpen', true); advance(0.3);
assert(total() === '' && tags() !== '- - - - -', 'after restart: Queue Total still off');
assert(!byId('AddonSettingsVault'), 'store page closed right after the startup load');
H.globalClass('gShopOpen', false);
H.menuButton.events.onactivate(); advance(0.3); click('IqbTab');
assert(byId('IqbCountBar').value === 0.25 && !row('queueTotal').cls.has('HudppOn'), 'menu shows the loaded settings');
// session copy: a HUD reload in the same game does not reload from the page
const session = H.root.attrs['AddonSettings:improved_quickbuy'];
start({ session: session });
assert(!byId('AddonSettingsVault') && cells().length === 1, 'HUD reload: settings from the session copy, no store page');
// offline
for (const k in storage) delete storage[k];
net.online = false; start({ wait: 9 });
assert(stripShown() && cells().length === 2, 'offline: defaults, mod works');
H.menuButton.events.onactivate(); advance(0.3); click('IqbTab');
assert(/not loaded/.test(byId('IqbFoot') ? byId('IqbFoot').FindChildrenWithClassTraverse('AddonSettingsStatus')[0]._text : ''), 'offline: status says saved settings not loaded');
net.online = true;

// ===== 7. robustness =====
start(); H.ctx.kids.find(k => k.id === 'QuickBuyQueueContainer').DeleteAsync(); advance(1);
assert(S.errors.length === 0, 'quickbuy queue missing: no errors');
buildHud('vanilla'); H.esc.DeleteAsync(); S.load(SRC); advance(3);
assert(S.errors.length === 0 && stripShown(), 'no escape menu (no HUD++): works, no errors');
// HUD++ without tab bar
start(); { const real = H.openMenu; H.openMenu = () => { real(); const bar = H.menu.kids.find(k => k.cls.has('HudppTabs')); if (bar) { bar.DeleteAsync(); H.refresh = () => {}; } }; H.openMenu(); H.openMenu = real; } advance(0.3);
assert(byId('IqbBody') && byId('IqbBody').parent === H.hudBody, 'HUD++ without tab bar: our rows at the end of its HUD tab');
// item not in the table, and a ModIconImage with a src attribute
start(); H.items[1].FindChildTraverse('ModName')._text = 'Unknown Thing'; H.items[2].FindChildTraverse('ModIconImage').attrs.src = 's2r://x/y_psd.vtex'; H.items[2].FindChildTraverse('ModName')._text = 'Other'; advance(0.3);
assert(cellText() === '600: 1,400:s2r://x/y', 'unknown item: no icon; src attribute preferred: ' + cellText());

// ===== 8. what kept v1's row hidden in game =====
// "show the queue in the shop" (gQuickbuyShopShowQueue) is a toggle that stays on in play
start(); H.globalClass('gQuickbuyShopShowQueue', true); advance(0.3);
assert(stripShown() && cells().length === 2, 'queue-in-shop toggle on, shop closed: strip still shown');
H.globalClass('gShopOpen', true); advance(0.3);
assert(!stripShown() && total() !== '', 'then the shop opens: strip hidden, queue total shown');
H.globalClass('gShopOpen', false); advance(0.3);
assert(stripShown(), 'shop closes again: strip back');
// HUD loaded with the shop already open (no event seen): the class on #StatsAndModsContainer counts
buildHud('vanilla'); H.stats.cls.add('gShopOpen'); S.load(SRC); advance(2);
assert(!stripShown() && total() !== '', 'HUD loads with the shop open: shop mode from the class');
start();
// console: one load line and one first-update line, so a game log shows whether the script ran
assert(S.info.length === 4 && /1\.0\.2 loaded/.test(S.info[0]) && S.info.some(m => /Addon Settings: build \d+ hosts; settings as tabs in CompLock/.test(m)) && S.info.some(m => /queue 3, souls found/.test(m)), 'console lines once: ' + S.info.join(' | '));
advance(5);
assert(S.info.length === 4, 'no further console lines while running');
// a component queued before its upgrade is not paid twice (Extra Health -> Colossus, from abilities.vdata)
start({ queue: [['Extra Health', '800'], ['Colossus', '6,400'], ['Extra Stamina', '800']] });
assert(cellText() === '5,400:vitality/colossus 6,200:vitality/extra_stamina', 'queued component taken off its upgrade: ' + cellText());
// without the component in front, the shown price stands
start({ queue: [['Extra Stamina', '800'], ['Colossus', '6,400'], ['Extra Health', '800']] });
assert(cellText() === '6,200:vitality/colossus 7,000:vitality/extra_health', 'component after its upgrade: no discount: ' + cellText());

// ===== 9. v3: fixed-size entries next to Valve's item (v2's row was squeezed to a 2px sliver in game) =====
start();
const ours = () => [1, 2, 3, 4, 5].flatMap(n => [badge(n), byId('IqbEntry' + n)]).filter(p => p && visible(p));
assert(ours().length === 5, 'count 3: badges 1..3 and entries 2..3 shown: ' + ours().map(p => p.id).join(','));
assert(ours().every(p => p.parent === H.ctx), 'every badge and entry is a direct child of the quickbuy panel (no small box around them)');
assert(ours().every(p => px(styleOf(p).width) > 0 && px(styleOf(p).height) > 0), 'every shown badge and entry has a fixed non-zero width and height: ' + ours().map(p => p.id + '=' + styleOf(p).width + 'x' + styleOf(p).height).join(' '));
assert(cells().every(c => px(styleOf(c.kids[0]).width) > 0 && px(styleOf(c.kids[0]).height) > 0), 'item icons have a fixed size');
assert([1, 2, 3].every(n => px(styleOf(badge(n)).marginLeft || styleOf(badge(n))['margin-left']) === 400 + (n - 1) * 78), 'badge n at 400 + (n-1)*78 px');
assert([2, 3].every(n => styleOf(byId('IqbEntry' + n))['margin-left'] === styleOf(badge(n))['margin-left']), 'each badge right above its entry');
assert(styleOf(byId('IqbEntry2'))['margin-bottom'] === '19px' && styleOf(byId('IqbEntry2')).width === '70px' && styleOf(byId('IqbEntry2')).height === '70px', 'entries: 70x70 at 19px from the bottom, the box of Valve\'s item (#HudMiniContents)');
assert(/\.IqbHudOn #HudMini\s*\{\s*horizontal-align: left;/.test(CSS), '#HudMini left-aligned while the row is on, so the row cannot move it');
H.ctx.cls.delete('ShowMiniQuickbuy');
assert(!stripShown() && cells().length === 0, 'no Valve quickbuy item (ShowMiniQuickbuy off): no row');

// ===== 10. the badge number: souls still missing up to and including that item =====
// default count 3; set 5 for these
const five = () => { H.menuButton.events.onactivate(); advance(0.3); click('IqbTab'); byId('IqbCountBar').value = 1; advance(0.3); H.menuButton.events.onactivate(); advance(0.3); };
// plain queue
start({ queue: [['Extra Health', '800'], ['Extra Stamina', '800'], ['Monster Rounds', '800'], ['Rapid Rounds', '1,600'], ['Mystic Burst', '1,600']] }); five();
H.souls._text = '1,000'; advance(0.3);
assert(badges() === '0 600 1,400 3,000 4,600', 'plain queue, 1,000 souls: 0 600 1,400 3,000 4,600: ' + badges());
// souls above the total
H.souls._text = '9,000'; advance(0.3);
assert(badges() === '0 0 0 0 0' && cells().every(c => c.cls.has('IqbReady')) && badge(1).cls.has('IqbReady'), 'souls above the total: every badge 0, all marked ready');
// component, then its upgrade: Extra Health (800) -> Colossus (6,400 shown, Extra Health's 800 comes off)
start({ queue: [['Extra Health', '800'], ['Colossus', '6,400'], ['Extra Stamina', '800']] }); H.souls._text = '0'; advance(0.3);
assert(badges() === '800 6,400 7,200', 'component then upgrade, 0 souls: 800 6,400 7,200: ' + badges());
// owned component: the game already shows Colossus at 5,600; nothing more comes off
start({ queue: [['Colossus', '5,600'], ['Extra Stamina', '800']] }); H.souls._text = '0'; advance(0.3);
assert(badges() === '5,600 6,400', 'owned component (shown price already lowered): 5,600 6,400: ' + badges());
// 3-tier chain, nothing owned: Compress (1,600) -> Superior (3,200, minus 1,600) -> Transcendent (6,400, minus 3,200)
start({ queue: [['Compress Cooldown', '1,600'], ['Superior Cooldown', '3,200'], ['Transcendent Cooldown', '6,400']] }); H.souls._text = '0'; advance(0.3);
assert(badges() === '1,600 3,200 6,400', '3-tier chain: 1,600 3,200 6,400: ' + badges());
// 3-tier chain with Compress owned: Superior shown 1,600; Transcendent still takes Superior's full 3,200 off
start({ queue: [['Superior Cooldown', '1,600'], ['Transcendent Cooldown', '6,400']] }); H.souls._text = '0'; advance(0.3);
assert(badges() === '1,600 4,800', 'chain, first tier owned: Superior\'s full price (3,200) comes off Transcendent: ' + badges());
// two upgrades sharing one queued component: it comes off only once
start({ queue: [['Spirit Lifesteal', '1,600'], ['Infuser', '3,200'], ['Leech', '6,400']] }); H.souls._text = '0'; advance(0.3);
assert(badges() === '1,600 3,200 9,600', 'one queued component, two upgrades: taken off once: ' + badges());
// sell queue: half the shown cost counts as souls
start({ queue: [['Extra Health', '800'], ['Extra Stamina', '800']] }); S.entry(H.sell, 'Headshot Booster', '800'); H.souls._text = '0'; advance(0.3);
assert(badges() === '400 1,200', 'selling an 800 item adds 400: ' + badges());

// ===== 11. v4: labels, range 1..5, saved values =====
start(); H.menuButton.events.onactivate(); advance(0.3); click("IqbTab"); advance(0.1);
const labelOf = id => { const r = byId(id); const t = r && r.FindChildrenWithClassTraverse('HudppRowTitle')[0]; return t ? t._text : ''; };
const sectionTitles = () => byId("IqbBody").FindChildrenWithClassTraverse("HudppSectionTitle").map(l => l._text).join(",");
assert(byId('IqbTab').kids[0]._text === 'Quickbuy', 'CompLock tab is called Quickbuy: ' + byId('IqbTab').kids[0]._text);
assert(labelOf('IqbRow_on') === 'Enable' && labelOf('IqbRow_hud') === 'Show Missing Souls' && labelOf('IqbRow_count') === 'Items Shown', 'row titles Enable / Show Missing Souls / Items Shown: ' + ['on', 'hud', 'count'].map(k => labelOf('IqbRow_' + k)).join(' / '));
assert(/Improved Quickbuy/.test(sectionTitles()) && /HUD/.test(sectionTitles()) && /Shop/.test(sectionTitles()) && !/In Play/.test(sectionTitles()), 'sections Improved Quickbuy, HUD, Shop: ' + sectionTitles());
H.menuButton.events.onactivate(); advance(0.3);
const savedAs = obj => { for (const k in storage) delete storage[k]; storage.improved_quickbuy_settings = JSON.stringify(Object.assign({ t: 1000 + Math.random() }, obj)); start({ wait: 3 }); return { count: badges().split(' ').filter(Boolean).length, entries: cells().length }; };
let m = savedAs({ v: 2, on: true, hud: true, count: 2 });
assert(m.count === 2 && m.entries === 1, 'saved v3 count 2 stays 2 (two badges, one extra entry): ' + JSON.stringify(m));
m = savedAs({ v: 1, on: true, hud: true, count: 1 });
assert(m.count === 1 && m.entries === 0, 'saved count 1 (v1): one badge, no extra entries: ' + JSON.stringify(m));
m = savedAs({ v: 2, on: true, hud: true, count: 9 });
assert(m.count === 5, 'saved count above range: clamped to 5: ' + JSON.stringify(m));
m = savedAs({ v: 2, on: true, hud: true, count: 0 });
assert(m.count === 1, 'saved count 0: clamped to 1: ' + JSON.stringify(m));
for (const k in storage) delete storage[k];

// ===== 12. v5: Show Missing Souls (badges) and Items Shown (entries) are independent =====
let soulReads = 0;
const spySouls = () => { soulReads = 0; const l = H.souls; Object.defineProperty(l, 'text', { configurable: true, get() { soulReads++; return l._text; }, set(v) { l._text = v; } }); };
for (const k in storage) delete storage[k];
storage.improved_quickbuy_settings = JSON.stringify({ v: 3, t: 5000, on: true, hud: false, count: 3, runningTotals: true, queueTotal: true });
buildHud('vanilla'); spySouls(); S.load(SRC); advance(3);
assert(cells().length === 2 && badges() === '', 'badges off, 3 items: Valve\'s item + 2 extra entries, 0 badges: ' + cells().length + ' / "' + badges() + '"');
assert(cellText().split(' ').every(c => /:vitality\/|:weapon\//.test(c)), 'extra entries still get their icons: ' + cellText());
S.resetCounts(); soulReads = 0; H.souls._text = '50'; advance(5);
assert(soulReads === 0, 'badges off: the souls label is never read (no souls math): ' + soulReads);
assert(cells().every(c => !c.cls.has('IqbReady')), 'badges off: no affordability frame (it would need the math)');
H.globalClass('gShopOpen', true); advance(0.3);
assert(total() !== '' && soulReads > 0, 'shop totals still do their math with badges off');
H.globalClass('gShopOpen', false); advance(0.3);
storage.improved_quickbuy_settings = JSON.stringify({ v: 3, t: 6000, on: true, hud: true, count: 1, runningTotals: true, queueTotal: true });
start({ wait: 3 });
assert(badges() === '0' && cells().length === 0, 'badges on, 1 item: exactly one badge, no extra entries: "' + badges() + '"');
storage.improved_quickbuy_settings = JSON.stringify({ v: 3, t: 7000, on: true, hud: false, count: 1, runningTotals: true, queueTotal: true });
buildHud('vanilla'); spySouls(); S.load(SRC); advance(3);
assert(badges() === '' && cells().length === 0 && !byId('IqbBadge1'), 'both off, 1 item: vanilla, nothing of ours built');
S.resetCounts(); soulReads = 0; H.souls._text = '77'; advance(10);
assert(S.jobs.filter(j => j.f.name === 'tick').length === 0 && C.finds + C.nodes + C.classWrites + C.textWrites + C.images + C.styleWrites === 0 && soulReads === 0 && C.sched <= 41, 'both off, 1 item: no update timer and zero work in 10 s (only the 4 Hz CompLock menu check runs, as with the mod off): ' + JSON.stringify(C));
H.menuButton.events.onactivate(); advance(0.3); click('IqbTab');
assert(!row('count').cls.has('HudppRowOff'), 'Items Shown slider stays usable with the badges off');
click('IqbCountUp'); advance(0.3);
assert(cells().length === 1 && badges() === '', 'Items Shown raised with the badges off: one extra entry appears, still no badges');
for (const k in storage) delete storage[k];

// ===== 13. running totals: no color of their own, the cost's colors from Valve, thinner =====
start(); H.globalClass('gShopOpen', true); advance(0.3);
{
	const tagsShown = H.items.map(i => byId2(i, 'IqbRunning')).filter(t => t && t.applied.visibility === 'visible');
	const costOf = t => t.parent.kids.find(k => k.id === 'ModCost');
	assert(tagsShown.length > 0 && tagsShown.every(t => !t.applied.color && t.applied.fontWeight === 'normal'), 'running totals: no inline color, normal weight: ' + tagsShown.map(t => JSON.stringify(t.applied)).join(' '));
	assert(tagsShown.every(t => /^\(\d[\d,]*\)$/.test(t._text)), 'running totals in parentheses: ' + tagsShown.map(t => t._text).join(' '));
	assert(tagsShown.every(t => styleOf(t).color === '#ff6161' && costOf(t)), 'running total takes Valve\'s cost color (#ff6161), next to #ModCost');
	tagsShown[0].parent.parent.parent.parent.cls.add('CanAffordCumulative');
	assert(styleOf(tagsShown[0]).color === 'shardColor', '... and Valve\'s affordable color (shardColor) with the cost');
	assert(!/#8fd8ff/i.test(CSS + SRC), 'the old light-blue running-total color is gone');
}
H.globalClass('gShopOpen', false);

// ===== 14. v6: work per second in steady states (the stand-in counts native reads and writes) =====
{
	const per = (secs, f) => { S.resetCounts(); if (f) f(); else advance(secs); const r = {}; Object.keys(C).forEach(k => { r[k] = C[k] / secs; }); return r; };
	const writes = r => (r.classWrites || 0) + (r.textWrites || 0) + (r.styleWrites || 0) + (r.created || 0);
	start();
	let r = per(10);
	assert(r.sched <= 8.1 && r.reads <= 35 && writes(r) === 0, 'play, nothing changes (menu not built yet): reads ' + r.reads + '/s, sched ' + r.sched + '/s, no writes');
	assert(!byId('IqbEntry4') && !byId('IqbEntry5') && !byId('IqbBadge4') && !byId('IqbBadge5'), 'HUD panels only up to Items Shown (3)');
	H.menuButton.events.onactivate(); advance(0.5); H.menuButton.events.onactivate(); advance(1);
	r = per(10);
	assert(r.sched <= 4.01 && r.reads <= 30 && writes(r) === 0, 'after our tab is in HUD++\'s menu nothing watches it: sched ' + r.sched + '/s');
	H.souls._text = '1,037'; r = per(1);
	assert(writes(r) <= 3 && r.textWrites >= 1, 'souls changed: only changed badge labels written: ' + JSON.stringify(r));
	H.globalClass('gShopOpen', true); advance(0.5);
	r = per(10);
	assert(r.reads <= 60 && writes(r) === 0, 'shop open, nothing changes: reads ' + r.reads + '/s, no writes');
	H.globalClass('gShopOpen', false); advance(0.5);
	// a panel we read goes away: found again within the 5 s check
	const old = H.souls; old._text = '0'; advance(0.5); const fresh = S.mk('Label', old.parent, 'hudCurGoldLabel'); old.DeleteAsync(); fresh._text = '99,999';
	H.souls = fresh; advance(6);
	assert(S.errors.length === 0 && next() === '' && byId('IqbBadge1').cls.has('IqbReady'), 'souls label replaced: read again from the new one');
	// all features off: no timer left
	H.menuButton.events.onactivate(); advance(0.3); click('IqbTab');
	['IqbRow_hud', 'IqbRow_runningTotals', 'IqbRow_queueTotal'].forEach(click); [1, 2, 3, 4].forEach(() => click('IqbCountDown'));
	advance(0.3); H.menuButton.events.onactivate(); advance(1);
	r = per(10);
	assert(r.sched <= 0.3 && r.reads <= 1, 'all features off: only the menu check every 5 s: ' + JSON.stringify(r));
}

// ===== 15. without HUD++ (CompLock): defaults, no errors, our own settings window in the Esc menu =====
for (const k in storage) delete storage[k];
buildHud('vanilla'); H.menuButton.parent.DeleteAsync(); S.load(SRC); advance(2);
assert(S.errors.length === 0 && stripShown() && cells().length === 2, 'no HUD++: HUD row with defaults (3 items, badges), no errors: ' + S.errors.join(' | '));
{
	const host = byId('AddonSettingsHost'), button = byId('AddonSettingsButton');
	assert(host && button && button.parent.parent.id === 'SubOptions', 'no HUD++: ADDONS button in the Esc menu, window host made');
	assert(!byId('IqbBody') && host.applied.visibility === 'collapse', 'no HUD++: window closed and our body not built before the first open');
	assert(!byId('AddonSettingsClose'), 'no HUD++: window head not built before the first open');
	const sub = button.parent.parent; const order = sub.kids.map(k => k.id || [...k.cls].join('.'));
	assert(sub.kids.indexOf(button.parent) < sub.kids.findIndex(k => k.cls.has('SettingsRow')) || !sub.kids.some(k => k.cls.has('SettingsRow')), 'ADDONS sits above Valve\'s settings row: ' + order.join(','));
	S.resetCounts(); advance(60);
	assert(C.sched / 60 <= 4.01 && S.errors.length === 0, 'no HUD++: no menu check left, only the HUD tick: sched ' + C.sched / 60 + '/s');
	button.events.onactivate(); advance(0.1);
	const body = byId('IqbBody');
	assert(host.applied.visibility === 'visible' && body && body.applied.visibility === 'visible' && byId('AddonSettingsNav_improved_quickbuy').cls.has('AddonSettingsSelected'), 'first open: window shown with Quickbuy selected in the sidebar');
	assert(host.kids[0].cls.has('AddonSettingsHead') && byId('AddonSettingsClose'), 'first open: head built, first in the window');
	assert(byId('IqbRow_on') && byId('IqbCountBar') && byId('IqbRow_hud').kids.some(k => k.cls.has('HudppSwitch')), 'same rows and slider as in CompLock');
	const sw = byId('IqbRow_hud').kids.find(k => k.cls.has('HudppSwitch'));
	assert(sw.applied.backgroundColor === '#5fe69e', 'switch drawn on (inline): ' + sw.applied.backgroundColor);
	click('IqbRow_hud'); advance(1);
	assert(!byId('IqbBadge1') || !visible(byId('IqbBadge1')), 'switching Show Missing Souls off in our window hides the badges');
	assert(sw.applied.backgroundColor !== '#5fe69e', 'switch drawn off');
	assert(JSON.parse(storage.improved_quickbuy_settings || '{}').hud === false, 'saved to the store page: ' + JSON.stringify(storage).slice(0, 200));
	click('IqbCountUp'); advance(1);
	assert(cells().length === 3, 'Items Shown 4 from our window: ' + cells().length);
	click('AddonSettingsClose'); advance(0.1);
	assert(host.applied.visibility === 'collapse', 'close button closes the window');
	button.events.onactivate(); advance(0.1);
	assert(host.applied.visibility === 'visible' && document_count('IqbBody') === 1, 'reopened: same body, not built twice');
	H.globalClass('gShopOpen', true); advance(0.5);
	assert(S.errors.length === 0, 'no errors: ' + S.errors.join(' | '));
	H.globalClass('gShopOpen', false); advance(0.5);
}
// a new HUD load without HUD++ reads the saved settings
buildHud('vanilla'); H.menuButton.parent.DeleteAsync(); S.load(SRC); advance(3);
assert(stripShown() === false && cells().length === 3, 'no HUD++: saved settings loaded again (no badges, 4 items): ' + cells().length);
assert(S.info.filter(m => /no HUD\+\+/.test(m)).length === 1, 'no HUD++: said once in the console');
// HUD++ present: our tab in CompLock, no ADDONS button or window
for (const k in storage) delete storage[k];
start(); H.menuButton.events.onactivate(); advance(0.5); H.menuButton.events.onactivate(); advance(70);
assert(!byId('AddonSettingsButton') && !byId('AddonSettingsHead') && byId('AddonSettingsHost').applied.visibility === 'collapse', 'HUD++ present: no ADDONS button, no window built');
// no escape menu at all
buildHud('vanilla'); H.esc.DeleteAsync(); S.load(SRC); advance(80);
{ S.resetCounts(); advance(10); assert(C.sched / 10 <= 4.01 && S.errors.length === 0, 'no escape menu: the menu check stops too: sched ' + C.sched / 10 + '/s'); }
// with HUD++ the menu check keeps looking at 4 Hz until it is opened (latency of our tab)
start(); advance(70); { S.resetCounts(); advance(10); assert(C.sched / 10 <= 4.01, 'with HUD++, never opened: the menu check rides on the HUD tick: sched ' + C.sched / 10); }
H.menuButton.events.onactivate(); advance(0.3); assert(byId('IqbTab'), 'with HUD++: our tab appears within one HUD tick of the menu opening');
// HUD tick stopped (all features off, settings from the store): the menu check keeps its own 4 Hz timer
for (const k in storage) delete storage[k];
storage.improved_quickbuy_settings = JSON.stringify({ v: 3, t: 5000, on: true, hud: false, count: 1, runningTotals: false, queueTotal: false });
start({ wait: 3 }); advance(5);
{ S.resetCounts(); advance(10); assert(C.sched / 10 >= 3.9 && C.sched / 10 <= 4.01, 'HUD tick stopped: menu check on its own timer, 4 Hz: ' + C.sched / 10); }
H.menuButton.events.onactivate(); advance(0.3); assert(byId('IqbTab'), 'HUD tick stopped: our tab still appears');
H.menuButton.events.onactivate(); advance(0.5); { S.resetCounts(); advance(10); assert(C.sched === 0, 'all off and tab built: no timer at all: ' + C.sched); }

// ===== 16. v7: settings cost only when used =====
for (const k in storage) delete storage[k];
start(); H.menuButton.events.onactivate(); advance(0.3);
assert(byId('IqbTab') && !byId('IqbBody'), 'HUD++ menu opened: only our tab button, no body until it is clicked');
{ const before = C.created; click('IqbTab'); advance(0.1); assert(byId('IqbBody') && C.created > before, 'tab clicked: body built'); }
{ const p = byId('IqbRow_hud'); click('IqbRow_hud'); click('IqbRow_hud'); net.writes.length = 0; advance(1); assert(net.writes.length === 0, 'switched off and on again within the save delay: no store write'); }
{ net.writes.length = 0; click('IqbRow_hud'); advance(0.2); click('IqbRow_runningTotals'); advance(1); assert(net.writes.length === 1, 'two changes in a burst: one store write: ' + net.writes.length); }
advance(5); assert(!byId('AddonSettingsVault'), 'store page closed again after saving (no idle browser panel)');
H.menuButton.events.onactivate(); advance(0.5);
S.resetCounts(); advance(10); assert(C.sched / 10 <= 4.01 && C.created === 0, 'menu closed: no settings timers, nothing built: sched ' + C.sched / 10);

// ===== 17. v9: languages, reset tab, saved status, the window's clicks and last tab =====
const words = p => { const out = []; const w = q => q.kids.forEach(k => { if (k.type === 'Label') out.push(k._text); w(k); }); if (p) w(p); return out; };
const openQuickbuy = () => { H.menuButton.events.onactivate(); advance(0.3); click('IqbTab'); advance(0.1); };
const withLang = (setup, f) => { const keep = { Language: $.Language, Localize: $.Localize }; setup(); try { f(); } finally { $.Language = keep.Language; $.Localize = keep.Localize; if (!keep.Language) delete $.Language; } };
// English: no $.Language, no loc file (the stand-in's $.Localize hands the token back): the built-in table
for (const k in storage) delete storage[k];
start(); openQuickbuy();
assert(byId('IqbTab').kids[0]._text === 'Quickbuy' && words(byId('IqbBody')).includes('Show Missing Souls') && words(byId('IqbBody')).includes('HUD'), 'English: tab, rows and sections from the table: ' + words(byId('IqbBody')).slice(0, 4).join(' | '));
assert(!words(byId('IqbBody')).concat(words(byId('IqbFoot'))).some(x => /^#|Iqb_|AddonSettings_/.test(x)), 'English: no token shows as text');
assert(words(byId('IqbFoot')).includes('Reset Quickbuy') && !words(byId('IqbFoot')).includes('Reset tab') && byId('IqbTab').kids[0]._text === 'Quickbuy', 'English: Reset Quickbuy button, tab stays Quickbuy');
{ const ft = byId('IqbFoot'); assert(!ft.kids.some(k => k.cls.has('HudppFootMain')) && ft.kids.some(k => k.cls.has('HudppStatus')) && ft.kids[ft.kids.length - 1].id === 'IqbReset', 'reset button is a direct child of the foot, last (right-hand side), not wrapped in FootMain'); }
assert(/\(english, words from the built-in table\)/.test(S.info[0]), 'console says language and where the words came from: ' + S.info[0]);
H.globalClass('gShopOpen', true); advance(0.3);
assert(/^Queue [\d,]+ - ([\d,]+ to go|ready)$/.test(total()), 'English shop total: ' + total());
H.globalClass('gShopOpen', false); advance(0.3);
// reset tab: defaults back, saved once, "Saved" with HUD++'s class
click('IqbRow_hud'); click('IqbCountUp'); advance(1.5);
assert(JSON.parse(storage.improved_quickbuy_settings).hud === false && JSON.parse(storage.improved_quickbuy_settings).count === 4, 'changed before reset');
{ const st = byId('IqbFoot').FindChildrenWithClassTraverse('AddonSettingsStatus')[0]; assert(st._text === 'Saved' && st.cls.has('Hudpp_saved'), 'CompLock tab: "Saved" after a change, with HUD++\'s saved class: ' + st._text); }
net.writes.length = 0; click('IqbReset'); advance(1.5);
{ const v = JSON.parse(storage.improved_quickbuy_settings); assert(v.on === true && v.hud === true && v.count === 3 && v.runningTotals === true && v.queueTotal === true && net.writes.length === 1, 'Reset tab: our defaults back and saved once: ' + JSON.stringify(v)); }
assert(row('hud').cls.has('HudppOn') && Math.abs(byId('IqbCountBar').value - 0.5) < 1e-6 && cells().length === 2, 'Reset tab: rows, slider and HUD follow');
{ const before = net.writes.length; click('IqbReset'); advance(1.5); assert(net.writes.length === before, 'Reset tab at defaults: no store write'); }
assert(!('hudpp_settings' in storage), 'Reset tab never touches CompLock\'s settings');
// German from $.Language()
withLang(() => { $.Language = () => 'german'; }, () => {
	start(); openQuickbuy();
	const w = words(byId('IqbBody'));
	assert(w.includes('Fehlende Seelen anzeigen') && w.includes('Aktivieren') && words(byId('IqbFoot')).includes('Quickbuy zurücksetzen') && !words(byId('IqbFoot')).includes('Tab zurücksetzen'), 'German ($.Language): rows and Reset Quickbuy in German: ' + w.slice(0, 3).join(' | '));
	assert(byId('IqbTab').kids[0]._text === 'Quickbuy', 'German: tab title from the German table');
	H.globalClass('gShopOpen', true); advance(0.3);
	assert(/^Gesamt [\d,]+ - (noch [\d,]+|bereit)$/.test(total()), 'German shop total: ' + total());
	H.globalClass('gShopOpen', false); advance(0.3);
	click('IqbRow_hud'); advance(1.5);
	assert(byId('IqbFoot').FindChildrenWithClassTraverse('AddonSettingsStatus')[0]._text === 'Gespeichert', 'German status: Gespeichert');
});
// German from the root's Language_german class (no $.Language)
withLang(() => { delete $.Language; }, () => {
	buildHud('vanilla'); H.root.cls.add('Language_german'); S.load(SRC); advance(2); openQuickbuy();
	assert(words(byId('IqbBody')).includes('Zwischensummen'), 'German (Language_german class): rows in German');
});
// a language without a table: English
withLang(() => { $.Language = () => 'vietnamese'; }, () => { start(); openQuickbuy(); assert(words(byId('IqbBody')).includes('Running Totals') && words(byId('IqbFoot')).includes('Reset Quickbuy'), 'Vietnamese (no table): English'); });
// $.Language broken: English, no error
withLang(() => { $.Language = () => { throw new Error('no'); }; }, () => { start(); openQuickbuy(); assert(words(byId('IqbBody')).includes('Enable') && S.errors.filter(e => !/language/.test(e)).length === 0, 'broken $.Language: English: ' + S.errors.join(' | ')); });
// the game's loc file loaded: its text wins over the table
withLang(() => { $.Language = () => 'german'; $.Localize = s => (s === '#Iqb_Enable' ? 'Einschalten (loc)' : s); }, () => {
	start(); openQuickbuy();
	const w = words(byId('IqbBody'));
	assert(w.includes('Einschalten (loc)') && w.includes('Zwischensummen'), 'loc file token wins, the rest from the table: ' + w.slice(0, 3).join(' | '));
	assert(/words from the game's loc file/.test(S.info[0]), 'console: loc file found: ' + S.info[0]);
});
// $.Localize returning the bare token (another engine habit) still falls back
withLang(() => { $.Localize = s => s.replace(/^#/, ''); }, () => { start(); openQuickbuy(); assert(words(byId('IqbBody')).includes('Queue Total'), 'Localize handing back the bare token: table used'); });
// a token missing from the German table: English for that one
{
	const SRC2 = SRC.replace("Iqb_RunningTotals: 'Zwischensummen',", '');
	withLang(() => { $.Language = () => 'german'; }, () => { buildHud('vanilla'); S.load(SRC2); advance(2); openQuickbuy(); assert(words(byId('IqbBody')).includes('Running Totals') && words(byId('IqbBody')).includes('Aktivieren'), 'token missing in German: English for it, German for the rest'); });
}
// a token in no table at all: its bare name, never '#Token'
{
	const SRC3 = SRC.replace("Iqb_QueueTotal: 'Queue Total',", '');
	buildHud('vanilla'); S.load(SRC3); advance(2); openQuickbuy(); assert(words(byId('IqbBody')).includes('Iqb_QueueTotal') && !words(byId('IqbBody')).some(x => x.charAt(0) === '#'), 'token in no table: bare token name shown');
}
// the loc files built from the same table
{
	const de = fs.readFileSync(__dirname + '/../build/pak/resource/localization/improved_quickbuy/improved_quickbuy_german.txt', 'utf8');
	const en = fs.readFileSync(__dirname + '/../build/pak/resource/localization/improved_quickbuy/improved_quickbuy_english.txt', 'utf8');
	assert(/^\ufeff"lang"\r\n\{\r\n\t"Language"\t"german"\r\n\t"Tokens"/.test(de) && /"Iqb_ShowMissing"\t"Fehlende Seelen anzeigen"/.test(de) && /"Iqb_ShowMissing"\t"Show Missing Souls"/.test(en), 'loc files: Valve format (UTF-8 BOM, CRLF), same words as the table');
	const n = t => (t.match(/^\t\t"/gm) || []).length;
	assert(n(de) === n(en) && n(en) > 10, 'loc files: same token count per language: ' + n(en));
}
// no HUD++: window words, clicks inside do not close, last tab remembered
withLang(() => { $.Language = () => 'german'; }, () => {
	for (const k in storage) delete storage[k];
	buildHud('vanilla'); H.menuButton.parent.DeleteAsync(); S.load(SRC); advance(2);
	const button = byId('AddonSettingsButton');
	assert(button.kids[0]._text === 'ADDONS', 'window button word (German: ADDONS)');
	button.events.onactivate(); advance(0.1);
	const head = byId('AddonSettingsHead'), main = byId('AddonSettingsMain');
	assert(head.type === 'Button' && main.type === 'Button' && typeof head.events.onactivate === 'function' && typeof main.events.onactivate === 'function', 'window head and body catch clicks (no click falls through to the Esc menu background)');
	head.events.onactivate(); main.events.onactivate(); advance(0.1);
	assert(byId('AddonSettingsHost').applied.visibility === 'visible', 'clicks inside the window keep it open');
	assert(words(byId('IqbBody')).includes('Quickbuy zurücksetzen') && !words(byId('IqbBody')).includes('Tab zurücksetzen'), 'window: Reset Quickbuy in German');
	click('IqbRow_hud'); advance(1.5);
	{ const st = byId('IqbBody').FindChildrenWithClassTraverse('AddonSettingsStatus')[0]; assert(st._text === 'Gespeichert' && st.applied.color === '#5fe69eaa', 'window: status Gespeichert in green'); }
	click('IqbReset'); advance(1.5);
	assert(JSON.parse(storage.improved_quickbuy_settings).hud === true, 'window: Reset tab works');
	assert(H.root.attrs['AddonSettings:tab'] === 'improved_quickbuy', 'window: selected tab remembered');
});

// ===== 18. v10: every language Deadlock ships, complete, and fitting CompLock's 400 px menu =====
{
	const table = name => { const m = new RegExp('const ' + name + ' = \\{').exec(SRC); const i = m.index + m[0].length - 1; let d = 0, j = i; for (; j < SRC.length; j++) { if (SRC[j] === '{') d++; else if (SRC[j] === '}' && --d === 0) break; } return (0, eval)('(' + SRC.slice(i, j + 1) + ')'); };
	const STR = table('STRINGS'), WRD = table('WORDS');
	const SHIPPED = ['english', 'german', 'brazilian', 'czech', 'french', 'italian', 'indonesian', 'japanese', 'koreana', 'latam', 'polish', 'russian', 'schinese', 'spanish', 'thai', 'turkish', 'ukrainian', 'tchinese'];
	const keysOf = o => Object.keys(o).sort().join(',');
	SHIPPED.forEach(l => {
		assert(STR[l] && keysOf(STR[l]) === keysOf(STR.english), 'IQB strings: ' + l + ' has every key');
		assert(WRD[l] && keysOf(WRD[l]) === keysOf(WRD.english), 'library words: ' + l + ' has every key');
		assert(Object.values(STR[l]).concat(Object.values(WRD[l])).every(v => typeof v === 'string' && v.trim() && !/[#]/.test(v)), l + ': no empty text, no stray #');
		['Iqb_TotalToGo'].forEach(k => assert(STR[l][k].includes('{0}') && STR[l][k].includes('{1}'), l + ': ' + k + ' keeps {0} and {1}'));
		assert(STR[l].Iqb_TotalReady.includes('{0}') && WRD[l].AddonSettings_NotLoaded.includes('{0}') && WRD[l].AddonSettings_NotSaved.includes('{0}'), l + ': placeholders kept');
	});
	assert(keysOf(STR) === keysOf(Object.fromEntries(SHIPPED.map(l => [l, 1]))), 'IQB ships exactly these languages: ' + keysOf(STR));
	// text width, estimated per script (CompLock's dock theme: panel 400 px, tab bar padding 20 px, tab padding
	// 14 px, tab labels 14 px uppercase with 2 px letter spacing; slider titles 96 px at 15 px)
	const wide = c => /[\u1100-\u11ff\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(c);
	const width = (t, px, upper, spacing) => [...t].reduce((w, c) => w + (wide(c) ? px : /[\u0e00-\u0e7f]/.test(c) ? (/[\u0e31\u0e34-\u0e3a\u0e47-\u0e4e]/.test(c) ? 0 : 0.55 * px) : (upper ? 0.74 : 0.58) * px) + (spacing || 0), 0);
	const tabW = t => width(t.toUpperCase(), 14, true, 2) + 28;
	const room = 400 - 40 - tabW('HUD') - tabW('CROSSHAIR');
	SHIPPED.forEach(l => {
		assert(tabW(STR[l].Iqb_Tab) <= room, l + ': tab "' + STR[l].Iqb_Tab + '" fits the tab bar (' + Math.round(tabW(STR[l].Iqb_Tab)) + ' <= ' + Math.round(room) + ' px)');
		const words = STR[l].Iqb_ItemsShown.split(' ').flatMap(w => ([...w].some(wide) ? [...w] : [w])); // CJK breaks between any two characters
		assert(words.every(w => width(w, 15) <= 96) && width(STR[l].Iqb_ItemsShown, 15) <= 2 * 96, l + ': slider title "' + STR[l].Iqb_ItemsShown + '" fits 96 px in two lines at most');
		assert(width(WRD[l].AddonSettings_ResetTab.toUpperCase(), 14, true, 1) + 28 <= 230, l + ': default Reset tab button (' + Math.round(width(WRD[l].AddonSettings_ResetTab.toUpperCase(), 14, true, 1) + 28) + ' px) leaves room for the status line');
		// Iqb_Reset is longer (e.g. "Reset Quickbuy", "Quickbuy zurücksetzen"); the button is HUD++ .HudppTextButton (168 px, text-overflow: shrink).
		assert(width(STR[l].Iqb_TotalToGo.replace('{0}', '99,999').replace('{1}', '99,999'), 16) <= 300, l + ': shop total fits the queue header: ' + STR[l].Iqb_TotalToGo);
		[STR[l].Iqb_ShowMissing, STR[l].Iqb_RunningTotals, STR[l].Iqb_QueueTotal, STR[l].Iqb_Enable].forEach(t => assert(width(t, 19) <= 2 * 250, l + ': row title "' + t + '" in two lines at most'));
	});
	// in game, per language: our tab, rows, foot and shop total in that language
	SHIPPED.forEach(l => withLang(() => { $.Language = () => l; }, () => {
		for (const k in storage) delete storage[k];
		start(); openQuickbuy();
		const w = words(byId('IqbBody')), f = words(byId('IqbFoot'));
		assert(byId('IqbTab').kids[0]._text === STR[l].Iqb_Tab && w.includes(STR[l].Iqb_ShowMissing) && w.includes(STR[l].Iqb_Shop) && f.includes(STR[l].Iqb_Reset) && !f.includes(WRD[l].AddonSettings_ResetTab), l + ': menu in ' + l);
		H.globalClass('gShopOpen', true); advance(0.3);
		const reTotal = s => new RegExp('^' + s.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace('{0}', '[\\d,]+').replace('{1}', '[\\d,]+') + '$');
		assert(reTotal(STR[l].Iqb_TotalToGo).test(total()) || reTotal(STR[l].Iqb_TotalReady).test(total()), l + ': shop total: ' + total());
		H.globalClass('gShopOpen', false); advance(0.3);
		assert(S.errors.length === 0, l + ': no errors');
	}));
	// Valve's own words for the game terms (resource/localization/citadel_*): Souls per language
	const SOULS = { german: 'Seelen', french: 'âmes', spanish: 'almas', latam: 'almas', brazilian: 'almas', italian: 'anime', polish: 'dusz', czech: 'duš', russian: 'душ', ukrainian: 'душ', turkish: 'ruh', indonesian: 'jiwa', thai: 'โซลส์', japanese: 'ソウル', koreana: '영혼', schinese: '魂魄', tchinese: '魂魄' };
	Object.keys(SOULS).forEach(l => assert(STR[l].Iqb_ShowMissing.toLowerCase().includes(SOULS[l].toLowerCase()) || STR[l].Iqb_ShowMissing_Desc.toLowerCase().includes(SOULS[l].toLowerCase()), l + ': Valve\'s word for Souls (' + SOULS[l] + ')'));
}

console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
