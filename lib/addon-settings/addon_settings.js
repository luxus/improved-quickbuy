// Addon Settings: one settings home for Deadlock Panorama addons (lib/addon-settings, MIT).
// Vendored into each addon's script by lib/addon-settings/vendor.sh; do not edit a vendored copy.
// Docs: docs/ADDON-SETTINGS-API.md.
//
// Every addon that embeds this file registers a schema; one embedded copy (the highest BUILD) hosts:
// it renders every registered addon as a tab in CompLock HUD++'s menu when HUD++ is installed, else in an
// ADDONS window in the Esc menu, and keeps the values on deadlockconfig.com's store page (one key per
// addon, <id>_settings). Addons' scripts do not share JavaScript: everything between copies goes through
// panels and their attribute strings under #EscapeMenu > #AddonSettingsHost, with 'Activated' events as
// the doorbell. Nothing is built, timed or watched beyond that until a menu is opened; no handlers on
// Valve's or HUD++'s panels.
const AddonSettings = (() => {
const API = 1; // wire protocol (ids, attributes, JSON shapes); bump only on incompatible changes
const BUILD = 5; // this implementation; the highest build among the installed copies hosts
const VERSION = '1.1.3';
const HOST = 'AddonSettingsHost', CLIENT = 'AddonSettingsClient', CLIENT_ID = 'AddonSettingsClient_';

const ok = p => !!(p && p.IsValid && p.IsValid());
const cancel = h => { if (h) { try { $.CancelScheduled(h); } catch (e) { /* ran */ } } return null; };
const say = m => { try { $.Msg('Addon Settings: ' + m); } catch (e) { /* no console */ } };
const guard = (what, f) => { try { return f(); } catch (e) { say(what + ': ' + e); return undefined; } };
const make = (type, parent, id, cls) => { const p = $.CreatePanel(type, parent, id || ''); if (cls) cls.split(' ').forEach(c => { if (c) p.AddClass(c); }); return p; };
const text = (parent, cls, t) => { const l = make('Label', parent, '', cls); l.hittest = false; l.text = t; return l; };
const flag = (p, c, on) => { if (ok(p) && p.BHasClass(c) !== !!on) p.SetHasClass(c, !!on); };
const write = (l, t) => { if (ok(l) && l.text !== t) l.text = t; };
const show = (p, on) => { const v = on ? 'visible' : 'collapse'; if (ok(p) && p.style.visibility !== v) p.style.visibility = v; };
const childWithClass = (p, c) => { if (!ok(p)) return null; for (let i = 0, n = p.GetChildCount(); i < n; i++) { const k = p.GetChild(i); if (ok(k) && k.BHasClass(c)) return k; } return null; };
const parse = s => { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } };
const ring = p => guard('doorbell', () => $.DispatchEvent('Activated', p, 'mouse'));
const top = () => { let p = $.GetContextPanel(); while (ok(p) && ok(p.GetParent())) p = p.GetParent(); return p; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- words: the game's language; Valve's localization first, then the addon's own table ----------
// A text that starts with '#' is a token: $.Localize('#Token') when the game knows it (a loc file under
// resource/localization), else table[<language>].Token, else table.english.Token, else the token's name.
// The language comes from $.Language() or the root's Language_<name> class the game sets.
const LANGUAGES = ['english', 'german', 'french', 'spanish', 'latam', 'italian', 'russian', 'ukrainian', 'polish', 'brazilian', 'portuguese', 'turkish', 'schinese', 'tchinese', 'japanese', 'koreana', 'thai', 'czech', 'hungarian', 'dutch', 'swedish', 'danish', 'finnish', 'norwegian', 'romanian', 'bulgarian', 'greek', 'vietnamese', 'indonesian'];
let lang = '';
const language = () => {
	if (lang) return lang;
	let l = guard('language', () => (typeof $.Language === 'function' ? String($.Language() || '') : ''));
	if (!l) { const root = top(); l = ok(root) ? (LANGUAGES.find(x => root.BHasClass('Language_' + x)) || '') : ''; }
	lang = /^[a-z_]{2,20}$/.test(String(l).toLowerCase()) ? String(l).toLowerCase() : 'english';
	return lang;
};
const fill = (t, args) => (args ? t.replace(/\{(\d)\}/g, (m, i) => (args[i] === undefined ? m : String(args[i]))) : t);
const localize = (s, table, args) => {
	s = String(s === undefined || s === null ? '' : s);
	if (s.charAt(0) !== '#' || s.length < 2) return fill(s, args);
	const token = s.slice(1);
	let t = null;
	try { const v = $.Localize(s); if (typeof v === 'string' && v && v !== s && v !== token) t = v; } catch (e) { /* no loc */ }
	if (t === null && table && typeof table === 'object') {
		const mineLang = table[language()], en = table.english;
		if (mineLang && typeof mineLang[token] === 'string') t = mineLang[token];
		else if (en && typeof en[token] === 'string') t = en[token];
	}
	return fill(t === null ? token : t, args);
};
// the host's own words (JS only: two vendored copies must never ship the same loc tokens)
const WORDS = { // the game's languages (gameinfo SupportedLanguages + tchinese); English and German by hand, the rest machine-made
	english: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Reset tab', AddonSettings_Saving: 'Saving...', AddonSettings_Saved: 'Saved', AddonSettings_NotLoaded: 'Saved settings not loaded ({0})', AddonSettings_NotSaved: 'Not saved ({0}), kept until the game closes' },
	german: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Tab zurücksetzen', AddonSettings_Saving: 'Speichern...', AddonSettings_Saved: 'Gespeichert', AddonSettings_NotLoaded: 'Gespeicherte Einstellungen nicht geladen ({0})', AddonSettings_NotSaved: 'Nicht gespeichert ({0}), gilt bis zum Spielende' },
	french: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Réinitialiser', AddonSettings_Saving: 'Enregistrement...', AddonSettings_Saved: 'Enregistré', AddonSettings_NotLoaded: 'Paramètres enregistrés non chargés ({0})', AddonSettings_NotSaved: 'Non enregistré ({0}), conservé jusqu\'à la fermeture du jeu' },
	spanish: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Restablecer', AddonSettings_Saving: 'Guardando...', AddonSettings_Saved: 'Guardado', AddonSettings_NotLoaded: 'Ajustes guardados no cargados ({0})', AddonSettings_NotSaved: 'No guardado ({0}), se mantiene hasta cerrar el juego' },
	latam: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Restablecer', AddonSettings_Saving: 'Guardando...', AddonSettings_Saved: 'Guardado', AddonSettings_NotLoaded: 'Configuración guardada no cargada ({0})', AddonSettings_NotSaved: 'No guardado ({0}), se mantiene hasta cerrar el juego' },
	brazilian: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Redefinir aba', AddonSettings_Saving: 'Salvando...', AddonSettings_Saved: 'Salvo', AddonSettings_NotLoaded: 'Configurações salvas não carregadas ({0})', AddonSettings_NotSaved: 'Não salvo ({0}), mantido até fechar o jogo' },
	italian: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Ripristina scheda', AddonSettings_Saving: 'Salvataggio...', AddonSettings_Saved: 'Salvato', AddonSettings_NotLoaded: 'Impostazioni salvate non caricate ({0})', AddonSettings_NotSaved: 'Non salvato ({0}), mantenuto fino alla chiusura del gioco' },
	polish: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Zresetuj kartę', AddonSettings_Saving: 'Zapisywanie...', AddonSettings_Saved: 'Zapisano', AddonSettings_NotLoaded: 'Nie wczytano zapisanych ustawień ({0})', AddonSettings_NotSaved: 'Nie zapisano ({0}), obowiązuje do zamknięcia gry' },
	czech: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Resetovat kartu', AddonSettings_Saving: 'Ukládání...', AddonSettings_Saved: 'Uloženo', AddonSettings_NotLoaded: 'Uložená nastavení nenačtena ({0})', AddonSettings_NotSaved: 'Neuloženo ({0}), platí do zavření hry' },
	russian: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Сбросить вкладку', AddonSettings_Saving: 'Сохранение...', AddonSettings_Saved: 'Сохранено', AddonSettings_NotLoaded: 'Сохранённые настройки не загружены ({0})', AddonSettings_NotSaved: 'Не сохранено ({0}), действует до закрытия игры' },
	ukrainian: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Скинути вкладку', AddonSettings_Saving: 'Збереження...', AddonSettings_Saved: 'Збережено', AddonSettings_NotLoaded: 'Збережені налаштування не завантажено ({0})', AddonSettings_NotSaved: 'Не збережено ({0}), діє до закриття гри' },
	turkish: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Sekmeyi sıfırla', AddonSettings_Saving: 'Kaydediliyor...', AddonSettings_Saved: 'Kaydedildi', AddonSettings_NotLoaded: 'Kayıtlı ayarlar yüklenemedi ({0})', AddonSettings_NotSaved: 'Kaydedilmedi ({0}), oyun kapanana kadar geçerli' },
	indonesian: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Reset tab', AddonSettings_Saving: 'Menyimpan...', AddonSettings_Saved: 'Tersimpan', AddonSettings_NotLoaded: 'Pengaturan tersimpan tidak dimuat ({0})', AddonSettings_NotSaved: 'Tidak tersimpan ({0}), berlaku sampai game ditutup' },
	thai: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'รีเซ็ตแท็บ', AddonSettings_Saving: 'กำลังบันทึก...', AddonSettings_Saved: 'บันทึกแล้ว', AddonSettings_NotLoaded: 'โหลดการตั้งค่าที่บันทึกไม่ได้ ({0})', AddonSettings_NotSaved: 'บันทึกไม่ได้ ({0}) ใช้ได้จนกว่าจะปิดเกม' },
	japanese: { AddonSettings_Addons: 'アドオン', AddonSettings_ResetTab: 'タブをリセット', AddonSettings_Saving: '保存中...', AddonSettings_Saved: '保存しました', AddonSettings_NotLoaded: '保存した設定を読み込めません ({0})', AddonSettings_NotSaved: '保存できません ({0})。ゲーム終了まで有効です' },
	koreana: { AddonSettings_Addons: '애드온', AddonSettings_ResetTab: '탭 초기화', AddonSettings_Saving: '저장 중...', AddonSettings_Saved: '저장됨', AddonSettings_NotLoaded: '저장된 설정을 불러오지 못함 ({0})', AddonSettings_NotSaved: '저장되지 않음 ({0}), 게임 종료 시까지 유지' },
	schinese: { AddonSettings_Addons: '插件', AddonSettings_ResetTab: '重置标签页', AddonSettings_Saving: '正在保存...', AddonSettings_Saved: '已保存', AddonSettings_NotLoaded: '未能加载已保存的设置 ({0})', AddonSettings_NotSaved: '未保存 ({0})，在关闭游戏前有效' },
	tchinese: { AddonSettings_Addons: '插件', AddonSettings_ResetTab: '重置分頁', AddonSettings_Saving: '正在儲存...', AddonSettings_Saved: '已儲存', AddonSettings_NotLoaded: '無法載入已儲存的設定 ({0})', AddonSettings_NotSaved: '未儲存 ({0})，在關閉遊戲前有效' }
};
const word = (k, args) => localize('#AddonSettings_' + k, WORDS, args);

