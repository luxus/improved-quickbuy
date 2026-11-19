// Stand-in tests for Addon Settings with more than one addon: node test/registry.js
// Each S.load runs one addon's script in its own scope, the way the game runs each layout's scripts.
'use strict';
const fs = require('fs');
const S = require('./panorama.js');
const { H, advance, buildHud, storage, net } = S;
const IQB = fs.readFileSync(__dirname + '/../build/pak/panorama/scripts/improved_quickbuy.js', 'utf8');
const HELLO = fs.readFileSync(__dirname + '/../examples/hello-addon/build/pak/panorama/scripts/hello_addon.js', 'utf8');
const BUILD = Number(/const BUILD = (\d+);/.exec(IQB)[1]);
const newer = src => src.replace('const BUILD = ' + BUILD + ';', 'const BUILD = ' + (BUILD + 1) + ';');
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

// ===== two addons, CompLock: one host, one tab each, own keys =====
clear();
buildHud('vanilla'); S.load(IQB); S.load(HELLO); advance(2);
errorsOk('IQB + Hello');
assert(count('AddonSettingsHost') === 1 && hostBuild() === String(BUILD), 'one host for two addons');
assert(byId('AddonSettingsClient_improved_quickbuy') && byId('AddonSettingsClient_hello_addon'), 'one client panel per addon under the host');
openMenu();
assert(byId('IqbTab') && byId('HelloTab'), 'CompLock: a tab per addon');
click('HelloTab'); advance(0.1);
assert(byId('HelloBody') && !byId('IqbBody'), 'only the clicked addon\'s body is built');
click('HelloRow_enabled'); advance(1.5);
assert(helloValues().enabled === false, 'Hello gets its change through onChange');
assert(JSON.parse(storage.hello_addon_settings).enabled === false && !('improved_quickbuy_settings' in storage), 'namespaced: Hello saves under hello_addon_settings only');
click('HelloSizeUp'); click('HelloSizeUp'); click('HelloSizeUp'); net.writes.length = 0; advance(1.5);
assert(net.writes.length === 1 && JSON.parse(storage.hello_addon_settings).size === 26, 'debounce: three clicks, one write: ' + net.writes.length);
click('HelloCornerNext'); advance(1.5);
assert(helloValues().corner === 'top-right' && words(byId('HelloBody')).includes('Top right'), 'select steps and shows its label');
click('HelloReset'); advance(1.5);
assert(helloValues().enabled === true && helloValues().size === 20 && helloValues().corner === 'top-left', 'Hello Reset tab: Hello\'s defaults');
click('IqbTab'); advance(0.1);
assert(byId('IqbBody').applied.visibility === 'visible' && byId('HelloBody').applied.visibility === 'collapse' && byId('IqbFoot').applied.visibility === 'visible' && byId('HelloFoot').applied.visibility === 'collapse', 'switching between our tabs: one body and foot at a time');

// ===== load order: Hello before IQB, and Hello registering long after the host is up =====
clear();
buildHud('vanilla'); S.load(HELLO); S.load(IQB); advance(2);
errorsOk('Hello first');
assert(count('AddonSettingsHost') === 1, 'Hello first: still one host');
buildHud('vanilla'); S.load(IQB); advance(5); S.load(HELLO); advance(1);
openMenu();
assert(byId('HelloTab') && byId('IqbTab'), 'late registration: its tab shows on the next open');

// ===== stored values: defaults, then the saved ones, bad ones fixed =====
clear();
storage.hello_addon_settings = JSON.stringify({ t: 1, enabled: false, size: 99, corner: 'nowhere', junk: 1 });
buildHud('vanilla'); S.load(HELLO); advance(3);
assert(helloValues().enabled === false && helloValues().size === 40 && helloValues().corner === 'top-left' && !('junk' in helloValues()), 'saved values: kept, clamped, unknown option and keys dropped: ' + JSON.stringify(helloValues()));

// ===== a newer copy takes over =====
clear();
buildHud('vanilla'); S.load(IQB); advance(2); openMenu(); openMenu();
S.load(newer(HELLO)); advance(2);
errorsOk('build 2 takes over');
assert(hostBuild() === String(BUILD + 1) && count('AddonSettingsHost') === 1, 'highest build hosts: ' + hostBuild());
assert(!byId('IqbTab'), 'the old host\'s entries are gone');
openMenu();
assert(byId('IqbTab') && byId('HelloTab') && count('IqbTab') === 1, 'the new host shows both addons, once');
click('IqbTab'); advance(0.1); click('IqbRow_hud'); advance(1.5);
assert(JSON.parse(storage.improved_quickbuy_settings).hud === false, 'IQB\'s change goes through the new host');
S.load(IQB); advance(2); // an older copy loading later only registers
assert(hostBuild() === String(BUILD + 1) && count('AddonSettingsHost') === 1, 'an older copy later does not take over');

// ===== window (no HUD++): one ADDONS button, last tab remembered =====
clear();
buildHud('vanilla'); H.menuButton.parent.DeleteAsync(); S.load(IQB); S.load(HELLO); advance(2);
errorsOk('window');
assert(count('AddonSettingsButton') === 1 && byId('AddonSettingsNav_improved_quickbuy') === null, 'one ADDONS button, no sidebar before the first open');
click('AddonSettingsButton'); advance(0.1);
assert(byId('AddonSettingsNav_improved_quickbuy') && byId('AddonSettingsNav_hello_addon') && byId('IqbBody') && !byId('HelloBody'), 'first open: a sidebar entry per addon, the first page only');
click('AddonSettingsNav_hello_addon'); advance(0.1);
assert(byId('HelloBody').applied.visibility === 'visible' && byId('IqbBody').applied.visibility === 'collapse', 'sidebar switches pages');
click('AddonSettingsClose'); advance(0.1);
// a HUD reload in the same game: the window opens on the last tab
const tab = H.root.attrs['AddonSettings:tab'];
buildHud('vanilla'); H.menuButton.parent.DeleteAsync(); H.root.attrs['AddonSettings:tab'] = tab; S.load(IQB); S.load(HELLO); advance(2);
click('AddonSettingsButton'); advance(0.1);
assert(byId('HelloBody') && byId('HelloBody').applied.visibility === 'visible' && !byId('IqbBody'), 'reopened after a HUD reload: last tab (Hello) shown, the other page not built');

// ===== languages: each addon's table, the host's words =====
$.Language = () => 'german';
clear();
buildHud('vanilla'); S.load(IQB); S.load(HELLO); advance(2); openMenu(); click('HelloTab'); advance(0.1);
assert(words(byId('HelloBody')).includes('Textgrösse') && words(byId('HelloBody')).includes('Hello') && words(byId('HelloFoot')).includes('Tab zurücksetzen'), 'German: Hello\'s rows from its table, plain texts as they are, host words in German');
delete $.Language;

console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
