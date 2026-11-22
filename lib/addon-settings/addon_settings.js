// Addon Settings: one settings home for Deadlock Panorama addons (lib/addon-settings, MIT).
// Vendored into each addon's script by lib/addon-settings/vendor.sh; do not edit a vendored copy.
// Docs: docs/ADDON-SETTINGS-API.md.
//
// Every addon that embeds this file registers a schema; one embedded copy (the highest BUILD) hosts.
// Each schema has placement 'addons' (default) or 'complock'. The ADDONS host is a CompLock-shaped
// panel opened from an ADDONS button in the Esc menu (same widget classes and names as CompLock).
// placement 'complock' puts a tab in CompLock HUD++'s menu when HUD++ is installed, and falls back
// to ADDONS when it is not. Values stay on deadlockconfig.com, one key per addon (<id>_settings).
// Addons' scripts do not share JavaScript: everything between copies goes through panels and their
// attribute strings under #EscapeMenu > #AddonSettingsHost, with 'Activated' events as the doorbell.
// Nothing is built, timed or watched beyond that until a menu is opened; no handlers on Valve's or
// HUD++'s panels.
const AddonSettings = (() => {
const API = 1; // wire protocol (ids, attributes, JSON shapes); bump only on incompatible changes
const BUILD = 9; // this implementation; the highest build among the installed copies hosts
const VERSION = '1.2.3';
const HOST = 'AddonSettingsHost', CLIENT = 'AddonSettingsClient', CLIENT_ID = 'AddonSettingsClient_';

const ok = p => !!(p && p.IsValid && p.IsValid());
const cancel = h => { if (h) { try { $.CancelScheduled(h); } catch (e) { /* ran */ } } return null; };
const say = m => { try { $.Msg('Addon Settings: ' + m); } catch (e) { /* no console */ } };
const guard = (what, f) => { try { return f(); } catch (e) { say(what + ': ' + e); return undefined; } };
const make = (type, parent, id, cls) => { const p = $.CreatePanel(type, parent, id || ''); if (cls) cls.split(' ').forEach(c => { if (c) p.AddClass(c); }); return p; };
const text = (parent, cls, t, id) => { const l = make('Label', parent, id || '', cls); l.hittest = false; l.text = t; return l; };
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
	english: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Reset tab', AddonSettings_Saving: 'Saving...', AddonSettings_Saved: 'Saved', AddonSettings_NotLoaded: 'Saved settings not loaded ({0})', AddonSettings_NotSaved: 'Not saved ({0}), kept until the game closes', AddonSettings_Undo: 'Undo', AddonSettings_Reset: 'Reset', AddonSettings_ResetTo: 'Reset to {0}', AddonSettings_Needs: 'Needs {0}', AddonSettings_KeptSession: 'Kept until the game closes', AddonSettings_NotSavedYet: 'Not saved yet', AddonSettings_NotLoadedShort: 'Not loaded', AddonSettings_NotSavedShort: 'Not saved' },
	german: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Tab zurücksetzen', AddonSettings_Saving: 'Speichern...', AddonSettings_Saved: 'Gespeichert', AddonSettings_NotLoaded: 'Gespeicherte Einstellungen nicht geladen ({0})', AddonSettings_NotSaved: 'Nicht gespeichert ({0}), gilt bis zum Spielende', AddonSettings_Undo: 'Rückgängig', AddonSettings_Reset: 'Zurücksetzen', AddonSettings_ResetTo: 'Zurücksetzen auf {0}', AddonSettings_Needs: 'Benötigt {0}', AddonSettings_KeptSession: 'Gilt bis zum Spielende', AddonSettings_NotSavedYet: 'Noch nicht gespeichert', AddonSettings_NotLoadedShort: 'Nicht geladen', AddonSettings_NotSavedShort: 'Nicht gespeichert' },
	french: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Réinitialiser', AddonSettings_Saving: 'Enregistrement...', AddonSettings_Saved: 'Enregistré', AddonSettings_NotLoaded: 'Paramètres enregistrés non chargés ({0})', AddonSettings_NotSaved: 'Non enregistré ({0}), conservé jusqu\'à la fermeture du jeu', AddonSettings_Undo: 'Undo', AddonSettings_Reset: 'Reset', AddonSettings_ResetTo: 'Reset to {0}', AddonSettings_Needs: 'Needs {0}', AddonSettings_KeptSession: 'Kept until the game closes', AddonSettings_NotSavedYet: 'Not saved yet', AddonSettings_NotLoadedShort: 'Not loaded', AddonSettings_NotSavedShort: 'Not saved' },
	spanish: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Restablecer', AddonSettings_Saving: 'Guardando...', AddonSettings_Saved: 'Guardado', AddonSettings_NotLoaded: 'Ajustes guardados no cargados ({0})', AddonSettings_NotSaved: 'No guardado ({0}), se mantiene hasta cerrar el juego', AddonSettings_Undo: 'Undo', AddonSettings_Reset: 'Reset', AddonSettings_ResetTo: 'Reset to {0}', AddonSettings_Needs: 'Needs {0}', AddonSettings_KeptSession: 'Kept until the game closes', AddonSettings_NotSavedYet: 'Not saved yet', AddonSettings_NotLoadedShort: 'Not loaded', AddonSettings_NotSavedShort: 'Not saved' },
	latam: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Restablecer', AddonSettings_Saving: 'Guardando...', AddonSettings_Saved: 'Guardado', AddonSettings_NotLoaded: 'Configuración guardada no cargada ({0})', AddonSettings_NotSaved: 'No guardado ({0}), se mantiene hasta cerrar el juego', AddonSettings_Undo: 'Undo', AddonSettings_Reset: 'Reset', AddonSettings_ResetTo: 'Reset to {0}', AddonSettings_Needs: 'Needs {0}', AddonSettings_KeptSession: 'Kept until the game closes', AddonSettings_NotSavedYet: 'Not saved yet', AddonSettings_NotLoadedShort: 'Not loaded', AddonSettings_NotSavedShort: 'Not saved' },
	brazilian: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Redefinir aba', AddonSettings_Saving: 'Salvando...', AddonSettings_Saved: 'Salvo', AddonSettings_NotLoaded: 'Configurações salvas não carregadas ({0})', AddonSettings_NotSaved: 'Não salvo ({0}), mantido até fechar o jogo', AddonSettings_Undo: 'Undo', AddonSettings_Reset: 'Reset', AddonSettings_ResetTo: 'Reset to {0}', AddonSettings_Needs: 'Needs {0}', AddonSettings_KeptSession: 'Kept until the game closes', AddonSettings_NotSavedYet: 'Not saved yet', AddonSettings_NotLoadedShort: 'Not loaded', AddonSettings_NotSavedShort: 'Not saved' },
	italian: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Ripristina scheda', AddonSettings_Saving: 'Salvataggio...', AddonSettings_Saved: 'Salvato', AddonSettings_NotLoaded: 'Impostazioni salvate non caricate ({0})', AddonSettings_NotSaved: 'Non salvato ({0}), mantenuto fino alla chiusura del gioco', AddonSettings_Undo: 'Undo', AddonSettings_Reset: 'Reset', AddonSettings_ResetTo: 'Reset to {0}', AddonSettings_Needs: 'Needs {0}', AddonSettings_KeptSession: 'Kept until the game closes', AddonSettings_NotSavedYet: 'Not saved yet', AddonSettings_NotLoadedShort: 'Not loaded', AddonSettings_NotSavedShort: 'Not saved' },
	polish: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Zresetuj kartę', AddonSettings_Saving: 'Zapisywanie...', AddonSettings_Saved: 'Zapisano', AddonSettings_NotLoaded: 'Nie wczytano zapisanych ustawień ({0})', AddonSettings_NotSaved: 'Nie zapisano ({0}), obowiązuje do zamknięcia gry', AddonSettings_Undo: 'Undo', AddonSettings_Reset: 'Reset', AddonSettings_ResetTo: 'Reset to {0}', AddonSettings_Needs: 'Needs {0}', AddonSettings_KeptSession: 'Kept until the game closes', AddonSettings_NotSavedYet: 'Not saved yet', AddonSettings_NotLoadedShort: 'Not loaded', AddonSettings_NotSavedShort: 'Not saved' },
	czech: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Resetovat kartu', AddonSettings_Saving: 'Ukládání...', AddonSettings_Saved: 'Uloženo', AddonSettings_NotLoaded: 'Uložená nastavení nenačtena ({0})', AddonSettings_NotSaved: 'Neuloženo ({0}), platí do zavření hry', AddonSettings_Undo: 'Undo', AddonSettings_Reset: 'Reset', AddonSettings_ResetTo: 'Reset to {0}', AddonSettings_Needs: 'Needs {0}', AddonSettings_KeptSession: 'Kept until the game closes', AddonSettings_NotSavedYet: 'Not saved yet', AddonSettings_NotLoadedShort: 'Not loaded', AddonSettings_NotSavedShort: 'Not saved' },
	russian: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Сбросить вкладку', AddonSettings_Saving: 'Сохранение...', AddonSettings_Saved: 'Сохранено', AddonSettings_NotLoaded: 'Сохранённые настройки не загружены ({0})', AddonSettings_NotSaved: 'Не сохранено ({0}), действует до закрытия игры', AddonSettings_Undo: 'Undo', AddonSettings_Reset: 'Reset', AddonSettings_ResetTo: 'Reset to {0}', AddonSettings_Needs: 'Needs {0}', AddonSettings_KeptSession: 'Kept until the game closes', AddonSettings_NotSavedYet: 'Not saved yet', AddonSettings_NotLoadedShort: 'Not loaded', AddonSettings_NotSavedShort: 'Not saved' },
	ukrainian: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Скинути вкладку', AddonSettings_Saving: 'Збереження...', AddonSettings_Saved: 'Збережено', AddonSettings_NotLoaded: 'Збережені налаштування не завантажено ({0})', AddonSettings_NotSaved: 'Не збережено ({0}), діє до закриття гри', AddonSettings_Undo: 'Undo', AddonSettings_Reset: 'Reset', AddonSettings_ResetTo: 'Reset to {0}', AddonSettings_Needs: 'Needs {0}', AddonSettings_KeptSession: 'Kept until the game closes', AddonSettings_NotSavedYet: 'Not saved yet', AddonSettings_NotLoadedShort: 'Not loaded', AddonSettings_NotSavedShort: 'Not saved' },
	turkish: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Sekmeyi sıfırla', AddonSettings_Saving: 'Kaydediliyor...', AddonSettings_Saved: 'Kaydedildi', AddonSettings_NotLoaded: 'Kayıtlı ayarlar yüklenemedi ({0})', AddonSettings_NotSaved: 'Kaydedilmedi ({0}), oyun kapanana kadar geçerli', AddonSettings_Undo: 'Undo', AddonSettings_Reset: 'Reset', AddonSettings_ResetTo: 'Reset to {0}', AddonSettings_Needs: 'Needs {0}', AddonSettings_KeptSession: 'Kept until the game closes', AddonSettings_NotSavedYet: 'Not saved yet', AddonSettings_NotLoadedShort: 'Not loaded', AddonSettings_NotSavedShort: 'Not saved' },
	indonesian: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'Reset tab', AddonSettings_Saving: 'Menyimpan...', AddonSettings_Saved: 'Tersimpan', AddonSettings_NotLoaded: 'Pengaturan tersimpan tidak dimuat ({0})', AddonSettings_NotSaved: 'Tidak tersimpan ({0}), berlaku sampai game ditutup', AddonSettings_Undo: 'Undo', AddonSettings_Reset: 'Reset', AddonSettings_ResetTo: 'Reset to {0}', AddonSettings_Needs: 'Needs {0}', AddonSettings_KeptSession: 'Kept until the game closes', AddonSettings_NotSavedYet: 'Not saved yet', AddonSettings_NotLoadedShort: 'Not loaded', AddonSettings_NotSavedShort: 'Not saved' },
	thai: { AddonSettings_Addons: 'ADDONS', AddonSettings_ResetTab: 'รีเซ็ตแท็บ', AddonSettings_Saving: 'กำลังบันทึก...', AddonSettings_Saved: 'บันทึกแล้ว', AddonSettings_NotLoaded: 'โหลดการตั้งค่าที่บันทึกไม่ได้ ({0})', AddonSettings_NotSaved: 'บันทึกไม่ได้ ({0}) ใช้ได้จนกว่าจะปิดเกม', AddonSettings_Undo: 'Undo', AddonSettings_Reset: 'Reset', AddonSettings_ResetTo: 'Reset to {0}', AddonSettings_Needs: 'Needs {0}', AddonSettings_KeptSession: 'Kept until the game closes', AddonSettings_NotSavedYet: 'Not saved yet', AddonSettings_NotLoadedShort: 'Not loaded', AddonSettings_NotSavedShort: 'Not saved' },
	japanese: { AddonSettings_Addons: 'アドオン', AddonSettings_ResetTab: 'タブをリセット', AddonSettings_Saving: '保存中...', AddonSettings_Saved: '保存しました', AddonSettings_NotLoaded: '保存した設定を読み込めません ({0})', AddonSettings_NotSaved: '保存できません ({0})。ゲーム終了まで有効です', AddonSettings_Undo: 'Undo', AddonSettings_Reset: 'Reset', AddonSettings_ResetTo: 'Reset to {0}', AddonSettings_Needs: 'Needs {0}', AddonSettings_KeptSession: 'Kept until the game closes', AddonSettings_NotSavedYet: 'Not saved yet', AddonSettings_NotLoadedShort: 'Not loaded', AddonSettings_NotSavedShort: 'Not saved' },
	koreana: { AddonSettings_Addons: '애드온', AddonSettings_ResetTab: '탭 초기화', AddonSettings_Saving: '저장 중...', AddonSettings_Saved: '저장됨', AddonSettings_NotLoaded: '저장된 설정을 불러오지 못함 ({0})', AddonSettings_NotSaved: '저장되지 않음 ({0}), 게임 종료 시까지 유지', AddonSettings_Undo: 'Undo', AddonSettings_Reset: 'Reset', AddonSettings_ResetTo: 'Reset to {0}', AddonSettings_Needs: 'Needs {0}', AddonSettings_KeptSession: 'Kept until the game closes', AddonSettings_NotSavedYet: 'Not saved yet', AddonSettings_NotLoadedShort: 'Not loaded', AddonSettings_NotSavedShort: 'Not saved' },
	schinese: { AddonSettings_Addons: '插件', AddonSettings_ResetTab: '重置标签页', AddonSettings_Saving: '正在保存...', AddonSettings_Saved: '已保存', AddonSettings_NotLoaded: '未能加载已保存的设置 ({0})', AddonSettings_NotSaved: '未保存 ({0})，在关闭游戏前有效', AddonSettings_Undo: 'Undo', AddonSettings_Reset: 'Reset', AddonSettings_ResetTo: 'Reset to {0}', AddonSettings_Needs: 'Needs {0}', AddonSettings_KeptSession: 'Kept until the game closes', AddonSettings_NotSavedYet: 'Not saved yet', AddonSettings_NotLoadedShort: 'Not loaded', AddonSettings_NotSavedShort: 'Not saved' },
	tchinese: { AddonSettings_Addons: '插件', AddonSettings_ResetTab: '重置分頁', AddonSettings_Saving: '正在儲存...', AddonSettings_Saved: '已儲存', AddonSettings_NotLoaded: '無法載入已儲存的設定 ({0})', AddonSettings_NotSaved: '未儲存 ({0})，在關閉遊戲前有效', AddonSettings_Undo: 'Undo', AddonSettings_Reset: 'Reset', AddonSettings_ResetTo: 'Reset to {0}', AddonSettings_Needs: 'Needs {0}', AddonSettings_KeptSession: 'Kept until the game closes', AddonSettings_NotSavedYet: 'Not saved yet', AddonSettings_NotLoadedShort: 'Not loaded', AddonSettings_NotSavedShort: 'Not saved' }
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
	const place = s.placement === 'complock' ? 'complock' : 'addons';
	const author = (typeof s.author === 'string' ? s.author : '').trim();
	const out = { api: API, id: s.id, title: L(s.title || s.id), resetLabel: s.resetLabel ? L(s.resetLabel) : word('ResetTab'), prefix: /^[A-Za-z][A-Za-z0-9]*$/.test(s.prefix || '') ? s.prefix : 'As' + s.id.replace(/(^|_)([a-z0-9])/g, (m, a, b) => b.toUpperCase()), placement: place, author: author, controls: [] };
	(s.controls || []).forEach(c => {
		if (!c || !/^[A-Za-z][A-Za-z0-9_]*$/.test(c.key || '') || !TYPES[c.type]) { say(s.id + ': control skipped (key or type): ' + JSON.stringify(c)); return; }
		const d = { key: c.key, type: c.type, title: L(c.title || c.key), desc: L(c.desc || ''), section: L(c.section || s.section || s.title || s.id), needs: Array.isArray(c.needs) ? c.needs.filter(k => typeof k === 'string') : [], invert: c.type === 'toggle' && !!c.invert };
		if (c.type === 'slider') { d.min = Number(c.min) || 0; d.max = Math.max(d.min, Number(c.max)); d.step = Number(c.step) > 0 ? Number(c.step) : 1; if (!isFinite(d.max)) d.max = d.min + 1; }
		if (c.type === 'select') { d.options = (c.options || []).map(o => (o && typeof o === 'object') ? { value: o.value, label: L(o.label === undefined ? o.value : o.label) } : { value: o, label: String(o) }); if (!d.options.length) return; }
		d.default = c.type === 'toggle' ? !!c.default : c.type === 'select' ? (d.options.some(o => o.value === c.default) ? c.default : d.options[0].value) : d.min;
		if (c.type === 'slider') d.default = fix(d, c.default);
		out.controls.push(d);
	});
	// schema.toggle names the master on/off control (must already be a toggle).
	// Older clients omit the field: promote the first/only 'on' toggle, or a single toggle named like the addon.
	const tog = typeof s.toggle === 'string' ? s.toggle : '';
	out.toggle = (tog && out.controls.some(c => c.key === tog && c.type === 'toggle')) ? tog : '';
	if (!out.toggle) {
		const toggles = out.controls.filter(c => c.type === 'toggle');
		const first = toggles[0];
		const only = toggles.length === 1 ? first : null;
		const norm = x => String(x || '').toLowerCase().replace(/[\s_-]+/g, '');
		const like = t => t && (norm(t.key) === norm(s.id) || norm(t.key) === norm(out.title) || norm(t.title) === norm(s.id) || norm(t.title) === norm(out.title));
		if (first && first.key === 'on') out.toggle = first.key;
		else if (only && like(only)) out.toggle = only.key;
	}
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
const findEsc = () => {
	for (let a = $.GetContextPanel(); ok(a); a = a.GetParent()) {
		if (a.id === 'EscapeMenu') return a;
		const e = a.FindChild('EscapeMenu');
		if (ok(e)) return e;
	}
	const root = top();
	return ok(root) ? root.FindChildTraverse('EscapeMenu') : null;
};
const start = () => { if (!started) { started = true; $.Schedule(0, attach); } };
const attach = () => { // 4 Hz for 10 s, then every 5 s for a minute: addons do not change mid-game
	esc = guard('Esc menu', findEsc) || null;
	if (!esc) {
		if (++looks > 52) { say('Esc menu: not found looks=' + looks); say('no Esc menu found: default settings, no settings menu'); return; }
		if (looks === 1 || looks === 10 || looks === 40) say('Esc menu: not found looks=' + looks);
		$.Schedule(looks > 40 ? 5 : 0.25, attach);
		return;
	}
	say('Esc menu: found looks=' + looks);
	let host = esc.FindChild(HOST);
	if (!ok(host)) { host = make('Panel', esc, HOST, HOST); host.style.visibility = 'collapse'; serve(host, false); }
	else if ((Number(host.GetAttributeString('build', '0')) || 0) < BUILD) serve(host, true);
	Object.keys(mine).forEach(id => plant(mine[id], host));
	ring(host);
};

