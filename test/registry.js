// Stand-in tests for Addon Settings with more than one addon: node test/registry.js
// Each S.load runs one addon's script in its own scope, the way the game runs each layout's scripts.
'use strict';
const fs = require('fs');
const S = require('./panorama.js');
const { H, advance, buildHud, storage, net } = S;
const IQB = fs.readFileSync(process.argv[2] || __dirname + '/../build/pak/panorama/scripts/improved_quickbuy.js', 'utf8');
const HELLO = fs.readFileSync(__dirname + '/../examples/hello-addon/build/pak/panorama/scripts/hello_addon.js', 'utf8');
const BUILD = Number(/const BUILD = (\d+);/.exec(IQB)[1]);
const newer = src => src.replace('const BUILD = ' + BUILD + ';', 'const BUILD = ' + (BUILD + 1) + ';');
const LIB = fs.readFileSync(__dirname + '/../lib/addon-settings/addon_settings.js', 'utf8');
const LOCK = '(() => {\n' + LIB + '\nAddonSettings.register({ id: \'lock_fix\', title: \'LockFix\', prefix: \'LockFix\', placement: \'complock\', controls: [{ key: \'on\', type: \'toggle\', title: \'On\', default: true }] }, () => {});\n})();';
const openAddons = () => { click('AddonSettingsButton'); advance(0.1); };
let fails = 0, passes = 0;
const assert = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL', m); } if (process.env.V) console.log(c ? 'ok  ' : 'FAIL', m); };
const byId = id => { const w = p => { for (const k of p.kids) { if (k.id === id) return k; const r = w(k); if (r) return r; } return null; }; return w(H.root); };
const count = id => { let n = 0; const w = p => p.kids.forEach(k => { if (k.id === id) n++; w(k); }); w(H.root); return n; };
const click = id => byId(id).events.onactivate();
const words = p => { const out = []; const w = q => q.kids.forEach(k => { if (k.type === 'Label') out.push(k._text); w(k); }); if (p) w(p); return out; };
const clear = () => { for (const k in storage) delete storage[k]; net.writes.length = 0; };
const hostBuild = () => byId('AddonSettingsHost').attrs.build;
const helloValues = () => JSON.parse(H.ctx.attrs.hello_values || 'null');
const openMenu = () => { H.menuButton.events.onactivate(); advance(0.3); };
const errorsOk = what => assert(S.errors.length === 0, what + ': no errors: ' + S.errors.join(' | '));

clear();
buildHud('vanilla'); S.load(IQB); S.load(HELLO); advance(2);
errorsOk('IQB + Hello');
assert(count('AddonSettingsHost') === 1 && hostBuild() === String(BUILD), 'one host for two addons');
assert(byId('AddonSettingsClient_improved_quickbuy') && byId('AddonSettingsClient_hello_addon'), 'one client panel per addon under the host');
assert(byId('AddonSettingsButton'), 'ADDONS button is there with HUD++ installed');
openMenu();
assert(!byId('IqbTab') && !byId('HelloTab') && H.menu.FindChildrenWithClassTraverse('HudppTab').length === 3, 'CompLock keeps only HUD, Minimap, Crosshair');
openAddons();
assert(byId('IqbBlock') && byId('HelloBlock') && byId('IqbBlock').parent.id === 'AddonSettingsBodies' && !byId('AddonSettingsTabs'), 'ADDONS: both addons listed in one window, no tab bar');
assert(byId('IqbBody') && byId('HelloBody') && byId('IqbBody').applied.visibility === 'visible' && byId('HelloBody').applied.visibility === 'visible', 'first open shows every addon\'s settings (masters on)');
assert(byId('IqbMaster') && byId('HelloMaster') && !byId('IqbRow_on') && !byId('HelloRow_enabled'), 'each addon with a toggle field has a header switch, not a duplicate row');
click('HelloMaster'); advance(1.5);
assert(helloValues().enabled === false, 'Hello gets its change through onChange');
assert(byId('HelloBody').applied.visibility === 'collapse', 'master off hides that addon\'s settings');
assert(byId('IqbBody').applied.visibility === 'visible', 'turning Hello off does not hide Quickbuy');
assert(JSON.parse(storage.hello_addon_settings).enabled === false && !('improved_quickbuy_settings' in storage), 'namespaced: Hello saves under hello_addon_settings only');
click('HelloMaster'); advance(0.1);
assert(byId('HelloBody').applied.visibility === 'visible', 'master on shows Hello settings again');
click('HelloSizeUp'); click('HelloSizeUp'); click('HelloSizeUp'); net.writes.length = 0; advance(1.5);
assert(net.writes.length === 1 && JSON.parse(storage.hello_addon_settings).size === 26, 'debounce: three clicks, one write: ' + net.writes.length);
click('HelloCornerNext'); advance(1.5);
assert(helloValues().corner === 'top-right' && words(byId('HelloBody')).includes('Top right') && byId('HelloCornerChoice_topright').cls.has('HudppSelected'), 'select steps, shows its label, and marks the choice chip');
click('HelloReset'); advance(1.5);
assert(helloValues().enabled === true && helloValues().size === 20 && helloValues().corner === 'top-left', 'Hello Reset: Hello\'s defaults');
{ byId('HelloHead').events.onmouseover(); byId('HelloReset').events.onmouseover(); assert(byId('HelloReset').cls.has('HudppUndo') && S.tip && S.tip.text === 'Undo', 'Reset turns into Undo'); }