// ---------- schema ----------
const TYPES = { toggle: 1, slider: 1, select: 1 };
const decimals = n => { const s = String(n); const i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; };
const fix = (c, v) => { // a stored or requested value made valid for its control, or its default
	if (c.type === 'toggle') return typeof v === 'boolean' ? v : c.default;
	if (c.type === 'slider') {
		const n = Number(v);
		if (v === null || v === '' || typeof v === 'boolean' || !isFinite(n)) return c.default;
		const s = Math.round((Math.max(c.min, Math.min(c.max, n)) - c.min) / c.step) * c.step + c.min;
		return Number(Math.min(c.max, s).toFixed(decimals(c.step)));
	}
	return c.options.some(o => o.value === v) ? v : c.default;
};
const checkSchema = s => {
	if (!s || !/^[a-z0-9_]{1,40}$/.test(s.id || '')) throw new Error('schema.id: 1-40 of a-z 0-9 _');
	const L = x => localize(x, s.strings);
	const out = { api: API, id: s.id, title: L(s.title || s.id), resetLabel: s.resetLabel ? L(s.resetLabel) : word('ResetTab'), prefix: /^[A-Za-z][A-Za-z0-9]*$/.test(s.prefix || '') ? s.prefix : 'As' + s.id.replace(/(^|_)([a-z0-9])/g, (m, a, b) => b.toUpperCase()), controls: [] };
	(s.controls || []).forEach(c => {
		if (!c || !/^[A-Za-z][A-Za-z0-9_]*$/.test(c.key || '') || !TYPES[c.type]) { say(s.id + ': control skipped (key or type): ' + JSON.stringify(c)); return; }
		const d = { key: c.key, type: c.type, title: L(c.title || c.key), desc: L(c.desc || ''), section: L(c.section || ''), needs: Array.isArray(c.needs) ? c.needs.filter(k => typeof k === 'string') : [] };
		if (c.type === 'slider') { d.min = Number(c.min) || 0; d.max = Math.max(d.min, Number(c.max)); d.step = Number(c.step) > 0 ? Number(c.step) : 1; if (!isFinite(d.max)) d.max = d.min + 1; }
		if (c.type === 'select') { d.options = (c.options || []).map(o => (o && typeof o === 'object') ? { value: o.value, label: L(o.label === undefined ? o.value : o.label) } : { value: o, label: String(o) }); if (!d.options.length) return; }
		d.default = c.type === 'toggle' ? !!c.default : c.type === 'select' ? (d.options.some(o => o.value === c.default) ? c.default : d.options[0].value) : d.min;
		if (c.type === 'slider') d.default = fix(d, c.default);
		out.controls.push(d);
	});
	return out;
};
const defaults = s => { const v = {}; s.controls.forEach(c => { v[c.key] = c.default; }); return v; };
const take = (s, values, saved) => { // saved values into values; true when any changed
	let changed = false;
	if (!saved || typeof saved !== 'object') return false;
	s.controls.forEach(c => { if (c.key in saved) { const v = fix(c, saved[c.key]); if (v !== values[c.key]) { values[c.key] = v; changed = true; } } });
	return changed;
};

