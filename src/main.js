// Improved Quickbuy: the next quickbuy items and the souls still missing for each, in play and in the shop.
// Options are registered with Addon Settings (lib/addon-settings, vendored in front of this file): a
// "Quickbuy" tab in the ADDONS menu (placement 'addons'). CompLock keeps HUD, Minimap and Crosshair.
//
// Cost model: no per-frame work. One timer runs only while something of ours can be seen (4 Hz in play,
// 5 Hz with the shop open) and stops when everything is off. Panels are looked up once, inside the
// quickbuy panel or by direct child lookups, and every class, text and image is written only on change.
// HUD++'s panels get no event handlers (v6 of the old mod blocked its menu that way).

const VERSION = '1.0.4';
const ok = p => !!(p && p.IsValid && p.IsValid());
const cancel = h => { if (h) { try { $.CancelScheduled(h); } catch (e) {} } return null; };
const say = e => { try { $.Msg('Improved Quickbuy: ' + e); } catch (x) {} };
const guard = (what, f) => { try { return f(); } catch (e) { say(what + ': ' + e); return undefined; } };
const toInt = t => { const d = String(t === undefined || t === null ? '' : t).replace(/[^0-9]/g, ''); return d ? parseInt(d, 10) : 0; };
const group = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const flag = (p, c, on) => { if (ok(p) && p.BHasClass(c) !== !!on) p.SetHasClass(c, !!on); };
const write = (l, t) => { if (ok(l) && l.text !== t) l.text = t; };
const show = (p, on) => { const v = on ? 'visible' : 'collapse'; if (ok(p) && p.style.visibility !== v) p.style.visibility = v; };
const make = (type, parent, id, cls) => {
	const p = $.CreatePanel(type, parent, id || '');
	if (cls) cls.split(' ').forEach(c => { if (c) p.AddClass(c); });
	return p;
};
const text = (parent, cls, t) => { const l = make('Label', parent, '', cls); l.hittest = false; l.text = t; return l; };

const ctx = $.GetContextPanel();
const top = () => { let p = ctx; while (ok(p) && ok(p.GetParent())) p = p.GetParent(); return p; };

// ---------- settings ----------
const COUNT = { min: 1, max: 5 }; // items in the HUD row, Valve's own one included (1: only the badge above Valve's item)
const DEFAULTS = { on: true, hud: true, count: 3, runningTotals: true, queueTotal: true };
const cfg = Object.assign({}, DEFAULTS); // what the HUD uses; Addon Settings sends the saved values

// ---------- the quickbuy panels we read (found once, then kept) ----------
// A found panel is kept without an IsValid() per use: the panels we read live as long as this script
// (they are in its layout or the HUD around it). update() still looks every 5 s, and a read that throws
// makes tick() forget them all (forget()); the next step then looks them up again.
let found = {};
let miss = {};
const lookup = (key, find, arg) => {
	const p = found[key];
	if (p) return p;
	if (miss[key] && (miss[key]++ % 8)) return null; // missing: look again every 8th time only
	const f = find(arg);
	found[key] = ok(f) ? f : null;
	miss[key] = found[key] ? 0 : 1;
	return found[key];
};
const findOwn = id => ctx.FindChildTraverse(id);
const own = id => lookup(id, findOwn, id);

// souls: #gold_and_ap_container is a sibling of the quickbuy panel (or of one of its parents)
const findSouls = () => {
	for (let a = ctx.GetParent(), n = 0; ok(a) && n < 4; a = a.GetParent(), n++) {
		const box = a.FindChild('gold_and_ap_container');
		if (!ok(box)) continue;
		const row = box.FindChild('hudGoldContainer');
		let amount = ok(row) ? row.FindChild('CurrentGoldAmount') : null;
		if (!ok(amount)) amount = box.FindChildTraverse('CurrentGoldAmount');
		return ok(amount) ? amount.FindChild('hudCurGoldLabel') : null;
	}
	return null;
};
const soulsLabel = () => lookup('souls', findSouls);

