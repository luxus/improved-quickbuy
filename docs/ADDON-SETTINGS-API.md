# Addon Settings API

Addon Settings gives Deadlock Panorama addons one shared settings menu. It lives in `lib/addon-settings/`
and is vendored, unchanged, into each addon that uses it. Improved Quickbuy is its first client and uses
only the public API described here.

- The Esc menu gets an **ADDONS** button that opens a larger CompLock-shaped panel. Addons with
  `placement: 'addons'` (the default) are listed vertically; the body scrolls when the list is tall.
- With CompLock HUD++ installed, an addon may also set `placement: 'complock'` to appear as a tab in
  CompLock's menu. If HUD++ is missing, that addon falls back to ADDONS.
- Values are stored on the same store page CompLock uses (deadlockconfig.com), one key per addon:
  `<id>_settings`. A HUD reload in the same game reads a session copy instead of loading the page again.
  The host does not write to the store until the saved settings have loaded (`known`).

Version: library `1.2.3`, `BUILD` 9, wire `API` 1.

## Quick start

```js
const settings = AddonSettings.register({
	id: 'my_addon', title: 'My Addon', prefix: 'MyAddon',
	toggle: 'enabled',
	controls: [
		{ key: 'enabled', type: 'toggle', title: 'Enable', desc: 'Turn the addon on.', default: true },
		{ key: 'size', type: 'slider', title: 'Size', min: 1, max: 5, step: 1, default: 3, needs: ['enabled'] }
	]
}, values => applyMySettings(values));
applyMySettings(settings.values()); // defaults until the saved values arrive
```

`examples/hello-addon/` is a complete client with a toggle, a slider, a select and two languages.

## Schema

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string, `a-z 0-9 _`, 1–40 chars | Unique per addon. Store key `<id>_settings`. |
| `title` | text | Addon name in the list header (and CompLock tab label when `placement` is `complock`). |
| `placement` | `'addons'` or `'complock'` | Optional. Where the addon is hosted (default **addons**, including legacy schemas that omit the field). `complock` still uses CompLock tabs and falls back to ADDONS when HUD++ is not installed. |
| `author` | text | Optional. If set, the addon's header shows **by &lt;author&gt;** (`HudppCredit`). Nothing is shown when it is omitted. |
| `section` | text | Optional. Default section title for controls that omit `section`. |
| `toggle` | string | Optional. Key of an existing `toggle` control that is the addon's master on/off switch. That control is rendered on the header, not as a settings row. When it is off, the addon's further settings are hidden (`collapse`), not just disabled. An addon without `toggle` has no master switch and keeps its settings visible. |
| `resetLabel` | text | Optional. Label of the reset button (default **Reset tab**). After a reset the button turns into **Undo** for 6 s, like CompLock. In ADDONS the button sits on that addon's header so Reset stays reachable when settings are collapsed. In a CompLock tab it stays on that tab's foot. |
| `prefix` | string, `[A-Za-z][A-Za-z0-9]*` | Panel id prefix (`<prefix>Block`, `<prefix>Head`, `<prefix>Title`, `<prefix>Master`, `<prefix>Body`, `<prefix>Row_<key>`; CompLock tabs still use `<prefix>Tab`). Derived from `id` if missing. |
| `strings` | `{ <language>: { <Token>: text } }` | Optional. The addon's own words for `#Token` texts (see Languages). |
| `controls` | array | The rows, in order. |

Each control:

