# Feasibility: CompLock's own settings in Addon Settings

Question (Kai): could the library also show CompLock HUD++'s settings and, if wanted, take over CompLock's
settings entry? This note is read-only research on HUD++ as installed on lea (`pak02_dir.vpk`, sha256
`0238ba8c…`), decompiled with Source2Viewer. Nothing was written to HUD++'s store and no handler was put on
its panels.

## How HUD++ keeps its settings

- **Schema:** `HudppSettings.DEFAULTS` in `hudpp_settings.vjs`, about 30 keys (`missing`, `rift`, `passives`,
  …, minimap `mm*`, crosshair `x*`). The object carries `v: 1` and a timestamp `t`. Value ranges are in
  `STEPS` (min, max, step, CSS class prefix).
- **Where the values live, three copies:**
  1. the store page `deadlockconfig.com/docs/hudpp-store/store.html`, key `hudpp_settings`
     (`HudppStore` in `hudpp_store.vjs`, the same page and message format our library uses);
  2. the session attribute `HudppSettings` on the HUD root (`remember()` / `session()`);
  3. classes on the `.HudppHud` panel (`HudppMissing`, `HudppMS100`, `HudppXG9`, …): `apply()` turns the
     values into classes, and HUD++'s CSS does the rest. Two values also go to the console:
     `citadel_damage_text_cumulative_mode` and `citadel_crosshair_hit_marker_duration`, sent with
     `$.DispatchEvent("CitadelConCommand", …)`.
- **Who reads what:** at HUD load `hudpp_hud.vjs` applies the session copy, then the stored one if its `t`
  is newer. The menu (`hudpp_menu.vjs`) reads the session copy every time it opens, keeps its own copy
  while open, and on each change writes classes, session and (after 0.6 s) the store.
- **Public interface:** none. `HudppSettings`, `HudppStore` and `HudppMenuToggle` are globals inside HUD++'s
  own layout scripts (`hud.vxml`, `hud_escape_menu.vxml`). Another addon's script runs in its own context
  and cannot call them. There is no version marker apart from `v: 1` in the stored JSON and the title
  string `COMPLOCK`.

## What an opt-in "show CompLock's settings in our library" would need

1. A copy of HUD++'s schema (keys, ranges, class names) in our code, kept in step with every HUD++ release.
2. **Writes to HUD++'s state:** the `hudpp_settings` store key, the `HudppSettings` session attribute,
   and the classes on `.HudppHud`. Without these writes a change would show in our menu but do nothing.
3. Hiding or replacing CompLock's own menu button (`#HudppMenuButton`, `onactivate="HudppMenuToggle()"`).

Points 2 and 3 break our own rules: never write HUD++'s store, never touch handlers on its panels. The v6
lesson applies: an `Activated` handler on `#HudppMenuButton` swallowed the click and CompLock's menu no
longer opened.

## Risks if it were built anyway

- **Silent drift:** a HUD++ update that renames a key, changes a range or a class prefix (all internal)
  leaves our page showing wrong values, or writing values HUD++ then snaps or ignores.
- **Two writers:** CompLock's menu caches its values while open, and its next change overwrites ours.
  The `t` timestamp only decides at HUD load, between the session and stored copies.
- **Its store key is shared:** a bug on our side would corrupt every CompLock setting, not only ours.
- **Copying HUD++'s schema and class tables** is closer to copying its code than to following its
  conventions (menu classes, store page), which is all we do today.

## Recommendation

Do not build it. Keep what works with no write to HUD++: addons appear as tabs in CompLock's menu, and
the ADDONS window only appears without HUD++. Revisit only if CompLock publishes an interface: a
documented schema, a version marker, and an event or attribute for other addons to read and change
settings. That would be worth asking the CompLock authors (jcStani, HoppCX) for.

What would be safe today without breaking any rule: a read-only "CompLock" entry in the ADDONS window that
says HUD++ is installed and where its menu is. That entry would never show, because the window only appears
when HUD++ is absent. So there is nothing useful to build.

## Side finding: console commands from Panorama

HUD++ runs console commands with `$.DispatchEvent("CitadelConCommand", "<command> <value>")`. So a mod can
set game convars from Panorama, contrary to the earlier note that Panorama has no console access. It still
cannot **read** convars or define new ones, so "Improved Quickbuy settings from the console" stays out of
reach. A mod could, for example, run a game command when a setting changes.
