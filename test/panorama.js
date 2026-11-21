// Panorama stand-in: panels, a virtual clock, the HUD tree around the quickbuy panel, HUD++'s menu and
// deadlockconfig.com's store page, all as far as we know them. Counts every call that costs something.
// Not the game: numbers from here are stand-in numbers.
'use strict';

const C = { sched: 0, finds: 0, nodes: 0, childReads: 0, reads: 0, classWrites: 0, classChanges: 0, textWrites: 0, textChanges: 0, images: 0, styleWrites: 0, created: 0 };
const resetCounts = () => Object.keys(C).forEach(k => { C[k] = 0; });

let now = 0, seq = 0, jobs = [], handlers = [], errors = [], info = [];
// the script's one-time status lines (load, first update, strip shown); anything else it logs is an error
const INFO = /^(Improved Quickbuy: ((?:v\d+|\d+\.\d+\.\d+) loaded|first update: |HUD row built )|Addon Settings: (build \d+ hosts|no Esc menu ))/;
const storage = {};
const net = { online: true, writes: [] };

class P {
	constructor(type, parent, id) {
		this.type = type; this.id = id || ''; this.cls = new Set(); this.kids = []; this.attrs = {}; this.parent = null; this.valid = true; this.events = {}; this._text = ''; this.applied = {};
		const self = this;
		this.style = new Proxy({}, { set(o, k, v) { C.styleWrites++; o[k] = v; if (v !== null && v !== undefined) self.applied[k] = v; return true; } });
		if (parent) { parent.kids.push(this); this.parent = parent; }
	}
	get text() { C.reads++; return this._text; }
	set text(v) { C.textWrites++; if (this._text !== v) C.textChanges++; this._text = v; }
	IsValid() { C.reads++; return this.valid; }
	GetParent() { return this.parent; }
	AddClass(c) { this.SetHasClass(c, true); }
	RemoveClass(c) { this.SetHasClass(c, false); }
	// Panorama: an inline style set applies at once; a cleared one (null) only at the next restyle (class change)
	SetHasClass(c, on) { C.classWrites++; if (this.cls.has(c) === !!on) return; C.classChanges++; on ? this.cls.add(c) : this.cls.delete(c); restyle(this); }
	BHasClass(c) { C.reads++; return this.cls.has(c); }
	SetPanelEvent(e, f) { this.events[e] = f; }
	SetAttributeString(k, v) { this.attrs[k] = v; }
	GetAttributeString(k, d) { return k in this.attrs ? this.attrs[k] : d; }
	FindChild(id) { C.childReads++; return this.kids.find(k => k.id === id) || null; }
	FindChildTraverse(id) { C.finds++; const walk = p => { for (const k of p.kids) { C.nodes++; if (k.id === id) return k; const r = walk(k); if (r) return r; } return null; }; return walk(this); }
	FindChildrenWithClassTraverse(c) { C.finds++; const out = []; const walk = p => p.kids.forEach(k => { C.nodes++; if (k.cls.has(c)) out.push(k); walk(k); }); walk(this); return out; }
	GetChildCount() { C.childReads++; return this.kids.length; }
	GetChild(i) { C.childReads++; return this.kids[i] || null; }
	MoveChildBefore(c, b) { this.kids.splice(this.kids.indexOf(c), 1); this.kids.splice(this.kids.indexOf(b), 0, c); }
	DeleteAsync() { this.valid = false; if (this.parent) this.parent.kids.splice(this.parent.kids.indexOf(this), 1); }
	Activate() { $.DispatchEvent('Activated', this); }
	SetImage(src) { C.images++; this.img = src; }
	SetURL(url) { // CitadelHTMLPanel showing store.html
		const title = t => $.Schedule(0.05, () => handlers.filter(h => h.p === this && h.ev === 'HTMLTitle').forEach(h => h.f(this, t)));
		const hash = url.split('#')[1];
		if (!net.online) return;
		if (!hash) { title('HUDPP_READY:1'); return; }
		const m = JSON.parse(decodeURIComponent(hash)); const r = { id: m.id };
		if (m.op === 'get') r.value = m.key in storage ? storage[m.key] : null;
		else if (m.op === 'set') { storage[m.key] = String(m.value); r.value = String(m.value); net.writes.push(m.key); }
		title('HUDPP:' + JSON.stringify(r));
	}
}
const restyle = p => { Object.keys(p.style).forEach(k => { const v = p.style[k]; if (v === null || v === undefined) delete p.applied[k]; }); p.kids.forEach(restyle); };