// ---------- queue entries: Valve's CitadelHudQuickbuyEntry panels (class QuickbuyItem) ----------
// Per entry panel, found once: its name/cost labels and what we last read and worked out from them.
let partsKnown = new Map();
let gen = 0; // tick number: entries seen this tick carry it, the rest are swept when the queue changed
const newParts = entry => ({
	name: entry.FindChildTraverse('ModName'), cost: entry.FindChildTraverse('ModCost'), image: entry.FindChildTraverse('ModIconImage'),
	nameText: null, costText: null, key: '', shown: 0, item: null, icon: '', kind: '', tag: null, tagText: '', tagOn: false, gen: 0
});
// reads the entry's name and cost; true when either changed
const readEntry = e => {
	let changed = false;
	const name = e.name ? e.name.text : '';
	if (name !== e.nameText) { e.nameText = name; e.key = String(name).toLowerCase().split(/[\W_]+/).join(''); changed = true; }
	const cost = e.cost ? e.cost.text : '';
	if (cost !== e.costText) { e.costText = cost; e.shown = toInt(cost); changed = true; }
	return changed;
};
// fills out[] with the parts of the first `limit` entries of a queue list; true when anything changed.
// Entries are direct children of the list; anything else falls back to a class search (not seen in the game).
const readList = (list, limit, out, len) => {
	let changed = false, n = 0;
	if (list) {
		const count = Math.min(list.GetChildCount(), limit);
		for (let i = 0; i < count; i++) {
			const c = list.GetChild(i);
			let e = partsKnown.get(c);
			if (!e) {
				if (!ok(c) || !c.BHasClass('QuickbuyItem')) return readDeep(list, limit, out, len);
				e = newParts(c); partsKnown.set(c, e);
			}
			e.gen = gen;
			if (out[n] !== e) { out[n] = e; changed = true; }
			if (readEntry(e)) changed = true;
			n++;
		}
	}
	for (let k = n; k < len.n; k++) out[k] = null;
	if (n !== len.n) { len.n = n; changed = true; }
	return changed;
};
const readDeep = (list, limit, out, len) => {
	const all = list.FindChildrenWithClassTraverse('QuickbuyItem');
	let n = 0;
	for (let i = 0; i < all.length && n < limit; i++) {
		let e = partsKnown.get(all[i]);
		if (!e) { e = newParts(all[i]); partsKnown.set(all[i], e); }
		e.gen = gen; out[n++] = e; readEntry(e);
	}
	for (let k = n; k < len.n; k++) out[k] = null;
	len.n = n;
	return true;
};
const sweepParts = () => {
	partsKnown.forEach((e, entry) => {
		if (e.gen === gen) return;
		if (e.tag && e.tagOn) { e.tagOn = false; guard('tag', () => { e.tag.style.visibility = 'collapse'; }); }
		partsKnown.delete(entry);
	});
};
const forget = () => {
	found = {}; miss = {}; partsKnown = new Map(); soulsText = null; queueLen.n = 0; sellLen.n = 0;
	if (totalLabel && !ok(totalLabel)) { totalLabel = null; totalText = ''; totalOn = false; }
};

// ---------- item icons, from Valve's abilities.vdata (src/items.gen.js) ----------
let iconTable = null;
const iconFor = (e, name) => {
	if (e.item === name) return;
	e.item = name;
	const src = ok(e.image) && e.image.GetAttributeString ? e.image.GetAttributeString('src', '') : '';
	if (!iconTable) {
		iconTable = new Map();
		IQB_ITEM_ICONS_PACKED.split(';').forEach(pair => { const i = pair.indexOf('>'); if (i > 0) iconTable.set(pair.slice(0, i), pair.slice(i + 1)); });
	}
	const key = e.key || String(name).toLowerCase().split(/[\W_]+/).join('');
	const rel = iconTable.get(key) || '';
	const slash = rel.indexOf('/');
	e.kind = slash > 0 ? rel.slice(0, slash) : '';
	e.icon = src || (rel ? 's2r://panorama/images/items/' + rel + '_psd.vtex' : '');
};

// upgrade -> the items it builds from, from Valve's abilities.vdata (src/items.gen.js)
let recipeTable = null;
const partsFor = key => {
	if (!recipeTable) {
		recipeTable = new Map();
		IQB_ITEM_PARTS_PACKED.split(';').forEach(pair => { const i = pair.indexOf('>'); if (i > 0) recipeTable.set(pair.slice(0, i), pair.slice(i + 1).split(',')); });
	}
	return key ? recipeTable.get(key) : null;
};
// component -> full price (generated from abilities.vdata tiers and generic_data.vdata prices)
let valueTable = null;
const valueOf = key => {
	if (!valueTable) {
		valueTable = new Map();
		IQB_ITEM_VALUES_PACKED.split(';').forEach(pair => { const i = pair.indexOf('>'); if (i > 0) valueTable.set(pair.slice(0, i), parseInt(pair.slice(i + 1), 10) || 0); });
	}
	return valueTable.get(key) || 0;
};