| Field | Applies to | Meaning |
| --- | --- | --- |
| `key` | all | `[A-Za-z][A-Za-z0-9_]*`, the value's name. |
| `type` | all | `toggle`, `slider` or `select`. |
| `title`, `desc` | all | Text. `desc` is the row's tooltip: on hover the library fires Valve's `UIShowTextTooltip` (the same event HUD++ and the escape menu use; apostrophes and backslashes are stripped because the game quotes the event string with `'`). Toggle rows are a compact 34 px line (title left, switch right), like HUD++'s own rows, including the `HudppChildMark` indent when `needs` is set. A row that is off because of `needs` is dimmed with `HudppDim` and its tooltip says **Needs {title}**. Sliders have no description tooltip (HUD++ sliders only tip "Reset to …" on a changed value). |
| `section` | all | Text. Rows with the same section are grouped under a `HudppSectionTitle`. If omitted, the schema `section` or the addon `title` is used, so every page has at least one headline. |
| `default` | all | Used until a saved value arrives, and by **Reset**. |
| `needs` | all | Keys of toggles that must be on for this row to be active (greyed out otherwise). |
| `invert` | toggle | Optional. The switch looks on when the value is off (CompLock's inverted toggles). |
| `min`, `max`, `step` | slider | Values are clamped and snapped to the step. Clicking a changed value label puts the default back (tooltip **Reset to {value}**). Steppers repeat while held. |
| `options` | select | `[{ value, label }]` or plain values. Shown as `HudppChoice` chips (and prev/next steppers). |

"Text" is a plain string or a `#Token` (see Languages). Invalid controls are skipped with a console line.
Stored or requested values are always made valid for their control (wrong type: default; out of range:
clamped; unknown option: default).

## The handle

`register(schema, onChange)` returns:

| Member | Meaning |
| --- | --- |
| `id` | The schema id. |
| `get(key)` | The current value. |
| `values()` | A copy of all current values. |
| `set(key, value)` or `set({ key: value, ... })` | Change values from the addon itself. `onChange` runs, the host saves. |
| `status()` | The last status text ("Saved", an error, ...). |

`onChange(values)` runs once the saved values are loaded (if they differ from the defaults) and after every
change from the menu, including **Reset**.

Other exports: `AddonSettings.API`, `BUILD`, `VERSION`, `language()`, `localize(text, table, args)`,
`probe(ids)` (see Mid-match registration), and for an addon with its own timer `ride(() => timerRuns)`
plus `pulse()` on each tick, so the host's look at HUD++'s menu shares that timer instead of starting
its own.

## Languages

The library follows the game's client language and falls back to English.

- **Language:** `$.Language()` when the game has it, else the `Language_<name>` class the game sets on the
  HUD root (Valve's own style sheets use it, for example `.Language_japanese`). Anything else: `english`.
- **Texts:** a text that starts with `#` is a token. It resolves in this order:
  1. `$.Localize('#Token')`, if the game has loaded a loc file that defines it;
  2. `strings[<language>].Token` from the addon's schema;
  3. `strings.english.Token`;
  4. the bare token name (`Token`), so a missing word is visible but never shows a `#`.
- **Placeholders:** `localize('#Token', table, [a, b])` fills `{0}` and `{1}`.
- **Host words** (ADDONS, Reset tab, Undo, Reset, Reset to {0}, Needs {0}, Saving..., Saved, the short
  and long status lines) are built into the library for
  every language Deadlock lists in `gameinfo.gi` (`SupportedLanguages`: english, german, french, spanish,
  latam, brazilian, italian, polish, czech, russian, ukrainian, turkish, indonesian, thai, japanese,
  koreana, schinese) plus tchinese. English and German are hand-written, the rest machine-made; fixes welcome. They are deliberately not shipped as loc files: two vendored copies must never define
  the same token.

Keep game terms consistent with Valve's own translations (`game/citadel/resource/localization/citadel_*`,
for example `Citadel_Hero_Stats_Souls`, `Citadel_ShopStats_Mods`, `citadel_settings_shop`,
`Citadel_Hud_Quickbuy`). Mind the width: CompLock's menu is 400 px wide, a tab label is 14 px uppercase,
a slider title gets 96 px.

To add a language to your addon, add a block to `strings` with the game's language name (`german`,
`french`, `schinese`, `brazilian`, ...). Keys missing in it fall back to English one by one.

### Loc files from an addon VPK

Valve's way is `resource/localization/<name>/<name>_<language>.txt` with `"lang" { "Language" "Tokens" }`.
Improved Quickbuy generates these files from its JS table (`tools/loc.js src/strings.js STRINGS build/pak
improved_quickbuy`) and ships them in its VPK. The files are written like Valve's own (UTF-8 with BOM, CRLF).
Whether the game loads a **new** loc file from an addon is not confirmed: `gameinfo.gi`'s `Localize` block
only sets `DuplicateTokensAssert`, it lists no folders, and modding guides only show addons replacing
Valve's existing files (`citadel_main`, `citadel_gc`, ...), which would hide Valve's own text changes after
an update. So the JS table is what the addon relies on. The console line at load says which one was used:
`Improved Quickbuy: v10 loaded (german, words from the built-in table)`. If a future game build loads addon
loc files, the same tokens resolve from them with no code change.

## ADDONS menu and CompLock tabs

