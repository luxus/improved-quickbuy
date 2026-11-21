# Improved Quickbuy

A Deadlock HUD mod that shows the next items in your quickbuy queue and how many souls you still need for each one. It works with [CompLock HUD++](https://deadlockconfig.com/) and without it.

**Features**
- Up to 5 quickbuy items on the HUD (1 = vanilla)
- "Missing souls" badge above each item, counted along your queue
- Shop: running totals per queued item and a total for the whole queue
- Integrated into CompLock HUD++: its own "Quickbuy" tab, every feature togglable
- Works without HUD++: an ADDONS button in the Esc menu opens its own settings window
- "Reset Quickbuy" on the right of the settings foot puts options back to the defaults, and a "Saved" line, like CompLock's own tabs
- In every language Deadlock ships, following the game's language
- Its settings menu is [Addon Settings](docs/ADDON-SETTINGS-API.md), a small library other mods can use for their own tabs
- Rewritten from scratch with performance in mind

## What it does

- **HUD:** Items Shown (1–5) sets how many queue items sit in the row: Valve's quickbuy item, then our own entries for items 2 to 5 to its right. Show Missing Souls, on its own, puts a badge above every shown item with the souls still missing up to and including it; an item you can already afford shows 0 and a lit frame. Both off with Items Shown 1 is plain Valve, and the mod does no HUD work then.
- **The badge number:** max(0, sum of the item prices up to this item − your souls − sell-queue credit). An item's price is the cost the game shows on its queue entry (an owned component is already taken off there). If a component is queued before its upgrade, the component's full price (its tier price from Valve's `generic_data.vdata`) comes off the upgrade, once per queued component (recipes from Valve's `abilities.vdata`). Items in the sell queue count as half their shown cost.
- **In the shop:** each queued item you can't afford yet shows the running total of souls needed up to it. The top of the queue shows the whole queue's cost and what is still missing. Items in the sell queue count as half their cost.
- **Options (CompLock → Quickbuy, or Esc → ADDONS → Quickbuy without CompLock):**
  - Improved Quickbuy: Enable on/off
  - HUD: Show Missing Souls on/off; Items Shown, 1 to 5 (independent of each other), with the same slider as CompLock's own
  - Shop: Running Totals on/off; Queue Total on/off
- **Reset Quickbuy** (button on the right of the settings foot) puts these options back to their defaults. The CompLock tab title stays **Quickbuy**.
- **Languages:** texts follow the game's client language: English, German, French, Spanish (Spain and Latin America), Brazilian Portuguese, Italian, Polish, Czech, Russian, Ukrainian, Turkish, Indonesian, Thai, Japanese, Korean, Simplified and Traditional Chinese. Anything else falls back to English. Game terms (souls, items, shop, quickbuy) use Valve's own translations. English and German are written by hand; **the other translations are machine-made, corrections and pull requests are welcome** (`src/strings.js`, and the library's words in `lib/addon-settings/addon_settings.js`). Where Valve's word for Quickbuy is too wide for CompLock's tab bar, the tab says "Quickbuy".
- **Saving:** settings are stored the way CompLock stores its own. A hidden page on deadlockconfig.com keeps them in its local storage, under the key `improved_quickbuy_settings`. If the page can't be reached, your settings last until the game closes.

## Install

**With [Deadlock Mod Manager](https://deadlockmods.app/) (DMM, [GitHub](https://github.com/deadlock-mod-manager/deadlock-mod-manager)):** open <https://luxus.github.io/improved-quickbuy/> and use *Add to DMM* / *Install with DMM*, or in DMM go to Settings → Mods → Mod sources → Add source and paste

```
https://luxus.github.io/improved-quickbuy/dmm-source.json
```

The deep links behind the buttons:

```
deadlock-mod-manager://sources/add?url=https%3A%2F%2Fluxus.github.io%2Fimproved-quickbuy%2Fdmm-source.json
deadlock-mod-manager://sources/install?url=https%3A%2F%2Fluxus.github.io%2Fimproved-quickbuy%2Fdmm-source.json&source=luxus&listing=improved-quickbuy
```

**Manually:** download `improved-quickbuy-1.0.3.vpk` from the [releases](https://github.com/luxus/improved-quickbuy/releases), rename it to a free slot such as `pak03_dir.vpk` and put it into `Deadlock/game/citadel/addons/`. The load order against CompLock HUD++ does not matter: HUD++ does not ship the quickbuy layout.

**CompLock HUD++ is optional.** With it, the options are a Quickbuy tab in CompLock's menu (Esc → COMPLOCK). Without it, the Esc menu gets an ADDONS button that opens a small window of our own with the same options, built on first open. Settings are kept across game restarts either way (our own hidden HTML panel loads the same store page CompLock uses).

## How it is built

- `src/main.js`: all logic.
- `src/strings.js`: the mod's words per language. `tools/loc.js` also writes them as Valve loc files (`resource/localization/improved_quickbuy/`) into the VPK; see [Languages](docs/ADDON-SETTINGS-API.md#languages) for why the script uses the table.
- `lib/addon-settings/`: the settings library (CompLock tabs or the ADDONS window, store page), vendored in front of `src/main.js`.
- `src/improved_quickbuy.css`: all styles.
- `src/items.gen.js`: item icons, generated by `tools/gen_items.py` from Valve's `scripts/abilities.vdata`, `scripts/generic_data.vdata` and `citadel_gc_mod_names_english.txt` (icons, recipes, component prices). Rerun it after a game update adds items.
- `vanilla/hud_quickbuy.xml`: Valve's quickbuy layout. It is the only game file this mod replaces, because a script can only be added to the quickbuy panel through its layout. `tools/layout.py` adds two includes (our style sheet and our script) and changes nothing else. CompLock HUD++ replaces `hud.xml` and `hud_quickbuy.css`, and this mod touches neither.
- Everything this mod shows is created at run time.

To build, run `tools/build.sh`, which writes `build/improved-quickbuy.vpk`. It needs `modlock` (`MODLOCK=...`). `tools/assemble.sh` does everything up to the compile step and is what CI and the tests use. Release 1.0.3 matches CompLock HUD++ toggle rows: compact line, description as a hover tooltip, not text under the title (the console says `1.0.3 loaded`). Release 1.0.2 kept the tab titled Quickbuy, labelled the reset button Reset Quickbuy and placed it on the right, and fixed a click on Crosshair (or HUD) that did nothing when returning from Quickbuy to the same HUD++ tab. Release 1.0.1 was the CompLock HUD++ 20/21 Nov menu patch. Release 1.0.0 was build v10.

### Performance design

- Nothing runs every frame. A single timer runs only while something of ours can be seen: 4 times a second in play, 5 times a second with the shop open, twice a second with an empty queue. It stops completely when the mod or every feature is off. Shop open/close comes from the game's `GlobalClassChanged` event (one class read at load covers a HUD loaded with the shop open).
- Each step reads only its inputs (queue entries' name and cost, the souls label, the sell queue) and stops there when none changed. The math and all painting run only after a change, and allocate nothing on the unchanged path.
- Panels are found once, inside the quickbuy panel or by direct child lookups, and kept without an `IsValid()` per read; one validity look every 5 s (and a full re-lookup after any error) covers a panel that goes away. The mod never searches the whole HUD.
- Our own panels' classes, texts and images are tracked in JS and written only when the value changes; nothing is read back from them.
- HUD panels are created on first need, only as many as Items Shown and Show Missing Souls ask for; running-total labels only for entries that show one.
- Settings cost only when used. In CompLock's menu, our tab button is added the first time the menu opens and the tab's rows on its first click. Without CompLock, the ADDONS button and an empty window host are set up once; the window's head and our rows are built on first open. Closed windows are collapsed (no layout or paint work) and nothing watches them.
- Until our tab is in CompLock's menu, one class read checks whether the menu is open; it rides on the HUD tick (no timer of its own) and only gets its own 4 Hz timer while the HUD tick is stopped. Once the tab is in, nothing is left to watch. Without CompLock HUD++ the check ends after 0.75 s.
- Saving: a burst of changes is saved once, 0.6 s after the last change, and not at all when the settings are back to what is stored. The store page is a hidden browser panel created for a load or save and deleted right after (3 s after a save), so no browser idles in the background.
- Words are looked up once at load, never per tick.
- While our tab is shown, a 50 ms check (two class reads) hands the menu back when CompLock switches tabs or closes.
- The mod never leaves event handlers on CompLock's panels. While the Quickbuy tab is shown it hooks HUD++'s tab buttons only long enough to hand a click back to HUD++'s own `showTab` (needed because that function returns at once when the clicked tab is already current), then unhooks. An earlier approach that kept a hook on the menu button blocked CompLock's menu from opening.
- The mod never uses `world-blur`, since CompLock redraws the lower HUD at 30 fps and blanks it when a blurred panel is visible there.

## Tests

- `node test/test.js`: stand-in test suite. It models a Panorama panel tree, a virtual clock, CompLock's menu and the store page, and covers the menu opening, tab switching, options, persistence, offline use and the zero-work-when-off case.
- `node test/registry.js`: the settings library with two addons (Improved Quickbuy and `examples/hello-addon`): one host, load order, a newer copy taking over, separate store keys, save debounce, languages.
- `sh test/mutants.sh`: negative controls. Each deliberately broken build must fail the suite.
- `sh test/bench.sh <script> <vanilla|v7>`: stand-in cost counters per second (timers, lookups, nodes visited, reads, writes) and `allocKB`, the JS the mod itself allocates per second (V8 sampling heap profiler, stand-in objects excluded).

These run outside the game, so they show behavior and relative cost, not frame times.

## Settings for other mods

The settings menu is [Addon Settings](docs/ADDON-SETTINGS-API.md) (`lib/addon-settings/`). Another mod vendors the same file and registers its own schema in about ten lines; it then gets its own tab in CompLock's menu, or its own entry in the ADDONS window. When several mods ship it, the newest copy hosts and the others only register. See `examples/hello-addon`.

## Changelog and contributing

Changes are listed in [CHANGELOG.md](CHANGELOG.md) (Keep a Changelog, semantic versioning). Commits follow
Conventional Commits (`feat`, `fix`, `perf`, `refactor`, `docs`, `chore`), and the changelog and release notes
are generated from them; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT for this project's own code and files, see [LICENSE](LICENSE). Not covered: Valve's files and data in this repository, which remain Valve's: `vanilla/hud_quickbuy.xml` (Valve's layout, copied unchanged) and the item data in `src/items.gen.js` (generated from Valve's game files). The same applies to the copy of Valve's layout inside the built VPK.

## Credits

Inspired by **Enhanced Quickbuy** by Aminsx: <https://gamebanana.com/mods/664041>. Improved Quickbuy is a separate mod written from scratch. It contains no code, style sheet, layout or asset from Enhanced Quickbuy. `tools/provenance.py` checks this against the original's VPK (see CREDITS.md).

The Quickbuy tab follows the menu markup and store page of CompLock HUD++ so that it looks and saves like CompLock's own tabs.

## Console

The game console (and `console.log` with `-condebug`) gets three lines per HUD load: `Improved Quickbuy: 1.0.3 loaded (<language>, words from …)`, the first update (play or shop, queue length, souls label found), and when the HUD row is first built. Errors also start with `Improved Quickbuy:`.