global.$ = {
	GetContextPanel: () => H.ctx,
	CreatePanel: (t, parent, id, props) => {
		C.created++;
		const x = new P(t, parent, id);
		if (props && props.class) props.class.split(' ').filter(Boolean).forEach(c => x.cls.add(c));
		if (t === 'Slider') {
			new P('Panel', x, 'SliderTrack'); new P('Button', x, 'SliderThumb');
			let v = 0;
			Object.defineProperty(x, 'value', { get: () => v, set: n => { v = Math.max(0, Math.min(1, Number(n))); handlers.filter(h => h.p === x && h.ev === 'SliderValueChanged').forEach(h => h.f(x)); } });
		}
		return x;
	},
	Schedule: (t, f) => { C.sched++; const j = { due: now + Math.max(0, t), f, id: ++seq }; jobs.push(j); return j.id; },
	CancelScheduled: id => { jobs = jobs.filter(j => j.id !== id); },
	DispatchEvent(ev, p) { C.dispatches = (C.dispatches || 0) + 1; if (ev === 'Activated' && p && p.valid && p.events.onactivate) p.events.onactivate(); }, Localize: s => s, Msg: m => { (INFO.test(m) ? info : errors).push('msg: ' + m); },
	RegisterForUnhandledEvent: (ev, f) => handlers.push({ ev, p: null, f }),
	RegisterEventHandler: (ev, p, f) => { const id = ++seq; handlers.push({ ev, p, f, id }); return id; },
	UnregisterEventHandler: (ev, p, id) => { handlers = handlers.filter(h => h.id !== id); }
};

const advance = secs => {
	const end = now + secs;
	for (;;) {
		jobs.sort((a, b) => a.due - b.due || a.id - b.id);
		const j = jobs[0];
		if (!j || j.due > end) break;
		jobs.shift(); now = j.due;
		try { j.f(); } catch (e) { errors.push(String(e && e.stack || e).slice(0, 300)); }
	}
	now = end;
};

const mk = (t, parent, id, cls, text) => { const x = new P(t, parent, id); (cls || '').split(' ').filter(Boolean).forEach(c => x.cls.add(c)); if (text !== undefined) x._text = text; return x; };
const filler = (parent, n, tag) => { for (let i = 0; i < n; i++) { const a = mk('Panel', parent, tag + i); mk('Label', a, ''); mk('Image', a, ''); } };

// a Valve CitadelHudQuickbuyEntry as its layout builds it (hud_quickbuy_entry.xml, citadel_shop_mod_icon.xml)
const entry = (parent, name, cost, extra) => {
	const e = mk('Panel', parent, '', 'QuickbuyItem');
	const content = mk('Panel', e, 'ItemContentPanel');
	const icon = mk('Panel', content, 'ModIcon');
	const box = mk('Panel', mk('Panel', icon, 'modIconContainer'), 'mod_icon_background');
	mk('Panel', box, 'mod_icon'); mk('Image', box, 'ModIconImage');
	mk('Panel', mk('Panel', icon, 'TierContainer'), 'mod_tier_label');
	['ItemHidden', 'ActiveTagContainer', 'Enhanced', 'Corrupted', 'CooldownMask', 'UpgradeLevelContainer'].forEach(id => mk('Panel', icon, id));
	const names = mk('Panel', content, '', 'NamePanel');
	const status = mk('Panel', names, '', 'QuickbuyStatus'); mk('Label', status, 'QuickbuyLabel'); mk('Label', status, '', 'QuickbuyLabelQueueSize');
	mk('Label', names, 'ModName', '', name);
	const costs = mk('Panel', names, '', 'CostPanel');
	mk('Image', costs, '', 'goldIcon'); mk('Label', costs, 'ModCost', '', cost);
	if (extra) extra(costs, e);
	mk('Label', costs, 'ExceedItemSlotLabel'); mk('Label', costs, 'SellItemSlotLabel');
	const ctl = mk('Panel', e, 'ControlIcons'); mk('Panel', ctl, 'ReorderButton'); mk('Panel', ctl, 'DeleteButton');
	return e;
};