// ---------- client: what the embedding addon talks to ----------
const mine = {}; // id -> { schema, values, onChange, panel, last, pending, status }
const receive = c => { // the host rang: new values or status in our panel's 'values' attribute
	if (!ok(c.panel)) return;
	const raw = c.panel.GetAttributeString('values', '');
	if (raw === c.last) return;
	c.last = raw;
	const msg = parse(raw);
	if (!msg || typeof msg !== 'object') return;
	c.status = String(msg.status || '');
	if (take(c.schema, c.values, msg.values) && c.onChange) guard(c.schema.id + ' onChange', () => c.onChange(Object.assign({}, c.values)));
};
const plant = (c, host) => {
	let p = host.FindChild(CLIENT_ID + c.schema.id);
	if (!ok(p)) { p = make('Panel', host, CLIENT_ID + c.schema.id, CLIENT); p.hittest = false; p.style.visibility = 'collapse'; }
	c.panel = p; c.last = '';
	p.SetAttributeString('values', '');
	p.SetAttributeString('schema', JSON.stringify(c.schema));
	p.SetAttributeString('set', c.pending ? JSON.stringify(c.pending) : '');
	c.pending = null;
	p.SetPanelEvent('onactivate', () => receive(c)); // our own panel
};
const ask = (c, patch) => { // a change from the addon itself: used at once, the host saves it
	let changed = false;
	c.schema.controls.forEach(x => { if (x.key in patch) { const v = fix(x, patch[x.key]); if (v !== c.values[x.key]) { c.values[x.key] = v; changed = true; } } });
	if (!changed) return;
	if (c.onChange) guard(c.schema.id + ' onChange', () => c.onChange(Object.assign({}, c.values)));
	if (!ok(c.panel)) { c.pending = Object.assign(c.pending || {}, patch); return; }
	const prev = parse(c.panel.GetAttributeString('set', '')) || {};
	c.panel.SetAttributeString('set', JSON.stringify(Object.assign(prev, patch)));
	ring(c.panel.GetParent());
};
const register = (schema, onChange) => {
	const s = checkSchema(schema);
	const c = mine[s.id] = { schema: s, values: defaults(s), onChange: onChange, panel: null, last: '', pending: null, status: '' };
	const host = esc ? esc.FindChild(HOST) : null;
	if (ok(host)) { plant(c, host); ring(host); } else start();
	return {
		id: s.id,
		get: k => c.values[k],
		values: () => Object.assign({}, c.values),
		set: (k, v) => ask(c, typeof k === 'object' ? k : { [k]: v }),
		status: () => c.status
	};
};

// ---------- finding the Esc menu (once, at load) and electing the host ----------
let esc = null, looks = 0, started = false;
const findEsc = () => { for (let a = $.GetContextPanel(); ok(a); a = a.GetParent()) { const e = a.FindChild('EscapeMenu'); if (ok(e)) return e; } return null; };
const start = () => { if (!started) { started = true; $.Schedule(0, attach); } };
const attach = () => { // 4 Hz for 10 s, then every 5 s for a minute: addons do not change mid-game
	esc = guard('Esc menu', findEsc) || null;
	if (!esc) {
		if (++looks > 52) { say('no Esc menu found: default settings, no settings menu'); return; }
		$.Schedule(looks > 40 ? 5 : 0.25, attach);
		return;
	}
	let host = esc.FindChild(HOST);
	if (!ok(host)) { host = make('Panel', esc, HOST, HOST); host.style.visibility = 'collapse'; serve(host, false); }
	else if ((Number(host.GetAttributeString('build', '0')) || 0) < BUILD) serve(host, true);
	Object.keys(mine).forEach(id => plant(mine[id], host));
	ring(host);
};