// ---------- what we show ----------
// Every panel below is ours, so we keep its state in JS and touch it only on a change: no class or text
// read-backs from the panels.
const KINDS = { weapon: 'IqbWeapon', vitality: 'IqbVitality', spirit: 'IqbSpirit' };
const setCls = (p, c, on) => { p.SetHasClass(c, on); };
// The HUD row: a souls badge above Valve's quickbuy item, and our own entries 2..5 to its right, each with
// its badge. Every panel is a direct child of the quickbuy panel with a fixed size and fixed left/bottom
// margins (see the CSS): nothing is sized from its contents, so nothing can be squeezed to zero width.
// Built on first need, only as many as Items Shown and Show Missing Souls ask for.
const told = {}; // one-time console lines
const slots = []; // per queue position 1..5: { badge, label, entry, image, has, badgeOn, ready, entryReady, missing, src, kind }
const slotAt = (i, withBadge) => {
	let s = slots[i];
	if (!s) s = slots[i] = { badge: null, label: null, entry: null, image: null, has: false, badgeOn: false, ready: false, entryReady: false, missing: -1, src: null, kind: '' };
	if (withBadge && !s.badge) {
		s.badge = make('Panel', ctx, 'IqbBadge' + (i + 1), 'IqbBadge IqbAt' + (i + 1));
		s.badge.hittest = false;
		make('Image', s.badge, '', 'IqbSoul goldIcon').hittest = false;
		s.label = text(s.badge, 'IqbBadgeLabel', '');
		s.missing = -1; s.ready = false; s.badgeOn = false;
	}
	if (i > 0 && !s.entry) { // position 1 is Valve's own #HudMini
		s.entry = make('Panel', ctx, 'IqbEntry' + (i + 1), 'IqbEntry IqbAt' + (i + 1));
		s.entry.hittest = false;
		s.image = make('Image', s.entry, '', 'IqbIcon');
		s.image.hittest = false;
		s.has = false; s.entryReady = false; s.src = null; s.kind = '';
	}
	return s;
};

// r: the queue row for this position (null: nothing there or beyond Items Shown); badges: Show Missing Souls
const paintSlot = (s, r, badges) => {
	const badgeOn = !!r && badges;
	if (s.badge && s.badgeOn !== badgeOn) { s.badgeOn = badgeOn; setCls(s.badge, 'IqbHas', badgeOn); }
	if (badgeOn) {
		if (s.missing !== r.missing) { s.missing = r.missing; s.label.text = group(r.missing); }
		const ready = r.missing <= 0;
		if (s.ready !== ready) { s.ready = ready; setCls(s.badge, 'IqbReady', ready); }
	}
	if (!s.entry) return;
	if (s.has !== !!r) { s.has = !!r; setCls(s.entry, 'IqbHas', s.has); }
	if (!r) return;
	const entryReady = badges && r.missing <= 0; // lit only when we know it is affordable
	if (s.entryReady !== entryReady) { s.entryReady = entryReady; setCls(s.entry, 'IqbReady', entryReady); }
	iconFor(r.e, r.e.nameText);
	if (s.src !== r.e.icon) { s.src = r.e.icon; s.image.SetImage(r.e.icon); }
	const kind = KINDS[r.e.kind] || '';
	if (s.kind !== kind) { if (s.kind) setCls(s.entry, s.kind, false); if (kind) setCls(s.entry, kind, true); s.kind = kind; }
};

const tagFor = e => {
	if (ok(e.tag)) return e.tag;
	e.tag = null;
	const parent = (ok(e.cost) && e.cost.GetParent()) || (ok(e.name) && e.name.GetParent()) || null;
	if (!ok(parent)) return null;
	const left = parent.FindChild('IqbRunning'); // made earlier for this entry panel
	if (ok(left)) { e.tag = left; e.tagOn = left.style.visibility === 'visible'; e.tagText = left.text; return left; }
	const tag = make('Label', parent, 'IqbRunning', 'IqbRunning');
	tag.hittest = false;
	tag.style.marginLeft = '6px';
	tag.style.fontSize = '14px';
	tag.style.fontWeight = 'normal'; // thinner than the bold cost; its color comes from the CSS, the same as the cost's
	tag.style.visibility = 'collapse';
	e.tag = tag; e.tagOn = false; e.tagText = '';
	return tag;
};
const showTag = (e, on, t) => {
	const tag = on || e.tagOn ? tagFor(e) : null;
	if (!tag) return;
	if (on && e.tagText !== t) { e.tagText = t; tag.text = t; }
	if (e.tagOn !== on) { e.tagOn = on; tag.style.visibility = on ? 'visible' : 'collapse'; }
};