clear();
buildHud('vanilla'); S.load(HELLO); S.load(IQB); advance(2);
errorsOk('Hello first');
assert(count('AddonSettingsHost') === 1, 'Hello first: still one host');
buildHud('vanilla'); S.load(IQB); advance(5); S.load(HELLO); advance(1);
openAddons();
assert(byId('HelloBlock') && byId('IqbBlock') && byId('AddonSettingsBodies').kids.indexOf(byId('IqbBlock')) < byId('AddonSettingsBodies').kids.indexOf(byId('HelloBlock')), 'late registration: its block is appended to the list');

clear();
storage.hello_addon_settings = JSON.stringify({ t: 1, enabled: false, size: 99, corner: 'nowhere', junk: 1 });
buildHud('vanilla'); S.load(HELLO); advance(3);
assert(helloValues().enabled === false && helloValues().size === 40 && helloValues().corner === 'top-left' && !('junk' in helloValues()), 'saved values: kept, clamped, unknown option and keys dropped: ' + JSON.stringify(helloValues()));

clear();
buildHud('vanilla'); S.load(IQB); advance(2); openMenu(); openMenu();
S.load(newer(HELLO)); advance(2);
errorsOk('build 2 takes over');
assert(hostBuild() === String(BUILD + 1) && count('AddonSettingsHost') === 1, 'highest build hosts: ' + hostBuild());
assert(!byId('IqbBlock'), 'the old host\'s entries are gone');
openAddons();
assert(byId('IqbBlock') && byId('HelloBlock') && count('IqbBlock') === 1, 'the new host shows both addons, once');
click('IqbRow_hud'); advance(1.5);
assert(JSON.parse(storage.improved_quickbuy_settings).hud === false, 'IQB\'s change goes through the new host');
S.load(IQB); advance(2); // an older copy loading later only registers
assert(hostBuild() === String(BUILD + 1) && count('AddonSettingsHost') === 1, 'an older copy later does not take over');

clear();
buildHud('vanilla'); H.menuButton.parent.DeleteAsync(); S.load(IQB); S.load(HELLO); advance(2);
errorsOk('window');
assert(count('AddonSettingsButton') === 1 && !byId('IqbBlock'), 'one ADDONS button, no list before the first open');
click('AddonSettingsButton'); advance(0.1);
assert(byId('IqbBlock') && byId('HelloBlock') && byId('IqbBody') && byId('HelloBody'), 'first open: both addons listed and built');
click('AddonSettingsClose'); advance(0.1);
buildHud('vanilla'); H.menuButton.parent.DeleteAsync(); S.load(IQB); S.load(HELLO); advance(2);
click('AddonSettingsButton'); advance(0.1);
assert(byId('IqbBody') && byId('HelloBody'), 'reopened after a HUD reload: both addons listed again');

$.Language = () => 'german';
clear();
buildHud('vanilla'); S.load(IQB); S.load(HELLO); advance(2); openAddons();
{ byId('HelloHead').events.onmouseover(); byId('HelloReset').events.onmouseover(); assert(words(byId('HelloHead')).includes('Hello') && words(byId('HelloBody')).includes('Textgrösse') && S.tip && S.tip.text === 'Tab zurücksetzen', 'German: Hello\'s rows from its table, plain texts as they are, host words in German'); }
delete $.Language;