// ---------- the host ----------
const H = { on: false, panel: null, token: '', recs: {}, order: [], mode: '', looks: 0, tWatch: null, rider: null, done: false };
const M = { panel: null, wasOpen: false, built: false, current: null, before: null, tTab: null, hooks: null }; // HUD++'s menu
const W = { row: null, head: null, side: null, pages: null, open: false, current: null }; // our window
const still = () => H.on && ok(H.panel) && H.panel.GetAttributeString('token', '') === H.token;
const serve = (panel, takeover) => {
	if (takeover) guard('take over', () => { // an older copy hosted: its menu entries go, ours come on demand
		const sub = esc.FindChildTraverse('SubOptions'); const row = ok(sub) ? sub.FindChild('AddonSettingsRow') : null;
		if (ok(row)) row.DeleteAsync(0);
		for (let i = panel.GetChildCount() - 1; i >= 0; i--) { const k = panel.GetChild(i); if (ok(k) && !k.BHasClass(CLIENT)) k.DeleteAsync(0); }
		const menu = esc.FindChild('HudppPanel');
		if (ok(menu)) menu.FindChildrenWithClassTraverse('AddonSettingsPart').forEach(k => k.DeleteAsync(0));
		panel.style.visibility = 'collapse';
	});
	H.on = true; H.panel = panel; H.token = BUILD + '.' + Math.random().toString(36).slice(2);
	panel.SetAttributeString('token', H.token);
	panel.SetAttributeString('build', String(BUILD));
	panel.SetAttributeString('api', String(API));
	panel.SetAttributeString('version', VERSION);
	panel.SetPanelEvent('onactivate', () => guard('scan', scan)); // our own panel
	H.tWatch = $.Schedule(0.25, watch);
};
const scan = () => {
	if (!still()) return;
	let added = false;
	for (let i = 0, n = H.panel.GetChildCount(); i < n; i++) {
		const p = H.panel.GetChild(i);
		if (!ok(p) || !p.BHasClass(CLIENT)) continue;
		const id = p.id.slice(CLIENT_ID.length);
		const raw = p.GetAttributeString('schema', '');
		let r = H.recs[id];
		if (!r || r.raw !== raw || r.panel !== p) {
			let s = null;
			try { s = checkSchema(parse(raw)); } catch (e) { say(id + ': bad schema: ' + e.message); continue; }
			const old = r;
			r = H.recs[id] = { id: id, panel: p, raw: raw, schema: s, values: defaults(s), stored: null, status: '', kind: '', tSave: null, views: [], tab: null, body: null, foot: null, nav: null, page: null };
			if (old) { take(s, r.values, old.values); r.stored = old.stored; } else { H.order.push(id); added = true; }
			if (old) push(r); else load(r);
		}
		const set = parse(p.GetAttributeString('set', ''));
		if (set) { p.SetAttributeString('set', ''); apply(r, set); }
	}
	if (added) grow();
};
const SESSION = id => 'AddonSettings:' + id;
const load = r => {
	const session = parse(top().GetAttributeString(SESSION(r.id), ''));
	if (session) { take(r.schema, r.values, session); r.stored = JSON.stringify(r.values); push(r); return; } // a HUD reload: no page load
	push(r);
	vault.get(r.id + '_settings', (err, saved) => {
		if (!still()) return;
		if (err) { status(r, word('NotLoaded', [err]), 'error'); return; }
		take(r.schema, r.values, saved);
		r.stored = JSON.stringify(r.values);
		push(r);
	});
};
const push = r => {
	if (ok(r.panel)) { r.panel.SetAttributeString('values', JSON.stringify({ v: API, values: r.values, status: r.status })); ring(r.panel); }
	r.views.forEach(v => v.sync());
};
const status = (r, t, kind) => { r.status = t; r.kind = kind || ''; push(r); };
const apply = (r, patch) => {
	let changed = false;
	r.schema.controls.forEach(c => { if (c.key in patch) { const v = fix(c, patch[c.key]); if (v !== r.values[c.key]) { r.values[c.key] = v; changed = true; } } });
	if (!changed) { r.views.forEach(v => v.sync()); return; }
	guard('session copy', () => top().SetAttributeString(SESSION(r.id), JSON.stringify(r.values)));
	r.status = word('Saving'); r.kind = 'saving';
	push(r);
	r.tSave = cancel(r.tSave);
	r.tSave = $.Schedule(0.6, () => { // one save for a burst of changes
		r.tSave = null;
		if (!still()) return;
		const now = JSON.stringify(r.values);
		if (now === r.stored) { status(r, word('Saved'), 'saved'); return; } // changed back to what is stored: no page load
		vault.set(r.id + '_settings', JSON.stringify(Object.assign({ t: Date.now() }, r.values)), err => { if (!err) r.stored = now; if (err) status(r, word('NotSaved', [err]), 'error'); else status(r, word('Saved'), 'saved'); });
	});
};

// ---------- where the settings show: CompLock's menu (HUD++ installed) or our window ----------
// HUD++'s escape-menu layout has #HudppMenuButton from the start; three looks (0.75 s) decide.
const watch = () => {
	H.tWatch = null;
	if (!still() || H.done) return;
	const wait = step();
	if (!wait) { H.done = true; return; }
	if (wait === 0.25 && H.rider && guard('rider', H.rider)) return; // the embedding addon's tick looks on its beat
	H.tWatch = $.Schedule(wait, watch);
};
const step = () => {
	if (!H.mode) {
		if (ok(esc.FindChildTraverse('HudppMenuButton'))) H.mode = 'hudpp';
		else if (++H.looks >= 3) { H.mode = 'window'; say('build ' + BUILD + ' hosts; no HUD++ (CompLock) menu: settings in the Esc menu, ADDONS'); grow(); return 0; }
		if (!H.mode) return 0.25;
		say('build ' + BUILD + ' hosts; settings as tabs in CompLock HUD++\'s menu');
	}
	// HUD++ builds #HudppPanel on its first open and keeps it: until then one class read per look
	if (!ok(M.panel)) { const p = esc.FindChild('HudppPanel'); M.panel = ok(p) ? p : null; }
	const open = !!M.panel && M.panel.BHasClass('HudppOpen');
	if (open && !M.wasOpen) guard('CompLock tabs', tabs);
	M.wasOpen = open;
	return M.built ? 0 : 0.25;
};
const grow = () => { // new addons registered: their entries where the menu already is
	if (H.mode === 'hudpp' && M.built) guard('CompLock tabs', tabs);
	if (H.mode === 'window') guard('ADDONS window', () => { button(); if (W.side) H.order.forEach(nav); });
};