let totalLabel = null, totalText = '', totalOn = false;
const totalFor = () => {
	if (ok(totalLabel)) return totalLabel;
	totalLabel = null; totalText = ''; totalOn = false;
	const outer = lookup('outer', () => { const q = own('QuickBuyQueueContainer'); const f = ok(q) ? q.FindChildrenWithClassTraverse('QuickbuyQueueOuter') : null; return f && f.length ? f[0] : null; });
	if (!ok(outer)) return null;
	const existing = outer.FindChild('IqbQueueTotal');
	if (ok(existing)) { totalLabel = existing; totalOn = existing.style.visibility === 'visible'; totalText = existing.text; return totalLabel; }
	totalLabel = make('Label', outer, 'IqbQueueTotal', 'IqbQueueTotal');
	totalLabel.hittest = false;
	totalLabel.style.visibility = 'collapse';
	const first = outer.GetChild(0);
	if (ok(first) && first !== totalLabel) guard('total label', () => outer.MoveChildBefore(totalLabel, first));
	return totalLabel;
};
const showTotal = (on, t) => {
	const l = on || totalOn ? totalFor() : null;
	if (!l) return;
	if (on && totalText !== t) { totalText = t; l.text = t; }
	if (totalOn !== on) { totalOn = on; l.style.visibility = on ? 'visible' : 'collapse'; }
};

// ---------- the update ----------
// Each step reads only its inputs (queue entries' name and cost, souls, sell queue) and stops there when
// none of them changed; the math and every write run only after a change. No allocations on that path.
const PLAY_EVERY = 0.25;
const SHOP_EVERY = 0.2;
const EMPTY_EVERY = 0.5;
let timer = null;
let shopOpen = false, shopKnown = false;
let shownHud = false, shownTags = false, shownTotal = false;
let dirty = true; // settings or shop state changed: redo the math and the painting once
let lastHud = false, lastBadges = false, lastTags = false, lastTotal = false, lastShop = false;

// The shop is open: gShopOpen. Valve's GlobalClassListener puts it on #StatsAndModsContainer (an ancestor of
// ours); the GlobalClassChanged event keeps us in step, and the class is read once for a HUD that loads with
// the shop already open. Not gQuickbuyShopShowQueue: the player's "show the queue in the shop" toggle, on in play too.
const findStats = () => { for (let a = ctx.GetParent(), n = 0; ok(a) && n < 4; a = a.GetParent(), n++) if (a.id === 'StatsAndModsContainer') return a; return null; };
const statsBox = () => lookup('stats', findStats);
const inShop = () => {
	if (!shopKnown) { const b = statsBox(); if (b) { shopKnown = true; if (b.BHasClass('gShopOpen')) shopOpen = true; } }
	return shopOpen;
};
// HUD: badges (Show Missing Souls) and extra entries (Items Shown above 1) are independent of each other
const wantBadges = () => cfg.on && cfg.hud;
const wantEntries = () => cfg.on && cfg.count > 1;
const wantHud = () => wantBadges() || wantEntries();
const wantShop = () => cfg.on && (cfg.runningTotals || cfg.queueTotal);

const hideAll = () => {
	if (shownHud) { setCls(ctx, 'IqbHudOn', false); shownHud = false; }
	if (shownTags) partsKnown.forEach(e => { if (e.tag) showTag(e, false, ''); });
	shownTags = false;
	if (shownTotal) showTotal(false, '');
	shownTotal = false;
	dirty = true;
};

const queueRows = []; const queueLen = { n: 0 }; // parts of the queue entries we look at, reused
const sellRows = []; const sellLen = { n: 0 };
const sums = []; const missing = []; const used = [];
let soulsText = null, souls = 0, available = 0;
const RECHECK = 20; // ticks
let checks = 0;
const stillThere = key => !found[key] || ok(found[key]);