const H = {};
// layout: 'vanilla' (Valve's hud_quickbuy.xml, Improved Quickbuy) or 'v7' (the old mod's layout additions)
const buildHud = (layout, queueItems) => {
	jobs = []; handlers = []; errors = []; info = [];
	H.layout = layout;
	const root = H.root = mk('Panel', null, 'CitadelHud');
	filler(root, 120, 'TopBar');
	const shell = mk('Panel', root, '');
	const low = mk('Panel', shell, 'HudppRateSrc_low', 'HudppRateSrc');
	mk('Panel', low, 'DataFeed');
	const stats = H.stats = mk('Panel', low, 'StatsAndModsContainer', 'clamp_width');
	const lowerLeft = mk('Panel', stats, 'LowerLeft');
	filler(mk('Panel', lowerLeft, 'hudPlayerStats'), 30, 'Stat');
	const gold = mk('Panel', lowerLeft, 'gold_and_ap_container');
	filler(mk('Panel', gold, 'PlayerLevelContainer'), 3, 'Lvl');
	const goldRow = mk('Panel', gold, 'hudGoldContainer');
	const cur = mk('Panel', goldRow, 'CurrentGoldAmount');
	mk('Panel', cur, 'hudCurGoldIcon'); mk('Image', cur, 'hudGoldInfinite');
	H.souls = mk('Label', cur, 'hudCurGoldLabel', 'CurrencyLabel', '1,000');
	mk('Label', cur, 'hudGoldLabel');
	const itemGold = mk('Panel', goldRow, '', 'hudItemGoldContainer'); mk('Label', itemGold, 'hudCurGoldLabel', '', '9,999');
	filler(mk('Panel', lowerLeft, 'ModsContainer'), 40, 'Mod');
	const ctx = H.ctx = mk('Panel', lowerLeft, 'CitadelHudQuickbuy', 'HudQuickbuy ShowMiniQuickbuy');
	mk('Panel', ctx, '');
	filler(mk('Panel', ctx, '', 'EmptyContents HudQuickbuyElement'), 3, 'Empty');
	const mini = mk('Panel', ctx, 'HudMini', 'HudQuickbuyElement');
	mk('Panel', mini, 'HudMiniFill'); filler(mk('Panel', mini, '', 'ItemsBlockedReason'), 2, 'Blk');
	const miniC = mk('Panel', mini, 'HudMiniContents');
	H.next = entry(miniC, 'Extra Health', '800'); H.next.id = 'QuickbuyNext';
	filler(mk('Panel', ctx, 'KeyboardHints'), 4, 'Hint');
	if (layout === 'v7') {
		const ns = mk('Panel', ctx, 'QuickbuyNextSoulsNeeded'); mk('Image', ns, ''); mk('Label', ns, 'QuickbuyNextSoulsNeededLabel');
		const pc = mk('Panel', ctx, 'QuickbuyUpcomingPreviewContainer');
		for (let n = 2; n <= 5; n++) {
			const s = mk('Panel', pc, 'QuickbuyUpcomingPreview' + n, 'QuickbuyUpcomingPreviewSlot');
			const sn = mk('Panel', s, '', 'QuickbuyUpcomingPreviewSoulsNeeded'); mk('Image', sn, ''); mk('Label', sn, `QuickbuyUpcomingPreview${n}SoulsNeededLabel`);
			entry(mk('Panel', s, '', 'QuickbuyUpcomingMini'), '', '').id = `QuickbuyPreview${n}Entry`;
		}
	}
	const qc = mk('Panel', ctx, 'QuickBuyQueueContainer');
	const outer = H.outer = mk('Panel', qc, '', 'QuickbuyQueueOuter');
	mk('Label', outer, '', 'BuildOrderLabel'); mk('Label', outer, '', 'InstructionalText');
	H.sell = mk('Panel', outer, 'QuickbuySellQueue');
	H.queue = mk('Panel', outer, 'QuickbuyQueue');
	filler(mk('Panel', outer, 'QueueActions'), 3, 'Act');
	mk('Label', outer, '', 'emptyQueueLabel');
	const sc = mk('Panel', ctx, '', 'QuickbuyShopSummaryContainer'); filler(mk('Panel', sc, 'QuickbuyShopSummary'), 4, 'Sum');
	if (layout === 'v7') { const t = mk('Panel', sc, 'QuickbuyShopTotalSummary'); mk('Label', t, 'QuickbuyShopTotalCostLabel'); }
	const ab = mk('Panel', low, 'AbilitiesContainer'); filler(ab, 60, 'Ab');
	filler(root, 200, 'Misc');
	H.setQueue(queueItems || [['Extra Health', '800'], ['Extra Stamina', '800'], ['Monster Rounds', '800'], ['Rapid Rounds', '1,600'], ['Mystic Burst', '1,600']]);
	// the escape menu layout; HUD++ adds its button there, and #HudppPanel on first open
	const esc = H.esc = mk('Panel', root, 'EscapeMenu');
	mk('Panel', esc, 'EscapeBackground');
	const sub = mk('Panel', mk('Panel', mk('Panel', esc, 'LeftStripe'), 'Menu'), 'SubOptions');
	filler(sub, 6, 'Opt');
	H.menuButton = mk('Button', mk('Panel', sub, '', 'HudppMenuRow'), 'HudppMenuButton', 'nav_menu_item minor');
	H.menuButton.events.onactivate = () => press(H.menuButton, () => (H.menu && H.menu.BHasClass('HudppOpen')) ? H.closeMenu() : H.openMenu());
	H.menu = null; H.tab = 'hud';
	return H;
};
H.setQueue = list => {
	H.queue.kids.slice().forEach(k => k.DeleteAsync());
	H.items = list.map(([n, c]) => entry(H.queue, n, c, H.layout === 'v7' ? costs => { mk('Label', costs, '', 'QueueRemainingSoulsDivider'); mk('Label', costs, 'QueueRemainingSoulsLabel'); } : null));
	H.ctx.cls[list.length ? 'delete' : 'add']('Empty'); // the game's own class, not counted
};
H.globalClass = (name, on) => {
	const host = name === 'gQuickbuyShopShowQueue' ? H.ctx : H.stats;
	host.cls[on ? 'add' : 'delete'](name);
	handlers.filter(h => h.ev === 'GlobalClassChanged').forEach(h => h.f(name, on ? 1 : 0));
};