- **ADDONS:** the **ADDONS** button joins an existing row in `#SubOptions`: beside COMPLOCK in
  HUD++'s `.HudppMenuRow`, or after Valve's SETTINGS and mute icon in `.SettingsRow` without HUD++.
  Both rows are `flow-children: right`, so the menu keeps its height. An own row would grow
  `#SubOptions` (`vertical-align: bottom; height: fit-children`) upward into `#changehero` and
  `#HudppPlay`; 1.2.3 lifted those pins with inline margins and PLAY sat on SWAP HERO whenever
  `.CanChangeHero` arrived later. The host moves no native panel. The panel is 560 px wide and has a CompLock-shaped head (title ADDONS, boxed close
  `HudppIconButton HudppClose`), a scrollable body (`maxHeight` 640 px) listing every ADDONS addon
  vertically, and a shared foot under the body (status only, including `Hudpp_saved` teal for **Saved**).
  Each addon is a header (`AddonSettingsAddonHead`): name on the left, optional `HudppCredit` "by
  &lt;author&gt;" when the schema sets `author`, Reset, and a master switch when the schema sets
  `toggle`. Further settings sit under that header, indented, with `HudppSectionTitle` groups (a
  control's `section`, or the schema `section`, or the addon title). Turning the master off hides
  those settings (`collapse`); Reset on the header stays visible. The window is built on the first
  open; each addon already registered is mounted then, and a later registration appends a new block.
  A registration without `placement` (legacy 1.1.x schemas) defaults to ADDONS, including when it
  arrives after the host is already built. Clicks inside the window stay in it (they do not resume
  the game). The X button or the ADDONS button close only ADDONS, not the match. With HUD++ installed
  the panel uses CompLock's widget classes for the same look and does not inline those styles (so
  hover and status colours apply); without HUD++ the same classes are styled inline (the library
  does not copy HUD++'s CSS).
- **CompLock tabs** (`placement: 'complock'`, HUD++ present): the host adds a tab button per such addon to
  CompLock's tab bar once HUD++ has built its menu. A tab's body and foot are built on its first click. While
  one of our tabs is shown, HUD++'s own bodies are hidden with an inline visibility and its foot is hidden.
  This works with both the 18 Nov two-tab CSS and the 20/21 Nov three-tab inverted CSS (HUD, Minimap,
  Crosshair); the library does not toggle `HudppTab_*` classes to hide those bodies. HUD++'s `showTab`
  returns at once when the requested tab is already its current one, so a click from one of our tabs back
  to that same HUD++ tab (often Crosshair) would do nothing. While one of our tabs is shown the library
  hooks those tab buttons, unhooks on leave, and Activate()s HUD++'s own handler (moving it off the parked
  tab first if needed). It never writes CompLock's settings.
- Re-registering the same id merges new keys from the session and the store into the existing values.

## Mid-match registration

Addon scripts that only load on a later screen (post-game, Match History) can still appear in ADDONS during
a match. The host looks for a registrar layout at
`s2r://panorama/layout/addon_settings/register/<id>.xml` when `AddonSettings.probe(['id', ...])` is called.
Call `probe` only for ids that actually ship `panorama/layout/addon_settings/register/<id>.xml` in a VPK;
BLoadLayout of a missing file is a `ResourceSystem` ERROR_FILEOPEN. The registrar is a small layout whose script only calls `register()`.

## Host election and versions

Every copy of the library looks for `#EscapeMenu > #AddonSettingsHost` at load:

- none: it creates the host and serves;
- one with a lower `build`: it takes over (the old copy's menu entries are removed and rebuilt on demand);
- one with the same or a higher build: it only registers.

Clients and the host talk through panel attribute strings, with an `Activated` event as the doorbell.
Registration before any host exists is queued and sent when the host appears, so load order does not
matter. `API` changes only with an incompatible change to these attributes. Bump `BUILD` for every
released change to the library so the newest copy hosts.

## Cost

- No panels, timers or handlers for settings until a menu is opened, except a look at the Esc menu at load
  (4 Hz for 10 s, then every 5 s for a minute) and, with HUD++, a 4 Hz look for its menu until it was opened
  once (shared with the embedding addon's timer via `ride`/`pulse`).
- Saves are debounced (0.6 s) and skipped when the values equal the stored ones. The hidden store page is
  created for a burst of jobs and deleted 3 s after a save.
- Words are resolved once, when a schema registers.

## Add it to a forked or new mod

1. Copy `lib/addon-settings/` into your repository (or add this repository as a submodule). Never edit
   `addon_settings.js` in a mod; changes go upstream with a `BUILD` bump.
2. Put the library in front of your script, in the same scope:
   ```sh
   { echo '(() => {'; sh lib/addon-settings/vendor.sh print; cat src/my_addon.js; echo '})();'; } \
     > build/pak/panorama/scripts/my_addon.js
   ```
   Or `sh lib/addon-settings/vendor.sh pak build/pak` writes
   `panorama/scripts/addon_settings/addon_settings_b<BUILD>.js` for a layout that includes it before your
   script.
3. In your script, call `AddonSettings.register(schema, onChange)` as in the quick start. Pick an `id` and
   a `prefix` no other addon uses.
4. Optional: put your texts in `strings` with `#Token`s, one block per language.
5. Compile the pak as usual (for example `modlock panorama compile build/pak -o my-addon.vpk`).
6. Test with and without HUD++: your block in the ADDONS list, and, if you set `placement: 'complock'`, your tab in
   CompLock (and the ADDONS fallback when HUD++ is missing).