const update = () => {
	timer = null;
	gen++;
	if (!cfg.on || (!wantHud() && !(wantShop() && inShop()))) { hideAll(); return; } // stops until a change
	const shop = inShop();
	const hud = wantHud() && !shop;
	const tags = shop && cfg.runningTotals;
	const total = shop && cfg.queueTotal;
	if (!hud && !tags && !total) { hideAll(); timer = $.Schedule(EMPTY_EVERY, tick); return; } // shop open, HUD row hidden by it
	const badges = hud && wantBadges();
	const math = badges || tags || total; // souls math only for something that shows a number
	if (hud !== lastHud || badges !== lastBadges || tags !== lastTags || total !== lastTotal || shop !== lastShop) {
		lastHud = hud; lastBadges = badges; lastTags = tags; lastTotal = total; lastShop = shop; dirty = true;
	}

	// the panels we read are kept without an IsValid() per look; every 5 s one look makes sure they are still there
	if (++checks >= RECHECK) { checks = 0; if (!stillThere('QuickbuyQueue') || !stillThere('QuickbuySellQueue') || !stillThere('souls') || !stillThere('stats') || !stillThere('outer') || (totalLabel && !ok(totalLabel))) { forget(); dirty = true; } }

	// inputs
	let changed = readList(own('QuickbuyQueue'), hud ? cfg.count : 99, queueRows, queueLen);
	const need = queueLen.n;
	if (math) {
		const l = soulsLabel();
		const t = l ? l.text : '';
		if (t !== soulsText) { soulsText = t; souls = toInt(t); changed = true; }
		if (readList(own('QuickbuySellQueue'), 99, sellRows, sellLen)) changed = true;
	}
	if (!told.update) { told.update = true; say('first update: ' + (shop ? 'shop' : 'play') + ', queue ' + need + ', souls ' + (!math ? 'not needed' : soulsLabel() ? 'found' : 'NOT found') + ', sell queue ' + sellLen.n); }
	if (changed) sweepParts();
	if (!changed && !dirty) { timer = $.Schedule(!need ? EMPTY_EVERY : (shop ? SHOP_EVERY : PLAY_EVERY), tick); return; }
	dirty = false;

	// Badge number = souls still missing up to and including this entry: max(0, sum of prices - souls - sell credit).
	// Price of an entry: the cost the game shows on it (an owned component is already taken off there).
	// A component queued earlier is not owned yet, so its full price (its tier price, not the possibly
	// discounted price shown on it) comes off its upgrade here, once per queued component.
	if (math) {
		available = souls;
		for (let i = 0; i < sellLen.n; i++) available += Math.floor(sellRows[i].shown / 2);
		let sum = 0;
		for (let i = 0; i < need; i++) {
			const e = queueRows[i];
			let price = e.shown;
			const comps = partsFor(e.key);
			if (comps) {
				for (let c = 0; c < comps.length; c++) {
					for (let j = 0; j < i; j++) {
						if (!used[j] && queueRows[j].key === comps[c]) { used[j] = true; price -= valueOf(comps[c]) || queueRows[j].shown; break; }
					}
				}
			}
			used[i] = false;
			sum += price > 0 ? price : 0;
			sums[i] = sum;
			missing[i] = sum > available ? sum - available : 0;
		}
	}

	if (hud) {
		if (!shownHud) { setCls(ctx, 'IqbHudOn', true); shownHud = true; }
		for (let i = 0; i < COUNT.max; i++) {
			const r = i < cfg.count && i < need;
			if (!r && !slots[i]) continue;
			const s = slotAt(i, badges && r);
			if (r) { scratch.e = queueRows[i]; scratch.missing = math ? missing[i] : 0; }
			paintSlot(s, r ? scratch : null, badges);
		}
		if (!told.strip) { told.strip = true; say('HUD row built next to the quickbuy item (#HudMini ' + (own('HudMini') ? 'found' : 'NOT found') + ')'); }
	} else if (shownHud) { setCls(ctx, 'IqbHudOn', false); shownHud = false; }

	if (tags) {
		for (let i = 0; i < need; i++) { const e = queueRows[i]; const on = missing[i] > 0; showTag(e, on, on ? '(' + group(sums[i]) + ')' : e.tagText); }
		shownTags = true;
	} else if (shownTags) { partsKnown.forEach(e => { if (e.tag) showTag(e, false, ''); }); shownTags = false; }

	if (total) {
		const on = need > 0;
		showTotal(on, on ? (missing[need - 1] > 0 ? WORDS.toGo.replace('{0}', group(sums[need - 1])).replace('{1}', group(missing[need - 1])) : WORDS.ready.replace('{0}', group(sums[need - 1]))) : '');
		shownTotal = true;
	} else if (shownTotal) { showTotal(false, ''); shownTotal = false; }

	timer = $.Schedule(!need ? EMPTY_EVERY : (shop ? SHOP_EVERY : PLAY_EVERY), tick);
};
const scratch = { e: null, missing: 0 };

