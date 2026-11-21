#!/bin/sh
# Negative controls: each mutant of the built script must make the stand-in suite fail.
cd "$(dirname "$0")/.."
B=build/pak/panorama/scripts/improved_quickbuy.js
run() { name=$1; shift; python3 -c "
import sys; s=open('$B').read(); args=sys.argv[1:]
for a,b in zip(args[::2],args[1::2]):
    assert a in s, 'mutant anchor missing: '+a; s=s.replace(a,b,1)
open('/tmp/iqb_mutant.js','w').write(s)" "$@" || { echo "BROKEN $name"; return; }
  if node test/test.js /tmp/iqb_mutant.js >/tmp/iqb_mutant.out 2>&1; then echo "SURVIVED $name"; else echo "killed   $name ($(grep -c FAIL /tmp/iqb_mutant.out) fails)"; fi; }
run hook-hudpp-button "const step = () => {" "const step = () => { try { const b = esc && esc.FindChildTraverse('HudppMenuButton'); if (b && !b.hooked) { b.hooked = 1; \$.RegisterEventHandler('Activated', b, () => {}); } } catch (e) {}"
run write-every-tick "if (!changed && !dirty) {" "if (false) {" "if (s.missing !== r.missing) { s.missing = r.missing; s.label.text = group(r.missing); }" "s.missing = r.missing; s.label.text = group(r.missing);"
run flag-every-tick "if (!changed && !dirty) {" "if (false) {" "if (s.badge && s.badgeOn !== badgeOn) {" "if (s.badge) {"
run full-hud-search "const own = id => lookup(id, findOwn, id);" "const own = id => top().FindChildTraverse(id);"
run runs-when-off "if (!cfg.on || (!wantHud() && !(wantShop() && inShop()))) { hideAll(); return; }" "if (!cfg.on || (!wantHud() && !(wantShop() && inShop()))) { hideAll(); timer = \$.Schedule(0.25, tick); return; }" "if (running()) kick(); else {" "kick(); if (0) {"
run no-tab-handback "try { keep = ok(M.panel) && M.panel.BHasClass('HudppOpen') && M.panel.BHasClass('AddonSettingsTabShown') && !hudppOwnsTab(); }" "try { keep = ok(M.panel) && M.panel.BHasClass('HudppOpen'); }"
run toggle-row-34px "row.style.height = 'fit-children';" "row.style.height = '34px';"
run clear-style-null "const show = (p, on) => { const v = on ? 'visible' : 'collapse';" "const show = (p, on) => { const v = on ? null : 'collapse';"
run wrong-key "vault.get(r.id + '_settings'" "vault.get('hudpp_settings'" "vault.set(r.id + '_settings'" "vault.set('hudpp_settings'"
run no-sell-credit "available += Math.floor(" "available += 0 * Math.floor("
run cumulative-off "sum += price > 0 ? price : 0;" "sum = price > 0 ? price : 0;"
run queue-toggle-is-shop "	return shopOpen;" "	return shopOpen || ctx.BHasClass('gQuickbuyShopShowQueue');"
run no-recipe-discount "used[j] = true; price -= valueOf(comps[c]) || queueRows[j].shown; break;" "used[j] = true; break;"
run shown-price-for-component "price -= valueOf(comps[c]) || queueRows[j].shown;" "price -= queueRows[j].shown;"
run badges-gate-entries "if (s.has !== !!r) { s.has = !!r;" "if (s.has !== (!!r && badges)) { s.has = !!r && badges;"
run hud-needs-badges "const wantHud = () => wantBadges() || wantEntries();" "const wantHud = () => wantBadges();"
run math-always "const math = badges || tags || total;" "const math = true;"
run count-row-needs-badges "default: DEFAULTS.count, needs: ['on'] }" "default: DEFAULTS.count, needs: ['on', 'hud'] }"
run running-total-own-color "	tag.style.fontSize = '14px';" "	tag.style.fontSize = '14px'; tag.style.color = '#8fd8ff';"
run event-only-shop "if (!shopKnown) { const b = statsBox();" "if (false) { const b = statsBox();"
run no-recheck "if (++checks >= RECHECK) {" "if (false) {"
run menu-poll-forever "	return M.built ? 0 : 0.25;" "	return 0.25;"
run menu-own-timer "	if (wait === 0.25 && H.rider && guard('rider', H.rider)) return;" ""
run eager-tab-body "		tab.SetPanelEvent('onactivate', () => guard('tab', () => showTab(r, true)));" "		showTab(r, true); showTab(r, false); tab.SetPanelEvent('onactivate', () => guard('tab', () => showTab(r, true)));"
run redundant-save "		if (now === r.stored) { status(r, word('Saved'), 'saved'); return; }" ""
run eager-window-head "	const before = childWithClass(sub, 'SettingsRow');" "	openWindow(true); openWindow(false); const before = childWithClass(sub, 'SettingsRow');"
run fallback-with-hudpp "if (ok(esc.FindChildTraverse('HudppMenuButton'))) H.mode = 'hudpp';" "if (false) H.mode = 'hudpp';"
run fallback-eager-body "say('build ' + BUILD + ' hosts; no HUD++ (CompLock) menu: settings in the Esc menu, ADDONS'); grow();" "say('build ' + BUILD + ' hosts; no HUD++ (CompLock) menu: settings in the Esc menu, ADDONS'); grow(); guard('w', () => { openWindow(true); openWindow(false); });"
run fallback-not-inline "		const v = view(r, r.page, true);" "		const v = view(r, r.page, false);"
# v9: languages, reset tab, foot, window clicks, last tab
run loc-no-table "	if (t === null && table && typeof table === 'object') {" "	if (false) {"
run loc-no-english-fallback "		else if (en && typeof en[token] === 'string') t = en[token];" ""
run loc-no-class-language "	if (!l) { const root = top();" "	if (false) { const root = top();"
run loc-file-ignored "try { const v = \$.Localize(s);" "try { const v = s;"
run loc-token-shown "	return fill(t === null ? token : t, args);" "	return fill(t === null ? s : t, args);"
run click-falls-through "		const main = make('Button', h, 'AddonSettingsMain', 'AddonSettingsMain');" "		const main = make('Panel', h, 'AddonSettingsMain', 'AddonSettingsMain');"
run reset-not-defaults "set(null, defaults(r.schema))" "set(null, {})"
run hudpp-foot-stays "		show(foot, false);" ""
run no-last-tab "	guard('last tab', () => top().SetAttributeString(LAST_TAB, r.id));" ""
run status-no-kind "		KINDS.forEach(k => flag(v.status, 'Hudpp_' + k, r.kind === k));" ""
run eager-slots "if (!r && !slots[i]) continue;" ""
# CSS mutants: the in-game failure of v2 (a row sized by its contents, squeezed to a sliver)
runcss() { name=$1; shift; python3 -c "
import sys; s=open('src/improved_quickbuy.css').read(); a,b=sys.argv[1:3]
assert a in s, 'mutant anchor missing: '+a; open('/tmp/iqb_mutant.css','w').write(s.replace(a,b,1))" "$@" || { echo "BROKEN $name"; return; }
  if IQB_CSS=/tmp/iqb_mutant.css node test/test.js >/tmp/iqb_mutant.out 2>&1; then echo "SURVIVED $name"; else echo "killed   $name ($(grep -c FAIL /tmp/iqb_mutant.out) fails)"; fi; }
runcss width-from-contents "	vertical-align: bottom;
	width: 70px;
}" "	vertical-align: bottom;
}"
runcss hudmini-centered ".IqbHudOn #HudMini
{
	horizontal-align: left;
}" ""
