# Addon Settings API

Addon Settings gives Deadlock Panorama addons one shared settings menu. It lives in `lib/addon-settings/`
and is vendored, unchanged, into each addon that uses it. Improved Quickbuy is its first client and uses
only the public API described here.

- With CompLock HUD++ installed, every registered addon gets a tab in CompLock's menu.
- Without HUD++, the Esc menu gets an **ADDONS** button that opens a window with a sidebar, one entry per
  addon.
- Values are stored on the same store page CompLock uses (deadlockconfig.com), one key per addon:
  `<id>_settings`. A HUD reload in the same game reads a session copy instead of loading the page again.

Version: library `1.1.1`, `BUILD` 3, wire `API` 1.

## Quick start

```js
const settings = AddonSettings.register({
	id: 'my_addon', title: 'My Addon', prefix: 'MyAddon',
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
| `title` | text | Tab and sidebar label. |
| `prefix` | string, `[A-Za-z][A-Za-z0-9]*` | Panel id prefix (`<prefix>Tab`, `<prefix>Body`, `<prefix>Row_<key>`). Derived from `id` if missing. |
| `strings` | `{ <language>: { <Token>: text } }` | Optional. The addon's own words for `#Token` texts (see Languages). |
| `controls` | array | The rows, in order. |

Each control:

| Field | Applies to | Meaning |
| --- | --- | --- |
| `key` | all | `[A-Za-z][A-Za-z0-9_]*`, the value's name. |
| `type` | all | `toggle`, `slider` or `select`. |
| `title`, `desc` | all | Text. `desc` is shown under toggles only (a column of title + description, switch on the right). In CompLock HUD++ from 20/21 Nov this layout is applied inline: that build's row CSS is a single 34 px line and no longer styles `.HudppRowText` or `.HudppRowDesc`. |
| `section` | all | Text. Rows with the same section are grouped under its title. |
| `default` | all | Used until a saved value arrives, and by **Reset tab**. |
| `needs` | all | Keys of toggles that must be on for this row to be active (greyed out otherwise). |
| `min`, `max`, `step` | slider | Values are clamped and snapped to the step. |
| `options` | select | `[{ value, label }]` or plain values. |

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
change from the menu, including **Reset tab**.

Other exports: `AddonSettings.API`, `BUILD`, `VERSION`, `language()`, `localize(text, table, args)`, and
for an addon with its own timer `ride(() => timerRuns)` plus `pulse()` on each tick, so the host's look at
HUD++'s menu shares that timer instead of starting its own.

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
- **Host words** (ADDONS, Reset tab, Saving..., Saved, the error lines) are built into the library for
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

## Settings window and CompLock tabs

- **CompLock HUD++ present:** the host adds a tab button per addon to CompLock's tab bar once HUD++ has
  built its menu. A tab's body and foot (status line, **Reset tab**) are built on its first click. While one
  of our tabs is shown, HUD++'s own bodies are hidden with an inline visibility and its foot (status and
  reset, which act on its own tabs) is hidden. This works with both the 18 Nov two-tab CSS and the 20/21 Nov
  three-tab inverted CSS (HUD, Minimap, Crosshair); the library does not toggle `HudppTab_*` classes to hide
  those bodies. The library never registers handlers on HUD++'s panels and never writes CompLock's settings.
- **No HUD++:** the **ADDONS** button sits above Valve's settings row in the Esc menu. The window, its head
  and close button are built on the first open, a page per addon on its first selection. Clicks inside the
  window stay in it. The X button or the ADDONS button close it; it hides with the Esc menu. The last
  selected tab is remembered until the game closes.

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
6. Test with and without HUD++: your tab in CompLock, or your entry in the ADDONS window.