// ---------- the host ----------
const H = { on: false, panel: null, token: '', recs: {}, order: [], mode: '', looks: 0, tWatch: null, rider: null, done: false, hudpp: false };
const M = { panel: null, wasOpen: false, built: false, current: null, before: null, tTab: null, hooks: null }; // CompLock HUD++ menu
const W = { row: null, menu: null, head: null, titles: null, bodies: null, foot: null, status: null, open: false, current: null }; // ADDONS host

const placementOf = r => (H.hudpp && r.schema.placement === 'complock') ? 'complock' : 'addons';
const addonsIds = () => H.order.filter(id => placementOf(H.recs[id]) === 'addons');
const complockIds = () => H.order.filter(id => placementOf(H.recs[id]) === 'complock');
const still = () => H.on && ok(H.panel) && H.panel.GetAttributeString('token', '') === H.token;

const serve = (panel, takeover) => {
	if (takeover) guard('take over', () => { // an older copy hosted: its menu entries go, ours come on demand
		const sub = esc.FindChildTraverse('SubOptions');
		const btn = ok(sub) ? sub.FindChildTraverse('AddonSettingsButton') : null;
		if (ok(btn)) btn.DeleteAsync(0);
		const row = ok(sub) ? sub.FindChild('AddonSettingsRow') : null;
		if (ok(row)) row.DeleteAsync(0);
		restorePins();
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
	flushProbe();
};
const SESSION = id => 'AddonSettings:' + id;
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
			r = H.recs[id] = { id: id, panel: p, raw: raw, schema: s, values: defaults(s), stored: null, saved: old && old.saved || null, known: !!(old && old.known), status: '', statusMore: '', kind: '', tSave: null, views: [], tab: null, body: null, foot: null, nav: null, page: null, undo: null, undoTimer: null };
			if (old) {
				take(s, r.values, old.values);
				const session = parse(top().GetAttributeString(SESSION(id), ''));
				if (session) take(s, r.values, session);
				if (old.saved) take(s, r.values, old.saved);
				r.stored = old.stored; r.status = old.status; r.statusMore = old.statusMore; r.kind = old.kind;
				if (old.tab && ok(old.tab)) r.tab = old.tab;
				if (old.body && ok(old.body)) r.body = old.body;
				if (old.foot && ok(old.foot)) r.foot = old.foot;
				if (old.page && ok(old.page)) r.page = old.page;
			} else { H.order.push(id); added = true; }
			if (old) push(r); else load(r);
		}
		const set = parse(p.GetAttributeString('set', ''));
		if (set) { p.SetAttributeString('set', ''); apply(r, set); }
	}
	if (added) grow();
};
const atDefaults = r => r.schema.controls.every(c => r.values[c.key] === c.default);
const clearUndo = r => { r.undoTimer = cancel(r.undoTimer); r.undo = null; };
const load = r => {
	const session = parse(top().GetAttributeString(SESSION(r.id), ''));
	if (session) { take(r.schema, r.values, session); r.saved = session; r.stored = JSON.stringify(r.values); r.known = true; push(r); return; } // a HUD reload: no page load
	push(r);
	vault.get(r.id + '_settings', (err, saved) => {
		if (!still()) return;
		if (err) { status(r, word('NotLoadedShort'), 'error', word('NotLoaded', [err])); return; }
		r.saved = saved && typeof saved === 'object' ? saved : {};
		take(r.schema, r.values, r.saved);
		r.stored = JSON.stringify(r.values);
		r.known = true;
		push(r);
	});
};
const push = r => {
	if (ok(r.panel)) { r.panel.SetAttributeString('values', JSON.stringify({ v: API, values: r.values, status: r.status })); ring(r.panel); }
	r.views.forEach(v => v.sync());
};
const status = (r, t, kind, more) => { r.status = t; r.kind = kind || ''; r.statusMore = more || ''; push(r); };
const apply = (r, patch) => {
	let changed = false;
	r.schema.controls.forEach(c => { if (c.key in patch) { const v = fix(c, patch[c.key]); if (v !== r.values[c.key]) { r.values[c.key] = v; changed = true; } } });
	if (!changed) { r.views.forEach(v => v.sync()); return; }
	clearUndo(r);
	guard('session copy', () => top().SetAttributeString(SESSION(r.id), JSON.stringify(r.values)));
	if (!r.known) { status(r, word('NotSavedYet'), 'session', word('KeptSession')); r.views.forEach(v => v.sync()); return; }
	status(r, word('Saving'), 'saving');
	r.tSave = cancel(r.tSave);
	r.tSave = $.Schedule(0.6, () => { // one save for a burst of changes
		r.tSave = null;
		if (!still()) return;
		const now = JSON.stringify(r.values);
		if (now === r.stored) { status(r, word('Saved'), 'saved'); return; } // changed back to what is stored: no page load
		vault.set(r.id + '_settings', JSON.stringify(Object.assign({ t: Date.now() }, r.values)), err => {
			if (!err) { r.stored = now; r.saved = Object.assign({}, r.values); status(r, word('Saved'), 'saved'); }
			else status(r, word('NotSavedShort'), 'error', word('NotSaved', [err]));
		});
	});
};
const resetAddon = r => {
	if (r.undo) { const back = r.undo; clearUndo(r); apply(r, back); return; }
	if (atDefaults(r)) { r.views.forEach(v => v.sync()); return; }
	const before = Object.assign({}, r.values);
	r.schema.controls.forEach(c => { r.values[c.key] = c.default; });
	r.undo = before;
	r.undoTimer = $.Schedule(6, () => { r.undoTimer = null; r.undo = null; r.views.forEach(v => v.sync()); });
	guard('session copy', () => top().SetAttributeString(SESSION(r.id), JSON.stringify(r.values)));
	if (!r.known) { status(r, word('NotSavedYet'), 'session', word('KeptSession')); r.views.forEach(v => v.sync()); return; }
	status(r, word('Saving'), 'saving');
	r.tSave = cancel(r.tSave);
	r.tSave = $.Schedule(0.6, () => {
		r.tSave = null;
		if (!still()) return;
		const now = JSON.stringify(r.values);
		if (now === r.stored) { status(r, word('Saved'), 'saved'); return; }
		vault.set(r.id + '_settings', JSON.stringify(Object.assign({ t: Date.now() }, r.values)), err => {
			if (!err) { r.stored = now; r.saved = Object.assign({}, r.values); status(r, word('Saved'), 'saved'); }
			else status(r, word('NotSavedShort'), 'error', word('NotSaved', [err]));
		});
	});
	r.views.forEach(v => v.sync());
};