clear();
buildHud('vanilla'); S.load(IQB); S.load(LOCK); advance(2);
errorsOk('IQB + LockFix');
openMenu();
assert(byId('LockFixTab') && byId('LockFixTab').parent.cls.has('HudppTabs') && !byId('LockFixBlock'), 'placement complock: tab sits in CompLock\'s bar, not in the ADDONS list');
assert(!byId('IqbTab'), 'Quickbuy stays out of CompLock');
assert(H.menu.FindChildrenWithClassTraverse('HudppTab').length === 4, 'CompLock bar has the three HUD++ tabs plus LockFix');
assert(!byId('LockFixBody'), 'complock tab body is not built until the tab is clicked');
click('LockFixTab'); advance(0.1);
assert(byId('LockFixBody') && byId('LockFixFoot').applied.visibility === 'visible' && H.foot.applied.visibility === 'collapse' && byId('LockFixTab').cls.has('HudppSelected') && !H.tabs.hud.cls.has('HudppSelected'), 'LockFix tab: our body and foot shown, HUD++ foot hidden');
H.tabs.mm.events.onactivate(); advance(0.06);
assert(!byId('LockFixTab').cls.has('HudppSelected') && H.foot.applied.visibility === 'visible', 'LockFix -> Minimap');
click('LockFixTab'); advance(0.06);
H.tabs.xh.events.onactivate(); advance(0.06);
assert(H.xhBody && H.xhBody.applied.visibility !== 'collapse' && !byId('LockFixTab').cls.has('HudppSelected') && H.foot.applied.visibility === 'visible', 'LockFix -> Crosshair');
click('LockFixTab'); advance(0.06);
assert(byId('LockFixTab').cls.has('HudppSelected') && byId('LockFixTab').kids[0]._text === 'LockFix', 'Crosshair -> LockFix; tab title stays LockFix');
H.tabs.xh.events.onactivate(); advance(0.06);
assert(!byId('LockFixTab').cls.has('HudppSelected') && H.foot.applied.visibility === 'visible', 'LockFix after Crosshair -> Crosshair again: Crosshair shows');
H.tabs.hud.events.onactivate(); advance(0.06);
click('LockFixTab'); advance(0.06);
H.tabs.hud.events.onactivate(); advance(0.06);
assert(!byId('LockFixTab').cls.has('HudppSelected'), 'LockFix after HUD -> HUD again');
assert(!S.handlers.some(h => h.ev === 'Activated' && h.p && [H.tabs.hud, H.tabs.mm, H.tabs.xh].includes(h.p)), 'no Activated hook left on HUD++ tabs after leaving ours');
for (let i = 0; i < 5; i++) { click('LockFixTab'); advance(0.1); H.tabs[i % 2 ? 'hud' : 'xh'].events.onactivate(); advance(0.1); }
assert(!byId('LockFixTab').cls.has('HudppSelected'), 'repeated switching leaves a HUD++ tab selected');
// fallback: without HUD++, placement complock joins ADDONS
clear();
buildHud('vanilla'); H.menuButton.parent.DeleteAsync(); S.load(LOCK); advance(2);
openAddons();
assert(byId('LockFixBlock') && byId('LockFixBlock').parent.id === 'AddonSettingsBodies' && byId('LockFixBody'), 'no HUD++: complock placement falls back to the ADDONS list');

const LEGACY = '(() => {\n' + LIB + '\nAddonSettings.register({ id: \'legacy_mod\', title: \'Legacy\', prefix: \'Legacy\', controls: [{ key: \'on\', type: \'toggle\', title: \'On\', default: true }] }, () => {});\n})();';
clear();
buildHud('vanilla'); S.load(IQB); advance(2);
openAddons();
assert(byId('IqbBlock') && !byId('HelloBlock') && !byId('LegacyBlock'), 'ADDONS open with only IQB so far');
S.load(HELLO); advance(1);
assert(byId('HelloBlock') && byId('HelloBlock').parent.id === 'AddonSettingsBodies' && byId('AddonSettingsBodies').kids.indexOf(byId('IqbBlock')) < byId('AddonSettingsBodies').kids.indexOf(byId('HelloBlock')), 'late registration while ADDONS is open: block is appended, no reopen needed');
S.load(LEGACY); advance(1);
assert(byId('LegacyBlock') && byId('LegacyBlock').parent.id === 'AddonSettingsBodies', 'legacy register without placement lands in ADDONS after the host is built');
assert(byId('LegacyMaster') && !byId('LegacyRow_on') && byId('LegacyBody').applied.visibility === 'collapse', 'legacy promotion: first on-toggle becomes the header master, the row is hidden, and the empty body takes no room');
assert(!(byId('LegacyBody').FindChildrenWithClassTraverse('HudppSectionTitle') || []).some(l => l._text === 'Legacy'), 'no section title that repeats the addon name');
assert(!byId('LegacyReset'), 'on-off-only addon has no Reset');
assert(!byId('LegacyAuthor'), 'no author on the legacy schema: no credit');
assert(byId('IqbMaster') && byId('IqbReset') && byId('IqbReset').applied.visibility === 'collapse', 'IQB has settings beyond the master, so it has a Reset, hidden until hover');
{ byId('IqbHead').events.onmouseover(); assert(byId('IqbReset').applied.visibility === 'visible', 'IQB reset appears on header hover'); byId('IqbHead').events.onmouseout(); advance(0); assert(byId('IqbReset').applied.visibility === 'collapse', 'IQB reset hides again after leave'); }
assert(byId('HelloReset') && byId('HelloReset').applied.visibility === 'collapse', 'Hello has extra settings, so it has a Reset, also hidden until hover');
assert(!S.errors.some(e => /read only property 'id'|window: TypeError/.test(e)), 'legacy + IQB mount does not assign panel.id');
assert(S.info.some(m => /Esc menu: found looks=/.test(m)), 'Esc lookup logs the result and the look count');

console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