// ---------- CompLock tabs ----------
// Read-only towards HUD++ except what a tab needs: our own panels in its menu, HudppSelected on its
// tab buttons, and its "reset all" foot hidden while one of our tabs is shown. HUD++ 18 Nov hides
// its bodies by CSS when both HudppTab_hud and HudppTab_xh are set; HUD++ 20/21 Nov has three tabs
// (hud, mm, xh) and inverted CSS (a body is shown only when its matching class is set), so setting
// every tab class would show every HUD++ body. We hide HUD++'s own .HudppBody panels with an inline
// visibility instead, and never toggle HudppTab_* to hide them (that would not update HUD++'s
// closed-over tab anyway). HUD++'s refresh() (its tab clicked, menu reopened) selects one of its
// own tab buttons: a 50 ms look, only while one of our tabs is shown, hands back.
const tabs = () => {
	const p = M.panel;
	const bar = childWithClass(p, 'HudppTabs');
	H.order.forEach(id => {
		const r = H.recs[id];
		if (ok(r.tab) || ok(r.body)) return;
		if (!bar) { // HUD++ without a tab bar: the rows at the end of its HUD tab
			const hud = childWithClass(p, 'HudppBodyHud');
			if (!hud) return;
			r.body = make('Panel', hud, r.schema.prefix + 'Body', 'AddonSettingsPart');
			r.views.push(view(r, r.body, false));
			return;
		}
		const tab = r.tab = make('Button', bar, r.schema.prefix + 'Tab', 'HudppTab AddonSettingsPart');
		text(tab, 'HudppTabLabel', r.schema.title);
		tab.SetPanelEvent('onactivate', () => guard('tab', () => showTab(r, true))); // our own button; its body on its first click
	});
	M.built = true;
};
const ourButtons = () => H.order.map(id => H.recs[id].tab).filter(ok);
const hudppButtons = () => {
	const bar = childWithClass(M.panel, 'HudppTabs'); const out = [];
	if (!bar) return out;
	for (let i = 0, n = bar.GetChildCount(); i < n; i++) { const b = bar.GetChild(i); if (ok(b) && b.BHasClass('HudppTab') && !b.BHasClass('AddonSettingsPart')) out.push(b); }
	return out;
};
const hudppFoot = p => { if (!ok(p)) return null; for (let i = 0, n = p.GetChildCount(); i < n; i++) { const k = p.GetChild(i); if (ok(k) && k.BHasClass('HudppFoot') && !k.BHasClass('AddonSettingsPart')) return k; } return null; };
const hudppBodies = p => { const out = []; if (!ok(p)) return out; for (let i = 0, n = p.GetChildCount(); i < n; i++) { const k = p.GetChild(i); if (ok(k) && k.BHasClass('HudppBody') && !k.BHasClass('AddonSettingsPart')) out.push(k); } return out; };
const hideHudppBodies = (p, on) => { hudppBodies(p).forEach(b => { b.style.visibility = on ? 'collapse' : null; }); };
const hudppOwnsTab = () => hudppButtons().some(b => b.BHasClass('HudppSelected'));
const HUDPP_TAB_IDS = ['hud', 'mm', 'xh'];
const hudppParked = p => HUDPP_TAB_IDS.find(id => ok(p) && p.BHasClass('HudppTab_' + id)) || null;
// HUD++'s showTab (hudpp_menu.js) returns at once when t === tab. We do not set HudppTab_* or its
// closed-over tab, so if the player was on Crosshair, then Quickbuy, a Crosshair click is a no-op:
// HudppSelected stays off, our tab stays up. Hook only while our tab is shown; an Activated
// handler on HUD++'s button would otherwise steal its onactivate. On the click we unhook, hide our
// tab, move HUD++ off the parked tab if needed, then Activate so its own showTab runs.
const unhookHudppTabs = () => {
	(M.hooks || []).forEach(h => { try { $.UnregisterEventHandler('Activated', h.b, h.token); } catch (e) { /* already gone */ } });
	M.hooks = null;
};
const activateHudpp = b => { if (ok(b)) { if (typeof b.Activate === 'function') b.Activate(); else $.DispatchEvent('Activated', b); } };
const hookHudppTabs = () => {
	if (M.hooks) return;
	const buttons = hudppButtons();
	M.hooks = [];
	buttons.forEach((b, i) => {
		const id = HUDPP_TAB_IDS[i];
		if (!id || !ok(b)) return;
		const token = $.RegisterEventHandler('Activated', b, () => guard('CompLock tab', () => {
			const parked = hudppParked(M.panel);
			if (M.current) showTab(M.current, false);
			if (parked === id) {
				const other = buttons.find((x, j) => x !== b && HUDPP_TAB_IDS[j] && ok(x));
				if (other) activateHudpp(other);
			}
			activateHudpp(b);
		}));
		M.hooks.push({ b: b, token: token });
	});
};
const showTab = (r, on) => {
	const p = M.panel;
	M.tTab = cancel(M.tTab);
	if (!ok(p)) { M.current = null; return; }
	const foot = hudppFoot(p); // HUD++'s status and "reset" act on its own tabs: ours stand in while our tab shows
	if (on) {
		if (!r.body) {
			r.body = make('Panel', p, r.schema.prefix + 'Body', 'HudppBody AddonSettingsPart');
			r.body.style.visibility = 'collapse';
			r.foot = make('Panel', p, r.schema.prefix + 'Foot', 'HudppFoot AddonSettingsPart');
			r.foot.style.visibility = 'collapse';
			if (foot) guard('tab body', () => { p.MoveChildBefore(r.body, foot); p.MoveChildBefore(r.foot, foot); });
			r.views.push(view(r, r.body, false, r.foot));
		}
		if (!M.current) M.before = { tab: hudppButtons().find(b => b.BHasClass('HudppSelected')) || null };
		if (M.current && M.current !== r) { show(M.current.body, false); show(M.current.foot, false); }
		M.current = r;
		show(r.body, true); show(r.foot, true);
		show(foot, false);
		hudppButtons().forEach(b => flag(b, 'HudppSelected', false));
		ourButtons().forEach(b => flag(b, 'HudppSelected', b === r.tab));
		hideHudppBodies(p, true);
		flag(p, 'AddonSettingsTabShown', true);
		hookHudppTabs();
		M.tTab = $.Schedule(0.05, watchTab);
		return;
	}
	M.current = null;
	tipClear();
	unhookHudppTabs();
	show(r.body, false); show(r.foot, false);
	show(foot, true);
	flag(r.tab, 'HudppSelected', false);
	hideHudppBodies(p, false);
	if (!hudppOwnsTab() && M.before && M.before.tab) flag(M.before.tab, 'HudppSelected', true);
	flag(p, 'AddonSettingsTabShown', false); // a class change restyles the menu, so the cleared inline visibilities apply now
};
const watchTab = () => {
	M.tTab = null;
	const r = M.current;
	if (!r) return;
	let keep = false;
	try { keep = ok(M.panel) && M.panel.BHasClass('HudppOpen') && M.panel.BHasClass('AddonSettingsTabShown') && !hudppOwnsTab(); } catch (e) { keep = false; }
	if (!keep) { showTab(r, false); return; }
	M.tTab = $.Schedule(0.05, watchTab);
};