// ---------- where the settings show: ADDONS in the Esc menu, plus CompLock tabs when asked ----------
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
		H.hudpp = true;
		say('build ' + BUILD + ' hosts; ADDONS in the Esc menu, CompLock tabs when an addon asks for them');
		grow();
	}
	// HUD++ builds #HudppPanel on its first open and keeps it: until then one class read per look
	if (!ok(M.panel)) { const p = esc.FindChild('HudppPanel'); M.panel = ok(p) ? p : null; }
	const open = !!M.panel && M.panel.BHasClass('HudppOpen');
	if (open && !M.wasOpen) guard('CompLock tabs', tabs);
	M.wasOpen = open;
	return M.built ? 0 : 0.25;
};
const grow = () => { // new addons registered: their entries where the menu already is
	if (H.hudpp && M.built) guard('CompLock tabs', tabs);
	guard('ADDONS window', () => { button(); if (W.bodies) addonsIds().forEach(id => guard('addon ' + id, () => mount(id))); });
	flushProbe();
};

// ---------- CompLock tabs (placement: 'complock' only, when HUD++ is installed) ----------
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
	complockIds().forEach(id => {
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
const ourButtons = () => complockIds().map(id => H.recs[id].tab).filter(ok);
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
// closed-over tab, so if the player was on Crosshair, then a hosted tab, a Crosshair click is a no-op:
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

// ---------- ADDONS host: a CompLock-shaped panel in the Esc menu ----------
// An addon's style sheet does not reach the Esc menu (another layout), so without HUD++ the
// panel is styled inline. With HUD++ the same widget class names pick up CompLock's look.
const LOOK = {
	AddonSettingsHost: { width: '560px', height: 'fit-children', maxHeight: '90%', marginLeft: '640px', verticalAlign: 'center', flowChildren: 'down', backgroundColor: '#0d100bf0', border: '1px solid #ffefd720', borderRadius: '6px' },
	AddonSettingsHead: { width: '100%', flowChildren: 'right', padding: '14px 12px 10px 20px', borderBottom: '1px solid #ffefd714' },
	HudppTitles: { width: 'fill-parent-flow(1)', flowChildren: 'right', verticalAlign: 'center' },
	AddonSettingsTitle: { fontSize: '34px', color: '#ffefd7', letterSpacing: '3px', verticalAlign: 'center' },
	HudppCredit: { flowChildren: 'right', verticalAlign: 'center', marginLeft: '12px' },
	HudppCreditBy: { fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', color: '#ffefd799', verticalAlign: 'center', marginRight: '6px' },
	HudppCreditName: { fontSize: '13px', color: '#ffefd7aa', verticalAlign: 'center' },
	HudppClose: { width: '32px', height: '32px', verticalAlign: 'center', backgroundSize: '14px 14px', backgroundColor: '#ffefd70a', backgroundImage: 'url("s2r://panorama/images/icons/icon_x.vsvg")', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', washColor: '#ffefd7aa', borderRadius: '6px' },
	AddonSettingsMain: { width: '100%', height: 'fit-children', maxHeight: '640px', flowChildren: 'down', overflow: 'squish scroll' },
	AddonSettingsBodies: { width: '100%', flowChildren: 'down', padding: '10px 14px 28px 14px' },
	AddonSettingsBlock: { width: '100%', flowChildren: 'down', marginBottom: '14px', padding: '10px 12px 12px 12px', backgroundColor: '#ffefd70a', border: '1px solid #ffefd716', borderRadius: '8px' },
	AddonSettingsAddonHead: { width: '100%', height: 'fit-children', minHeight: '44px', flowChildren: 'right', padding: '4px 4px 6px 2px' },
	AddonSettingsAddonTitle: { fontSize: '18px', color: '#ffefd7', verticalAlign: 'center', whiteSpace: 'nowrap', textOverflow: 'shrink' },
	AddonSettingsTitles: { width: 'fill-parent-flow(1)', flowChildren: 'down', verticalAlign: 'center', marginRight: '8px' },
	AddonSettingsAuthor: { fontSize: '10px', color: '#ffefd755', marginTop: '1px' },
	AddonSettingsReset: { width: '24px', height: '24px', verticalAlign: 'center', marginLeft: '4px', marginRight: '6px', backgroundSize: '12px 12px', backgroundColor: '#ffefd70a', backgroundImage: 'url("s2r://panorama/images/icons/icon_refresh.vsvg")', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', washColor: '#ffefd7aa', borderRadius: '6px' },
	AddonSettingsSettings: { width: '100%', flowChildren: 'down', padding: '6px 0px 0px 4px' },
	AddonSettingsPage: { width: '100%', flowChildren: 'down' },
	HudppTab: { padding: '8px 14px', marginRight: '4px' },
	HudppTabLabel: { fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', color: '#ffefd7aa' },
	HudppSection: { width: '100%', flowChildren: 'down' },
	HudppGap: { marginTop: '10px' },
	HudppSectionTitle: { fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', color: '#ffefd799', margin: '10px 6px 6px 6px' },
	AddonSettingsSectionTitle: { fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', color: '#ffefd7aa', margin: '12px 4px 8px 4px' },
	HudppRow: { width: '100%', height: '34px', flowChildren: 'right', padding: '0px 8px 0px 12px', borderRadius: '4px', backgroundColor: '#ffefd70a', marginBottom: '4px' },
	HudppRowText: { width: 'fill-parent-flow(1)', flowChildren: 'down', verticalAlign: 'center' },
	HudppRowTitle: { fontSize: '18px', color: '#ffefd7dd', width: 'fill-parent-flow(1)', verticalAlign: 'center', whiteSpace: 'nowrap', textOverflow: 'shrink' },
	HudppRowDesc: { fontSize: '13px', color: '#ffefd770', marginTop: '2px' },
	HudppSwitch: { width: '44px', height: '24px', borderRadius: '12px', backgroundColor: '#ffefd726', verticalAlign: 'center', marginLeft: '12px' },
	HudppKnob: { width: '18px', height: '18px', margin: '3px', borderRadius: '9px', backgroundColor: '#ffefd7' },
	HudppChoice: { padding: '4px 10px', marginLeft: '4px', verticalAlign: 'center', borderRadius: '4px', backgroundColor: '#ffefd714' },
	HudppChoiceLabel: { fontSize: '14px', color: '#ffefd7cc' },
	HudppChoiceTitle: { width: 'fill-parent-flow(1)', verticalAlign: 'center' },
	HudppSlideTitle: { width: 'fill-parent-flow(1)', verticalAlign: 'center' },
	HudppSlideLead: { width: '60px', verticalAlign: 'center' },
	HudppSlideValue: { fontSize: '18px', color: '#5fe69e', horizontalAlign: 'center' },
	HudppSlideReset: { visibility: 'collapse' },
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
// HUD++'s stylesheet is global, but it has no rules for our AddonSettingsMain / Bodies / Tabs wrappers.
// 1.0.4 skipped dress() entirely when HUD++ was present, so those wrappers had no width or flow-children
// and the tab bar and body laid out at zero size. Chrome is always dressed; widget rows stay undressed
// when HUD++ is present so its HudppRow / HudppSwitch look still applies.
const CHROME = { AddonSettingsHost: 1, AddonSettingsHead: 1, AddonSettingsTitle: 1, AddonSettingsMain: 1, AddonSettingsBodies: 1, AddonSettingsBlock: 1, AddonSettingsAddonHead: 1, AddonSettingsAddonTitle: 1, AddonSettingsTitles: 1, AddonSettingsAuthor: 1, AddonSettingsReset: 1, AddonSettingsSectionTitle: 1, AddonSettingsSettings: 1, AddonSettingsPage: 1, HudppTitles: 1 };
const dressChrome = p => {
	for (const c in LOOK) if (CHROME[c] && p.BHasClass(c)) { const look = LOOK[c]; for (const k in look) p.style[k] = look[k]; }
	for (let i = 0, n = p.GetChildCount(); i < n; i++) dressChrome(p.GetChild(i));
};
// One minor Esc row is 32 px: .nav_menu_item.minor Label { height: 32px } and .minor has
// margin: 0 (hud_escape_menu.css). #Menu is flow-children: none. #SubOptions is
// vertical-align: bottom; margin-bottom: 132px; height: fit-children, so a new row grows
// upward into #changehero (margin-bottom: 280px) and #HudppPlay (280px, or 350px with
// .CanChangeHero). Lift those pins by 32 px (312 / 382) so SWAP HERO / PLAY keep their gap.
const ROW_PX = 32, PIN = 280, PIN_SWAP = 350, LIFT = 'AddonSettingsLift';
const hasClassUp = (p, c) => { for (let a = p; ok(a); a = a.GetParent()) if (a.BHasClass(c)) return true; return false; };
const pinBase = id => (id === 'HudppPlay' && hasClassUp(esc, 'CanChangeHero')) ? PIN_SWAP : PIN;
const liftPins = () => {
	if (!esc || !ok(esc.FindChildTraverse('AddonSettingsRow'))) return;
	['changehero', 'HudppPlay'].forEach(id => {
		const p = esc.FindChildTraverse(id);
		if (!ok(p)) return;
		const want = (pinBase(id) + ROW_PX) + 'px';
		p.SetAttributeString(LIFT, '1');
		if (p.style.marginBottom !== want) p.style.marginBottom = want;
	});
};
const restorePins = () => {
	if (!esc) return;
	['changehero', 'HudppPlay'].forEach(id => {
		const p = esc.FindChildTraverse(id);
		if (!ok(p) || p.GetAttributeString(LIFT, '') !== '1') return;
		p.style.marginBottom = null;
		p.SetHasClass('AddonSettingsLiftRestyle', true);
		p.SetHasClass('AddonSettingsLiftRestyle', false);
		p.SetAttributeString(LIFT, '');
	});
};
const afterChild = (parent, panel, after) => {
	const n = parent.GetChildCount();
	for (let i = 0; i < n; i++) {
		if (parent.GetChild(i) !== after) continue;
		const next = i + 1 < n ? parent.GetChild(i + 1) : null;
		if (ok(next) && next !== panel) parent.MoveChildBefore(panel, next);
		return;
	}
};
const paintStatus = r => {
	if (!ok(W.status) || !r) return;
	W.current = r;
	write(W.status, r.status);
	KINDS.forEach(k => flag(W.status, 'Hudpp_' + k, r.kind === k));
	if (!H.hudpp) {
		const color = STATUS_COLOR[r.kind] || STATUS_COLOR[''];
		if (W.status.style.color !== color) W.status.style.color = color;
	}
};
const placeButton = (parent) => {
	const b = make('Button', parent, 'AddonSettingsButton', 'nav_menu_item minor');
	text(b, 'menuButtonLabel', word('Addons'));
	b.SetPanelEvent('onactivate', () => guard('window', () => openWindow(!W.open))); // our own button
	return b;
};
const button = () => { // the ADDONS entry in the Esc menu, once there is something to show
	if (!addonsIds().length) return;
	if (esc && ok(esc.FindChildTraverse('AddonSettingsButton'))) { liftPins(); return; }
	const sub = esc.FindChildTraverse('SubOptions');
	if (!ok(sub)) return;
	// Own row, immediately below COMPLOCK's .HudppMenuRow when HUD++ is present (or above
	// Settings without it). Compensating lift on #changehero / #HudppPlay is in liftPins().
	const pack = childWithClass(sub, 'HudppMenuRow');
	W.row = make('Panel', sub, 'AddonSettingsRow', 'AddonSettingsRow');
	placeButton(W.row);
	if (ok(pack) && ok(pack.FindChild('HudppMenuButton'))) afterChild(sub, W.row, pack);
	else {
		const before = childWithClass(sub, 'SettingsRow');
		if (before) guard('menu button', () => sub.MoveChildBefore(W.row, before));
	}
	liftPins();
};
const openWindow = on => {
	const h = H.panel;
	if (on && !W.menu) { // the window's parts on its first open
		for (const k in LOOK.AddonSettingsHost) h.style[k] = LOOK.AddonSettingsHost[k];
		// head and body are buttons that do nothing: a click inside the window lands on them, not on the Esc
		// menu's full-screen #EscapeBackground behind (onactivate="CitadelResumePlaying()"), which closed it
		W.menu = h;
		W.head = make('Button', h, 'AddonSettingsHead', 'HudppHead AddonSettingsHead');
		W.head.SetPanelEvent('onactivate', () => {}); // our own panel
		W.titles = make('Panel', W.head, 'AddonSettingsTitles', 'HudppTitles');
		text(W.titles, 'HudppTitle AddonSettingsTitle', word('Addons'));
		const close = make('Button', W.head, 'AddonSettingsClose', 'HudppIconButton HudppClose AddonSettingsClose');
		close.SetPanelEvent('onactivate', () => openWindow(false)); // our own button
		if (!H.hudpp) {
			close.SetPanelEvent('onmouseover', () => { close.style.washColor = '#ffefd7'; close.style.backgroundColor = '#ffefd714'; });
			close.SetPanelEvent('onmouseout', () => { close.style.washColor = '#ffefd7aa'; close.style.backgroundColor = '#ffefd70a'; });
		}
		const main = make('Button', h, 'AddonSettingsMain', 'AddonSettingsMain');
		main.SetPanelEvent('onactivate', () => {}); // our own panel
		W.bodies = make('Panel', main, 'AddonSettingsBodies', 'AddonSettingsBodies');
		W.foot = make('Panel', h, 'AddonSettingsFoot', 'HudppFoot AddonSettingsFoot');
		W.status = make('Label', W.foot, 'AddonSettingsStatus', 'HudppStatus AddonSettingsStatus');
		W.status.hittest = false;
		W.status.text = '';
		tip(W.status, () => (W.current && W.current.statusMore) || '');
		dressChrome(W.head); dressChrome(main); dressChrome(W.foot);
		if (!H.hudpp) { dress(W.head); dress(main); dress(W.foot); }
		guard('window head', () => { h.MoveChildBefore(main, h.GetChild(0)); h.MoveChildBefore(W.head, main); });
	}
	if (on && ok(W.bodies)) addonsIds().forEach(id => guard('addon ' + id, () => mount(id)));
	W.open = on;
	if (!on) tipClear();
	flag(h, 'AddonSettingsOpen', on);
	h.style.visibility = on ? 'visible' : 'collapse';
	liftPins();
	if (on) say('open: hudpp=' + (H.hudpp ? '1' : '0') + ' recs=' + H.order.join(',') + ' addons=' + addonsIds().join(',') + ' items=' + (ok(W.bodies) ? W.bodies.GetChildCount() : 0));
};
const masterOf = r => r.schema.controls.find(c => c.key === r.schema.toggle) || null;
const mount = id => { // one addon in the vertical ADDONS list; late registrations append
	const r = H.recs[id];
	if (!W.bodies || !r || ok(r.block)) return;
	const bid = r.schema.prefix + 'Block';
	const leftover = W.bodies.FindChild(bid);
	if (ok(leftover)) leftover.DeleteAsync(0);
	const block = make('Panel', W.bodies, bid, 'AddonSettingsBlock');
	const head = make('Panel', block, r.schema.prefix + 'Head', 'AddonSettingsAddonHead');
	const titles = make('Panel', head, r.schema.prefix + 'Titles', 'AddonSettingsTitles');
	text(titles, 'AddonSettingsAddonTitle', r.schema.title, r.schema.prefix + 'Title');
	if (r.schema.author) {
		const nm = make('Label', titles, r.schema.prefix + 'Author', 'AddonSettingsAuthor');
		nm.hittest = false;
		nm.text = 'by ' + r.schema.author;
	}
	const master = masterOf(r);
	const hasSettings = r.schema.controls.some(c => c.key !== (r.schema.toggle || ''));
	let rb = null;
	if (hasSettings) {
		rb = make('Button', head, r.schema.prefix + 'Reset', 'HudppIconButton AddonSettingsReset');
		rb.SetPanelEvent('onactivate', () => guard('reset', () => resetAddon(r))); // our own button
		show(rb, false);
	}
	let wrap = null, sw = null, knob = null;
	if (master) {
		wrap = make('Button', head, r.schema.prefix + 'Master', 'HudppToggleRow AddonSettingsMaster');
		sw = make('Panel', wrap, r.schema.prefix + 'Switch', 'HudppSwitch');
		sw.hittest = false;
		knob = make('Panel', sw, '', 'HudppKnob');
		knob.hittest = false;
		wrap.SetPanelEvent('onactivate', () => guard('master', () => apply(r, { [master.key]: !r.values[master.key] }))); // our own button
	}
	if (ok(rb)) {
		let inside = 0;
		const paintReset = hover => {
			if (!ok(rb)) return;
			show(rb, hover);
			if (!H.hudpp) {
				const undo = rb.BHasClass('HudppUndo');
				rb.style.backgroundColor = hover ? '#ffefd714' : '#ffefd70a';
				rb.style.washColor = undo ? '#5fe69e' : (hover ? '#ffefd7' : '#ffefd7aa');
			}
		};
		const enter = () => { inside++; paintReset(true); };
		const leave = () => { inside = Math.max(0, inside - 1); $.Schedule(0, () => { if (!inside) paintReset(false); }); };
		const track = (p, over, out) => {
			if (!ok(p)) return;
			p.SetPanelEvent('onmouseover', () => { enter(); if (over) over(); });
			p.SetPanelEvent('onmouseout', () => { leave(); if (out) out(); });
		};
		track(head);
		track(titles);
		track(rb, () => tipShow(rb, r.undo ? word('Undo') : r.schema.resetLabel), () => tipHide(rb));
		if (wrap) track(wrap, () => tipShow(wrap, master.desc || ''), () => tipHide(wrap));
	} else if (wrap) tip(wrap, () => master.desc || '');
	r.page = r.body = make('Panel', block, r.schema.prefix + 'Body', 'HudppBody AddonSettingsPage AddonSettingsSettings');
	const inline = !H.hudpp;
	const v = view(r, r.body, inline, null, r.schema.toggle);
	v.reset = rb;
	v.resetLabel = null;
	const inner = v.sync;
	v.sync = () => {
		inner();
		if (master && ok(wrap)) {
			const on = master.invert ? !r.values[master.key] : !!r.values[master.key];
			flag(wrap, 'HudppOn', on);
			if (inline) {
				if (sw) sw.style.backgroundColor = on ? '#5fe69e' : '#ffefd726';
				if (knob) { knob.style.transform = on ? 'translateX( 20px )' : 'none'; knob.style.backgroundColor = on ? '#10130d' : '#ffefd7'; }
			}
			show(r.body, on);
		} else show(r.body, true);
		paintStatus(r);
	};
	r.views.push(v);
	r.block = block;
	dressChrome(r.block);
	if (inline) dress(r.block);
	v.sync();
	say('addon: ' + id);
};


const KINDS = ['saved', 'saving', 'error'];
const STATUS_COLOR = { '': '#ffefd799', saving: '#ffefd799', saved: '#5fe69e', error: '#f08a80', session: '#ffefd799' };

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

let probeIds = [];
const probe = ids => {
	const list = Array.isArray(ids) ? ids : (ids ? [ids] : []);
	list.forEach(id => { if (typeof id === 'string' && /^[a-z0-9_]{1,40}$/.test(id) && probeIds.indexOf(id) < 0) probeIds.push(id); });
	if (H.on) flushProbe();
};
const flushProbe = () => {
	if (!H.on || !ok(H.panel) || !probeIds.length) return;
	probeIds.forEach(id => guard('probe ' + id, () => {
		const pid = 'AddonSettingsProbe_' + id;
		if (ok(H.panel.FindChild(pid))) return;
		const p = make('Panel', H.panel, pid, 'AddonSettingsProbe');
		p.hittest = false;
		p.style.visibility = 'collapse';
		if (typeof p.BLoadLayout !== 'function') return;
		try { p.BLoadLayout('s2r://panorama/layout/addon_settings/register/' + id + '.xml', false, false); }
		catch (e) { try { p.DeleteAsync(0); } catch (x) { /* gone */ } }
	}));
};

// ---------- one addon's rows (CompLock's classes; inline looks when HUD++ is not installed) ----------
const HOLD = true; // steppers repeat while held; a press steps on mousedown, keyboard still uses onactivate
const view = (r, body, inline, footPanel, skipKey) => { // skipKey set: ADDONS list (no per-addon foot; skip the master toggle)
	const list = skipKey !== undefined;
	const v = { rows: {}, bars: {}, labels: {}, leads: {}, downs: {}, ups: {}, reset: null, resetLabel: null, status: null, syncing: false, sync: null };
	const sections = {};
	const set = (k, x) => guard('change', () => { if (still()) apply(r, k === null ? x : { [k]: x }); });
	const why = c => {
		const miss = (c.needs || []).find(k => !r.values[k]);
		if (!miss) return '';
		const need = r.schema.controls.find(x => x.key === miss);
		return word('Needs', [need ? need.title : miss]);
	};
	const fmt = (c, x) => {
		if (c.type === 'select') { const o = c.options.find(z => z.value === x); return o ? o.label : String(x); }
		return String(x);
	};
	let pressed = null, releasedAt = 0, rep = null;
	const holdStop = () => { rep = cancel(rep); };
	const stepBy = (c, dir, n) => {
		if (c.type === 'slider') {
			const next = fix(c, r.values[c.key] + dir * (n || 1) * c.step);
			if (next === r.values[c.key]) return false;
			set(c.key, next);
			return true;
		}
		const i = c.options.findIndex(o => o.value === r.values[c.key]);
		const next = c.options[(i + dir + c.options.length) % c.options.length].value;
		if (next === r.values[c.key]) return false;
		set(c.key, next);
		return true;
	};
	const hold = (c, dir) => {
		holdStop();
		if (!stepBy(c, dir)) return;
		const span = c.type === 'slider' ? Math.max(1, Math.round((c.max - c.min) / c.step / 60)) : 1;
		let n = 0;
		const tick = () => {
			rep = null;
			if (++n > 400) return;
			if (stepBy(c, dir, n > 20 ? span : 1)) rep = $.Schedule(0.05, tick);
		};
		rep = $.Schedule(0.35, tick);
	};
	const stepper = (row, cls, id, c, dir) => {
		const b = make('Button', row, id, 'HudppIconButton HudppStep ' + cls);
		const release = () => { if (pressed === b) { pressed = null; releasedAt = Date.now(); } holdStop(); };
		b.SetPanelEvent('onactivate', () => {
			if (pressed === b || Date.now() - releasedAt < 250) { pressed = null; holdStop(); return; }
			stepBy(c, dir);
		});
		if (HOLD) {
			b.SetPanelEvent('onmousedown', () => { pressed = b; hold(c, dir); });
			b.SetPanelEvent('onmouseup', release);
			b.SetPanelEvent('onmouseout', release);
		}
		return b;
	};
	r.schema.controls.forEach(c => {
		if (list && c.key === skipKey) return;
		const sk = c.section || '';
		if (!sections[sk]) {
			const gap = Object.keys(sections).length > 0;
			sections[sk] = make('Panel', body, '', 'HudppSection' + (gap ? ' HudppGap' : ''));
			const label = (sk || '').trim();
			const dup = label.toLowerCase() === String(r.schema.title || '').trim().toLowerCase();
			if (label && !dup) text(sections[sk], 'HudppSectionTitle AddonSettingsSectionTitle', label);
		}
		const parent = sections[sk], id = r.schema.prefix;
		const child = row => {
			if (!c.needs.length) return;
			if (list) { row.style.paddingLeft = '28px'; return; }
			const mark = make('Panel', row, '', 'HudppChildMark');
			mark.hittest = false;
		};
		if (c.type === 'toggle') {
			const row = make('Button', parent, id + 'Row_' + c.key, 'HudppRow HudppToggleRow');
			row.SetPanelEvent('onactivate', () => set(c.key, !r.values[c.key]));
			child(row);
			text(row, 'HudppRowTitle', c.title);
			const sw = make('Panel', row, '', 'HudppSwitch'); sw.hittest = false;
			make('Panel', sw, '', 'HudppKnob').hittest = false;
			tip(row, () => why(c) || c.desc);
			v.rows[c.key] = row;
			return;
		}
		if (c.type === 'select') {
			const row = make('Panel', parent, id + 'Row_' + c.key, 'HudppRow HudppChoiceRow');
			child(row);
			text(row, 'HudppRowTitle HudppChoiceTitle', c.title);
			c.options.forEach(o => {
				const x = make('Button', row, id + cap(c.key) + 'Choice_' + String(o.value).replace(/[^A-Za-z0-9]/g, ''), 'HudppChoice');
				text(x, 'HudppChoiceLabel', o.label);
				x.SetPanelEvent('onactivate', () => set(c.key, o.value));
			});
			// prev/next ids kept so existing tests can still step a select
			stepper(row, 'HudppStepDown', id + cap(c.key) + 'Prev', c, -1);
			stepper(row, 'HudppStepUp', id + cap(c.key) + 'Next', c, 1);
			tip(row, () => why(c) || c.desc);
			v.rows[c.key] = row;
			return;
		}
		const row = make('Panel', parent, id + 'Row_' + c.key, 'HudppRow HudppSlideRow');
		child(row);
		text(row, 'HudppRowTitle HudppSlideTitle', c.title);
		const lead = make('Button', row, '', 'HudppSlideLead');
		v.labels[c.key] = text(lead, 'HudppSlideValue', '');
		text(lead, 'HudppSlideReset', word('Reset'));
		tip(lead, () => r.values[c.key] === c.default ? '' : word('ResetTo', [fmt(c, c.default)]));
		lead.SetPanelEvent('onactivate', () => { if (r.values[c.key] !== c.default) set(c.key, c.default); });
		v.leads[c.key] = lead;
		v.downs[c.key] = stepper(row, 'HudppStepDown', id + cap(c.key) + 'Down', c, -1);
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
		v.ups[c.key] = stepper(row, 'HudppStepUp', id + cap(c.key) + 'Up', c, 1);
		v.rows[c.key] = row;
	});
	// CompLock tabs keep a per-tab foot (status + reset). The ADDONS list uses one shared foot
	// and a per-addon reset on the header, so skipKey (list mode) does not build a second foot.
	if (!list) {
	const foot = footPanel || make('Panel', body, r.schema.prefix + 'Foot', 'HudppFoot AddonSettingsFoot');
	if (!foot.id) try { foot.id = r.schema.prefix + 'Foot'; } catch (e) { /* already named */ }
	if (inline) { foot.style.width = '100%'; foot.style.flowChildren = 'right'; }
	v.status = text(foot, 'HudppStatus AddonSettingsStatus', r.status);
	if (inline) { v.status.style.width = 'fill-parent-flow(1)'; v.status.style.verticalAlign = 'center'; v.status.style.marginRight = '12px'; }
	tip(v.status, () => r.statusMore);
	const rb = make('Button', foot, r.schema.prefix + 'Reset', 'HudppTextButton HudppResetAll AddonSettingsReset');
	v.reset = rb;
	v.resetLabel = text(rb, 'HudppTextButtonLabel', r.schema.resetLabel);
	rb.SetPanelEvent('onactivate', () => guard('reset', () => resetAddon(r))); // our own button
	if (inline) {
		rb.style.verticalAlign = 'center';
		rb.style.horizontalAlign = 'right';
		const resetLook = hover => {
			if (rb.BHasClass('HudppIdle')) { rb.style.backgroundColor = '#ffefd700'; rb.style.border = '1px solid #ffefd733'; return; }
			if (rb.BHasClass('HudppUndo')) {
				rb.style.backgroundColor = hover ? '#5fe69e33' : '#5fe69e26';
				rb.style.border = hover ? '1px solid #86f2ba' : '1px solid #5fe69e';
				return;
			}
			rb.style.backgroundColor = hover ? '#ffefd714' : '#ffefd700';
			rb.style.border = hover ? '1px solid #ffefd766' : '1px solid #ffefd733';
		};
		rb.SetPanelEvent('onmouseover', () => resetLook(true));
		rb.SetPanelEvent('onmouseout', () => resetLook(false));
	}
	} else if (ok(W.status)) v.status = W.status;
	v.sync = () => {
		r.schema.controls.forEach(c => {
			const row = v.rows[c.key];
			if (!ok(row)) return;
			const live = c.needs.every(k => !!r.values[k]);
			flag(row, 'HudppDim', !live);
			flag(row, 'HudppRowOff', !live);
			if (row.hittestchildren !== live) row.hittestchildren = live;
			if (inline) row.style.opacity = live ? '1' : '0.4';
			if (c.type === 'toggle') {
				const on = c.invert ? !r.values[c.key] : !!r.values[c.key];
				flag(row, 'HudppOn', on);
				if (inline) {
					const sw = childWithClass(row, 'HudppSwitch'), knob = sw ? childWithClass(sw, 'HudppKnob') : null;
					if (sw) sw.style.backgroundColor = on ? '#5fe69e' : '#ffefd726';
					if (knob) { knob.style.transform = on ? 'translateX( 20px )' : 'none'; knob.style.backgroundColor = on ? '#10130d' : '#ffefd7'; }
				}
				return;
			}
			if (c.type === 'select') {
				const cur = r.values[c.key];
				for (let i = 0, n = row.GetChildCount(); i < n; i++) {
					const ch = row.GetChild(i);
					if (ok(ch) && ch.BHasClass('HudppChoice')) flag(ch, 'HudppSelected', ch.id.indexOf('Choice_' + String(cur).replace(/[^A-Za-z0-9]/g, '')) >= 0);
				}
				return;
			}
			const x = r.values[c.key];
			write(v.labels[c.key], fmt(c, x));
			flag(row, 'HudppChanged', x !== c.default);
			if (ok(v.downs[c.key])) flag(v.downs[c.key], 'HudppEnd', x <= c.min);
			if (ok(v.ups[c.key])) flag(v.ups[c.key], 'HudppEnd', x >= c.max);
			const bar = v.bars[c.key];
			const t = c.max > c.min ? (x - c.min) / (c.max - c.min) : 0;
			if (ok(bar) && !(Math.abs(Number(bar.value) - t) < 1e-6)) { v.syncing = true; try { bar.value = t; } catch (e) { /* not a slider */ } v.syncing = false; }
		});
		if (!list && ok(v.status)) {
			write(v.status, r.status);
			KINDS.forEach(k => flag(v.status, 'Hudpp_' + k, r.kind === k));
			if (inline) { const color = STATUS_COLOR[r.kind] || STATUS_COLOR['']; if (v.status.style.color !== color) v.status.style.color = color; }
		}
		if (ok(v.reset)) {
			const t = r.undo ? word('Undo') : r.schema.resetLabel;
			write(v.resetLabel, t);
			flag(v.reset, 'HudppUndo', !!r.undo);
			flag(v.reset, 'HudppIdle', !r.undo && atDefaults(r));
		}
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
	probe: probe,
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