// Panorama, as fitted to the old mod's v6 in game: a handler registered for 'Activated' on a button takes the
// click, and the button's XML onactivate (HUD++'s HudppMenuToggle, its tab handlers) no longer runs
const press = (b, xml) => { const hs = handlers.filter(h => h.p === b && h.ev === 'Activated'); if (hs.length) { hs.forEach(h => h.f(b)); return; } xml(); };

// HUD++'s menu as hudpp_menu.js builds and drives it. showTab returns at once when the requested
// tab is already the current one (if (t === tab) return), so a click on that tab does nothing
// unless something first changes HUD++'s tab variable.
H.refresh = () => {
	['hud', 'mm', 'xh'].forEach(t => { H.menu.SetHasClass('HudppTab_' + t, t === H.tab); H.tabs[t].SetHasClass('HudppSelected', t === H.tab); });
};
H.openMenu = () => {
	H.esc.cls.add('ShowEscapeMenu');
	if (!H.menu) {
		const m = H.menu = mk('Panel', H.esc, 'HudppPanel', 'HudppTheme_dockv2');
		filler(mk('Panel', m, '', 'HudppHead'), 4, 'Head');
		const bar = mk('Panel', m, '', 'HudppTabs');
		H.tabs = {};
		[['hud', 'HUD'], ['mm', 'Minimap'], ['xh', 'Crosshair']].forEach(([k, l]) => {
			const b = mk('Button', bar, '', 'HudppTab'); mk('Label', b, '', 'HudppTabLabel', l);
			b.events.onactivate = () => press(b, () => { if (H.tab === k) return; H.tab = k; H.refresh(); });
			H.tabs[k] = b;
		});
		H.hudBody = mk('Panel', m, '', 'HudppBody HudppBodyHud'); filler(H.hudBody, 20, 'HudRow');
		H.mmBody = mk('Panel', m, '', 'HudppBody HudppBodyMm'); filler(H.mmBody, 25, 'MmRow');
		H.xhBody = mk('Panel', m, '', 'HudppBody HudppBodyXh'); filler(H.xhBody, 30, 'XhRow');
		const foot = H.foot = mk('Panel', m, '', 'HudppFoot'); const main = mk('Panel', foot, '', 'HudppFootMain');
		mk('Label', main, '', 'HudppStatus'); H.reset = mk('Button', main, '', 'HudppTextButton HudppResetAll');
		H.tab = 'hud';
	}
	H.menu.AddClass('HudppOpen'); H.refresh();
};
H.closeMenu = () => { H.menu.RemoveClass('HudppOpen'); H.esc.cls.delete('ShowEscapeMenu'); };

// what the player sees: inline visibility (as applied), else HUD++'s tab rule as of the 20/21 Nov
// menu (bodies collapse unless the matching HudppTab_* class is on an ancestor). The 18 Nov rule
// hid the inactive body when the other tab class was set; using that here would hide the hook
// break the 20/21 Nov CSS introduced.
const shown = p => {
	for (let q = p; q; q = q.parent) {
		const v = q.applied.visibility;
		if (v === 'collapse') return false;
		if (v === 'visible') continue;
		const up = c => { for (let a = q.parent; a; a = a.parent) if (a.cls.has(c)) return true; return false; };
		if (q.cls.has('HudppBodyHud')) { if (!up('HudppTab_hud')) return false; continue; }
		if (q.cls.has('HudppBodyMm')) { if (!up('HudppTab_mm')) return false; continue; }
		if (q.cls.has('HudppBodyXh')) { if (!up('HudppTab_xh')) return false; continue; }
		if (q.cls.has('HudppBody')) return false;
	}
	return true;
};

const load = src => { (0, eval)(src); };
module.exports = { C, resetCounts, advance, P, H, mk, entry, buildHud, shown, press, load, storage, net, get handlers() { return handlers; }, get errors() { return errors; }, get info() { return info; }, get jobs() { return jobs; }, get now() { return now; } };