const running = () => cfg.on && (wantHud() || (wantShop() && inShop()));
// one guarded step: an error is logged and the loop retries in 1 s instead of dying
const tick = () => {
	timer = null;
	try { update(); } catch (e) { say('update: ' + e); forget(); dirty = true; if (!timer && running()) timer = $.Schedule(1, tick); }
	AddonSettings.pulse();
};
const kick = () => { dirty = true; timer = cancel(timer); timer = $.Schedule(0, tick); };

// ---------- settings: registered with Addon Settings (lib/addon-settings), the same way any addon does ----------
// The library hosts them as a "Quickbuy" tab in the ADDONS menu, and keeps them on
// deadlockconfig.com's store page under improved_quickbuy_settings (as before).
const SCHEMA = { // '#Iqb_*': src/strings.js, in the game's language
	id: 'improved_quickbuy', title: '#Iqb_Tab', resetLabel: '#Iqb_Reset', prefix: 'Iqb', placement: 'addons', author: 'luxus', toggle: 'on', strings: STRINGS,
	controls: [
		{ key: 'on', type: 'toggle', section: '#Iqb_Section', title: '#Iqb_Enable', desc: '#Iqb_Enable_Desc', default: DEFAULTS.on },
		{ key: 'hud', type: 'toggle', section: '#Iqb_Hud', title: '#Iqb_ShowMissing', desc: '#Iqb_ShowMissing_Desc', default: DEFAULTS.hud, needs: ['on'] },
		{ key: 'count', type: 'slider', section: '#Iqb_Hud', title: '#Iqb_ItemsShown', desc: '#Iqb_ItemsShown_Desc', min: COUNT.min, max: COUNT.max, step: 1, default: DEFAULTS.count, needs: ['on'] },
		{ key: 'runningTotals', type: 'toggle', section: '#Iqb_Shop', title: '#Iqb_RunningTotals', desc: '#Iqb_RunningTotals_Desc', default: DEFAULTS.runningTotals, needs: ['on'] },
		{ key: 'queueTotal', type: 'toggle', section: '#Iqb_Shop', title: '#Iqb_QueueTotal', desc: '#Iqb_QueueTotal_Desc', default: DEFAULTS.queueTotal, needs: ['on'] }
	]
};
// the shop total's two texts, resolved once ({0} queue cost, {1} still missing)
const WORDS = { toGo: AddonSettings.localize('#Iqb_TotalToGo', STRINGS), ready: AddonSettings.localize('#Iqb_TotalReady', STRINGS) };
const locFile = () => { try { const v = $.Localize('#Iqb_Enable'); return typeof v === 'string' && v !== '#Iqb_Enable' && v !== 'Iqb_Enable'; } catch (e) { return false; } };
const settingsChanged = () => { if (running()) kick(); else { timer = cancel(timer); guard('hide', hideAll); } };

// ---------- start ----------
guard('events', () => $.RegisterForUnhandledEvent('GlobalClassChanged', (name, state) => {
	if (name !== 'gShopOpen' && name !== 'gQuickbuyShopShowQueue') return;
	if (name === 'gShopOpen') { shopOpen = !!state; shopKnown = true; }
	if (cfg.on) kick();
}));

say(VERSION + ' loaded (' + AddonSettings.language() + ', words from ' + (locFile() ? 'the game\'s loc file' : 'the built-in table') + ')');
guard('start', () => {
	AddonSettings.ride(() => !!timer); // the settings host's menu look shares our tick while it runs
	AddonSettings.register(SCHEMA, values => { Object.assign(cfg, values); settingsChanged(); });
	if (running()) timer = $.Schedule(0.5, tick);
});