// ---------- our window (no HUD++): #AddonSettingsHost itself, in the Esc menu ----------
// An addon's style sheet does not reach the Esc menu (another layout), so the window is styled inline.
const LOOK = {
	AddonSettingsHost: { width: '820px', height: 'fit-children', maxHeight: '90%', marginLeft: '720px', verticalAlign: 'center', flowChildren: 'down', backgroundColor: '#0d100bf0', border: '1px solid #ffefd720', borderRadius: '6px' },
	AddonSettingsHead: { width: '100%', flowChildren: 'right', padding: '18px 16px 10px 24px', borderBottom: '1px solid #ffefd714' },
	AddonSettingsTitle: { fontSize: '36px', color: '#ffefd7', letterSpacing: '1px', width: 'fill-parent-flow(1)' },
	AddonSettingsClose: { width: '24px', height: '24px', verticalAlign: 'top', backgroundImage: 'url("s2r://panorama/images/icons/icon_x.vsvg")', backgroundSize: '100%', washColor: '#ffefd7aa' },
	AddonSettingsMain: { width: '100%', height: 'fit-children', flowChildren: 'right' },
	AddonSettingsSide: { width: '200px', height: 'fit-children', flowChildren: 'down', padding: '10px 0px', borderRight: '1px solid #ffefd714' },
	AddonSettingsNav: { width: '100%', padding: '10px 18px', borderLeft: '3px solid #00000000' },
	AddonSettingsNavLabel: { fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', color: '#ffefd7aa' },
	AddonSettingsPages: { width: 'fill-parent-flow(1)', flowChildren: 'down', overflow: 'squish scroll' },
	AddonSettingsPage: { width: '100%', flowChildren: 'down', padding: '4px 18px 16px 18px' },
	HudppSection: { width: '100%', flowChildren: 'down', marginTop: '10px' },
	HudppSectionTitle: { fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', color: '#ffefd788', margin: '6px 8px' },
	HudppRow: { width: '100%', height: 'fit-children', flowChildren: 'right', padding: '10px 10px', borderRadius: '4px', backgroundColor: '#ffefd70a', marginBottom: '4px' },
	HudppRowText: { width: 'fill-parent-flow(1)', flowChildren: 'down', verticalAlign: 'center' },
	HudppRowTitle: { fontSize: '18px', color: '#ffefd7dd' },
	HudppRowDesc: { fontSize: '13px', color: '#ffefd770', marginTop: '2px' },
	HudppSwitch: { width: '44px', height: '24px', borderRadius: '12px', backgroundColor: '#ffefd726', verticalAlign: 'center', marginLeft: '12px' },
	HudppKnob: { width: '18px', height: '18px', margin: '3px', borderRadius: '9px', backgroundColor: '#ffefd7' },
	HudppSlideTitle: { width: 'fill-parent-flow(1)', verticalAlign: 'center' },
	HudppSlideLead: { width: '60px', verticalAlign: 'center' },
	HudppSlideValue: { fontSize: '18px', color: '#5fe69e', horizontalAlign: 'center' },
	HudppIconButton: { width: '26px', height: '26px', verticalAlign: 'center', borderRadius: '4px', backgroundColor: '#ffefd714', margin: '0px 4px' },
	HudppSlideCol: { width: '160px', verticalAlign: 'center' },
	HudppSlider: { width: '100%' },
	HudppFoot: { width: '100%', flowChildren: 'right', padding: '12px 8px 4px 8px', marginTop: '8px', borderTop: '1px solid #ffefd714' },
	HudppFootMain: { width: 'fill-parent-flow(1)', flowChildren: 'right', verticalAlign: 'center' },
	HudppStatus: { width: 'fill-parent-flow(1)', verticalAlign: 'center', fontSize: '14px', color: '#ffefd766', textOverflow: 'shrink' },
	HudppTextButton: { padding: '6px 14px', verticalAlign: 'center', borderRadius: '4px', border: '1px solid #ffefd733' },
	HudppTextButtonLabel: { fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#ffefd7cc' }
};
const dress = p => {
	for (const c in LOOK) if (p.BHasClass(c)) { const look = LOOK[c]; for (const k in look) p.style[k] = look[k]; }
	for (let i = 0, n = p.GetChildCount(); i < n; i++) dress(p.GetChild(i));
};
const button = () => { // the ADDONS entry in Valve's Esc menu (its own look), once there is something to show
	if (ok(W.row) || !H.order.length) return;
	const sub = esc.FindChildTraverse('SubOptions');
	if (!ok(sub)) return;
	W.row = make('Panel', sub, 'AddonSettingsRow', 'AddonSettingsRow');
	const b = make('Button', W.row, 'AddonSettingsButton', 'nav_menu_item minor');
	text(b, 'menuButtonLabel', word('Addons'));
	b.SetPanelEvent('onactivate', () => guard('window', () => openWindow(!W.open))); // our own button
	const before = childWithClass(sub, 'SettingsRow');
	if (before) guard('menu button', () => sub.MoveChildBefore(W.row, before));
};
const openWindow = on => {
	const h = H.panel;
	if (on && !W.head) { // the window's parts on its first open
		for (const k in LOOK.AddonSettingsHost) h.style[k] = LOOK.AddonSettingsHost[k];
		// head and body are buttons that do nothing: a click inside the window lands on them, not on the Esc
		// menu's full-screen #EscapeBackground behind (onactivate="CitadelResumePlaying()"), which closed it
		W.head = make('Button', h, 'AddonSettingsHead', 'AddonSettingsHead');
		W.head.SetPanelEvent('onactivate', () => {}); // our own panel
		text(W.head, 'AddonSettingsTitle', word('Addons'));
		make('Button', W.head, 'AddonSettingsClose', 'AddonSettingsClose').SetPanelEvent('onactivate', () => openWindow(false)); // our own button
		const main = make('Button', h, 'AddonSettingsMain', 'AddonSettingsMain');
		main.SetPanelEvent('onactivate', () => {}); // our own panel
		W.side = make('Panel', main, '', 'AddonSettingsSide');
		W.pages = make('Panel', main, '', 'AddonSettingsPages');
		dress(W.head); dress(main);
		guard('window head', () => { h.MoveChildBefore(main, h.GetChild(0)); h.MoveChildBefore(W.head, main); });
		H.order.forEach(nav);
	}
	W.open = on;
	if (!on) tipClear();
	flag(h, 'AddonSettingsOpen', on);
	h.style.visibility = on ? 'visible' : 'collapse';
	if (on && !W.current && H.order.length) { const last = H.recs[guard('last tab', () => top().GetAttributeString(LAST_TAB, '')) || '']; pick(last || H.recs[H.order[0]]); }
};
const LAST_TAB = 'AddonSettings:tab';
const nav = id => {
	const r = H.recs[id];
	if (ok(r.nav)) return;
	r.nav = make('Button', W.side, 'AddonSettingsNav_' + id, 'AddonSettingsNav');
	text(r.nav, 'AddonSettingsNavLabel', r.schema.title);
	dress(r.nav);
	r.nav.SetPanelEvent('onactivate', () => guard('window', () => pick(r))); // our own button
};
const pick = r => {
	if (!r.page) { // its page on its first selection
		r.page = make('Panel', W.pages, r.schema.prefix + 'Body', 'AddonSettingsPage');
		const v = view(r, r.page, true);
		r.views.push(v);
		dress(r.page);
		v.sync();
	}
	W.current = r;
	guard('last tab', () => top().SetAttributeString(LAST_TAB, r.id)); // remembered until the game closes
	H.order.forEach(id => {
		const x = H.recs[id], me = x === r;
		if (ok(x.nav)) { flag(x.nav, 'AddonSettingsSelected', me); x.nav.style.borderLeft = me ? '3px solid #5fe69e' : '3px solid #00000000'; x.nav.style.backgroundColor = me ? '#ffefd70d' : '#00000000'; }
		if (ok(x.page)) show(x.page, me);
	});
};

const KINDS = ['saved', 'saving', 'error'];
const STATUS_COLOR = { '': '#ffefd766', saving: '#ffefd766', saved: '#5fe69eaa', error: '#f08a80' };


// Valve's text tooltip (the escape menu's own rows use it). The game quotes the event string with ',
// so apostrophes and backslashes in the text would break it.
let tipOn = null;
const tipShow = (p, text) => {
	if (!text || !ok(p)) return;
	tipOn = p;
	$.DispatchEvent('UIShowTextTooltip', p, String(text).replace(/['\\]/g, ''));
};
const tipHide = p => {
	if (tipOn !== p) return;
	tipOn = null;
	if (ok(p)) $.DispatchEvent('UIHideTextTooltip', p);
};
const tipClear = () => { if (tipOn) tipHide(tipOn); };
const tip = (p, textFn) => {
	p.SetPanelEvent('onmouseover', () => tipShow(p, textFn()));
	p.SetPanelEvent('onmouseout', () => tipHide(p));
};

// ---------- one addon's rows (CompLock's classes; inline looks in our window) ----------
const view = (r, body, inline, footPanel) => {
	const v = { rows: {}, bars: {}, labels: {}, status: null, syncing: false, sync: null };
	const sections = {};
	const set = (k, x) => guard('change', () => { if (still()) apply(r, k === null ? x : { [k]: x }); });
	r.schema.controls.forEach(c => {
		const sk = c.section || '';
		if (!sections[sk]) { sections[sk] = make('Panel', body, '', 'HudppSection'); if (sk) text(sections[sk], 'HudppSectionTitle', sk); }
		const parent = sections[sk], id = r.schema.prefix;
		if (c.type === 'toggle') {
			const row = make('Button', parent, id + 'Row_' + c.key, 'HudppRow HudppToggleRow');
			row.SetPanelEvent('onactivate', () => set(c.key, !r.values[c.key]));
			if (c.needs.length) { const mark = make('Panel', row, '', 'HudppChildMark'); mark.hittest = false; }
			text(row, 'HudppRowTitle', c.title);
			const sw = make('Panel', row, '', 'HudppSwitch'); sw.hittest = false;
			make('Panel', sw, '', 'HudppKnob').hittest = false;
			if (c.desc) tip(row, () => c.desc);
			if (inline) {
				row.style.height = '34px';
				row.style.padding = '0px 8px 0px 12px';
				row.style.flowChildren = 'right';
				const title = childWithClass(row, 'HudppRowTitle');
				if (title) { title.style.width = 'fill-parent-flow(1)'; title.style.verticalAlign = 'center'; title.style.whiteSpace = 'nowrap'; title.style.textOverflow = 'shrink'; }
			}
			v.rows[c.key] = row;
			return;
		}
		const row = make('Panel', parent, id + 'Row_' + c.key, 'HudppRow HudppSlideRow');
		text(row, 'HudppRowTitle HudppSlideTitle', c.title);
		const lead = make('Panel', row, '', 'HudppSlideLead'); lead.hittest = false;
		v.labels[c.key] = text(lead, 'HudppSlideValue', '');
		const by = d => {
			if (c.type === 'slider') { set(c.key, r.values[c.key] + d * c.step); return; }
			const i = c.options.findIndex(o => o.value === r.values[c.key]);
			set(c.key, c.options[(i + d + c.options.length) % c.options.length].value);
		};
		make('Button', row, id + cap(c.key) + (c.type === 'slider' ? 'Down' : 'Prev'), 'HudppIconButton HudppStepDown').SetPanelEvent('onactivate', () => by(-1));
		if (c.type === 'slider') {
			const col = make('Panel', row, '', 'HudppSlideCol');
			const bar = $.CreatePanel('Slider', col, id + cap(c.key) + 'Bar', { class: 'HorizontalSlider HudppSlider', direction: 'horizontal' });
			const thumb = bar.FindChildTraverse('SliderThumb');
			if (ok(thumb)) { make('Panel', thumb, '', 'HudppThumbDot').hittest = false; bar.AddClass('HudppDotThumb'); }
			$.RegisterEventHandler('SliderValueChanged', bar, () => { // our own slider
				if (v.syncing) return;
				const t = Number(bar.value);
				if (!isFinite(t)) return;
				const want = fix(c, c.min + t * (c.max - c.min));
				if (want !== r.values[c.key]) set(c.key, want); else v.sync(); // snap the dot onto the step
			});
			v.bars[c.key] = bar;
		}
		make('Button', row, id + cap(c.key) + (c.type === 'slider' ? 'Up' : 'Next'), 'HudppIconButton HudppStepUp').SetPanelEvent('onactivate', () => by(1));
		v.rows[c.key] = row;
	});
	// the foot, as HUD++ has it: status ("Saved") on the left, reset button on the right
	const foot = footPanel || make('Panel', body, '', 'HudppFoot AddonSettingsFoot');
	if (inline) { foot.style.width = '100%'; foot.style.flowChildren = 'right'; }
	v.status = text(foot, 'HudppStatus AddonSettingsStatus', r.status);
	if (inline) { v.status.style.width = 'fill-parent-flow(1)'; v.status.style.verticalAlign = 'center'; v.status.style.marginRight = '12px'; }
	const rb = make('Button', foot, r.schema.prefix + 'Reset', 'HudppTextButton AddonSettingsReset');
	text(rb, 'HudppTextButtonLabel', r.schema.resetLabel);
	rb.SetPanelEvent('onactivate', () => set(null, defaults(r.schema))); // our own button
	if (inline) { rb.style.verticalAlign = 'center'; rb.style.horizontalAlign = 'right'; }
	v.sync = () => {
		r.schema.controls.forEach(c => {
			const row = v.rows[c.key];
			if (!ok(row)) return;
			const live = c.needs.every(k => !!r.values[k]);
			flag(row, 'HudppRowOff', !live);
			if (inline) row.style.opacity = live ? '1' : '0.4';
			if (c.type === 'toggle') {
				const on = !!r.values[c.key];
				flag(row, 'HudppOn', on);
				if (inline) {
					const sw = childWithClass(row, 'HudppSwitch'), knob = sw ? childWithClass(sw, 'HudppKnob') : null;
					if (sw) sw.style.backgroundColor = on ? '#5fe69e' : '#ffefd726';
					if (knob) { knob.style.transform = on ? 'translateX( 20px )' : 'none'; knob.style.backgroundColor = on ? '#10130d' : '#ffefd7'; }
				}
				return;
			}
			const x = r.values[c.key];
			write(v.labels[c.key], c.type === 'slider' ? String(x) : (c.options.find(o => o.value === x) || { label: '' }).label);
			const bar = v.bars[c.key];
			const t = c.max > c.min ? (x - c.min) / (c.max - c.min) : 0;
			if (ok(bar) && !(Math.abs(Number(bar.value) - t) < 1e-6)) { v.syncing = true; try { bar.value = t; } catch (e) { /* not a slider */ } v.syncing = false; }
		});
		write(v.status, r.status);
		KINDS.forEach(k => flag(v.status, 'Hudpp_' + k, r.kind === k));
		if (inline) { const color = STATUS_COLOR[r.kind] || STATUS_COLOR['']; if (v.status.style.color !== color) v.status.style.color = color; }
	};
	v.sync();
	return v;
};

// ---------- store page (deadlockconfig.com, the page and message format CompLock uses) ----------
// URL fragment #{"id","op":"get"|"set","key","value"} in, page title "HUDPP:{id,value|error}" back. A hidden
// browser panel made for a burst of jobs and deleted after (3 s after a save, at once after loads).
const vault = (() => {
	const PAGE = 'https://deadlockconfig.com/docs/hudpp-store/store.html';
	const WAIT = 8, LINGER = 3;
	let page = null, ready = false, lines = [], current = null, serial = 0, lastSet = false;
	let tReply = null, tLoad = null, tLinger = null;
	const shut = () => { tLinger = cancel(tLinger); tLoad = cancel(tLoad); if (ok(page)) page.DeleteAsync(0); page = null; ready = false; };
	const settle = (err, value) => {
		const job = current;
		current = null; tReply = cancel(tReply);
		if (job) guard('store reply', () => job.cb(err, value));
		if (err && !ready) { const rest = lines; lines = []; rest.forEach(j => guard('store reply', () => j.cb(err))); shut(); return; }
		pump();
	};
	const pump = () => {
		if (!ready || current) return;
		tLinger = cancel(tLinger);
		if (!lines.length) { tLinger = $.Schedule(lastSet ? LINGER : 0, () => { tLinger = null; if (!current && !lines.length) shut(); }); return; }
		current = lines.shift();
		lastSet = current.op === 'set';
		tReply = $.Schedule(WAIT, () => { tReply = null; settle('timeout'); });
		page.SetURL(PAGE + '#' + encodeURIComponent(JSON.stringify({ id: current.id, op: current.op, key: current.key, value: current.value })));
	};
	const onTitle = (p, title) => {
		if (p !== page || typeof title !== 'string') return;
		if (title.indexOf('HUDPP_READY') === 0) { tLoad = cancel(tLoad); ready = true; pump(); return; }
		if (title.indexOf('HUDPP_ERROR') === 0) { tLoad = cancel(tLoad); ready = false; settle(title); return; }
		if (title.indexOf('HUDPP:') !== 0 || !current) return;
		const reply = parse(title.slice(6));
		if (reply && reply.id === current.id) settle(reply.error || null, reply.value);
	};
	const open = () => {
		if (ok(page)) return;
		page = $.CreatePanel('CitadelHTMLPanel', top(), 'AddonSettingsVault');
		page.hittest = false; page.acceptsfocus = false;
		page.style.width = '2px'; page.style.height = '2px'; page.style.opacity = '0.01';
		ready = false;
		$.RegisterEventHandler('HTMLTitle', page, onTitle); // our own panel
		page.SetURL(PAGE);
		tLoad = $.Schedule(WAIT, () => { tLoad = null; if (!ready) settle('page did not load'); });
	};
	const job = (op, key, value, cb) => { lines.push({ id: ++serial, op: op, key: key, value: value, cb: cb }); try { open(); } catch (e) { settle(String(e)); return; } pump(); };
	return {
		get: (key, cb) => job('get', key, null, (err, value) => { if (err) { cb(err, null); return; } const v = parse(value); if (value && !v) { cb('bad saved settings', null); return; } cb(null, v); }),
		set: (key, value, cb) => job('set', key, value, err => cb(err || null))
	};
})();

return {
	API: API, BUILD: BUILD, VERSION: VERSION,
	register: register,
	// the game's language ('english', 'german', ...) and a text in it: '#Token' via the game's loc files,
	// else table[language].Token, else table.english.Token; {0} {1} take args
	language: language,
	localize: localize,
	// optional, for an addon with its own timer: ride(() => itsTimerRuns) and pulse() on each of its ticks let
	// the host's look at HUD++'s menu share that timer instead of running its own 4 Hz one
	ride: f => { H.rider = f; },
	pulse: () => { if (H.on && !H.done && !H.tWatch) watch(); }
};
})();
