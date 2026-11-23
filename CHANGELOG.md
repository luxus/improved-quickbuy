# Changelog

All notable changes to Improved Quickbuy are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Entries after 1.0.0 are generated from
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) with `tools/changelog.sh`
(see [CONTRIBUTING.md](CONTRIBUTING.md)); each GitHub release takes its notes from its section here.

## [Unreleased]

## [1.0.4] - 2026-11-23

Addon Settings 1.2.4 (`BUILD` 11; build 10 was an unshipped test) changes the ADDONS window:

- The list grows to 880 px before it scrolls, so five addons fit without cutting off the last card.
- The status ("Saved") sits in the window head; the empty footer strip is gone.
- The author line under each addon name is 13 px at 60 % instead of 10 px at 33 %.
- Toggle hover no longer changes a background colour. Row and switch colours are inline, so HUD++'s `:hover` rules do not apply to them.
- Addon names are bold.
- The window may take 98 % of the Esc menu area (it measured 875 px at 90 %); section titles have 6 px less margin.
- An addon with only a master switch is one row: its empty settings body collapses. Cards are 10 px apart.
- The master switch tooltip opens beside the window, like the row tooltips, instead of over the switch.
- The ADDONS headline names the block font (`VALVEPulp`); an inline `block` alias rendered thin.

### Fixed

- ADDONS list: older clients without `toggle` get their `on` (or only similarly named) toggle promoted to the header master; a section title that repeats the addon name is dropped. Reset is a small refresh icon, only if the addon has settings beyond that master, and only visible while the header is hovered. Each addon is its own card. Author is a tiny muted "by …" under the name. Child rows use left padding instead of a corner mark.
- Opening ADDONS threw `TypeError: Cannot assign to read only property 'id'` (Panorama panel.id is read-only after CreatePanel). The title label now gets its id in `CreatePanel`, so the header (master, Reset, author) and the other addons mount. A failed mount no longer stops the rest of the list. Esc menu lookup logs `Esc menu: found|not found looks=N`.
- With CompLock HUD++ installed, the ADDONS panel was empty: 1.0.4 skipped inline layout styles on our own wrappers, which HUD++ CSS does not define. Chrome is always dressed. Widget classes that HUD++ already styles (close, reset, status, rows) are not inlined, so CompLock's hover and colours apply.
- With HUD++, the ADDONS button sits on its own line below COMPLOCK (a new `#AddonSettingsRow` after `.HudppMenuRow`). `#changehero` and `#HudppPlay` are lifted by the 32 px row height (280+32, or 350+32 when `.CanChangeHero`) so the taller `#SubOptions` does not overlap SWAP HERO / PLAY. `.CanChangeHero` lands on `#EscapeMenu` after registration, so the menu look (it runs until CompLock's panel is first opened) re-reads it and moves PLAY to 382 px when it changes. Before, PLAY sat on SWAP HERO on the first Esc open after launch.

### Changed

- Addon Settings library `1.2.3` (`BUILD` 9, wire `API` still 1). The ADDONS window drops the tab bar: one larger panel lists addons vertically. Each addon is a header row (name, optional "by &lt;author&gt;" from schema `author`, and Reset) with a master on/off switch when the schema declares `toggle: '&lt;key&gt;'` (an existing toggle). Further settings sit under the header (`HudppSectionTitle` groups, CompLock row look) and collapse when the master is off. An addon without `toggle` has no switch and keeps its settings visible. Per-addon Reset stays on the header so it remains reachable when settings are hidden; the shared footer is status only ("Saved" uses `Hudpp_saved`, teal). Late registrations append to the list. Store keys are unchanged. `placement: 'complock'` still uses CompLock tabs (and falls back to ADDONS when HUD++ is missing). Improved Quickbuy declares `toggle: 'on'` and `author: 'luxus'`.
- The ADDONS panel uses CompLock's widget class names (`HudppRow`, `HudppSwitch`, `HudppChoice`, `HudppDim`, `HudppUndo`, `HudppIdle`, `HudppCredit`, and so on) so it matches CompLock when HUD++ is installed.

### Added

- CompLock-style behaviours in the shared library: Reset turns into Undo for 6 seconds, hold-to-repeat steppers, "Reset to …" on a changed slider value, choice chips for selects, short status text with a longer tooltip, and a `probe()` call so mid-match addons can register from `panorama/layout/addon_settings/register/<id>.xml`.

## [1.0.3] - 2026-11-21

### Fixed

- Toggle rows in the CompLock Quickbuy tab match [CompLock HUD++](https://deadlockconfig.com/)'s own rows: a compact 34 px line with the title on the left and the switch on the right. The description is a tooltip on hover (Valve's `UIShowTextTooltip`, the same event HUD++ uses), not a second line under the title. Sub-rows that depend on Enable get HUD++'s child indent. The Reset Quickbuy button and the Crosshair tab fix are unchanged.

## [1.0.2] - 2026-11-21

### Fixed

- The reset button in the CompLock Quickbuy tab is labelled "Reset Quickbuy" (and the matching phrase in the other languages) and sits on the right of the foot, like CompLock's own reset. The tab title stays "Quickbuy".
- Clicking Crosshair (or HUD) after opening Quickbuy from that same tab works again. CompLock HUD++'s `showTab` returns at once when the requested tab is already current, so the click did nothing until another HUD++ tab was selected first.

## [1.0.1] - 2026-11-21

### Fixed

- The Quickbuy settings tab works again with [CompLock HUD++](https://deadlockconfig.com/) from 20/21 Nov (HUD, Minimap, and Crosshair tabs). The old hook showed HUD++'s own bodies on top of the Quickbuy tab.
- Toggle rows in that menu show their label, description and switch in distinct slots again. HUD++'s 20/21 Nov row CSS is a single 34 px line without a description slot, which had stacked the description on the label and clipped the switch.

## [1.0.0] - 2026-11-19

First public release.

### Added

- Up to 5 quickbuy items on the HUD (1 = vanilla).
- A missing souls badge above each item, counted along your queue.
- Shop: running totals per queued item and a total for the whole queue.
- Integration into [CompLock HUD++](https://deadlockconfig.com/): its own "Quickbuy" tab, every feature togglable.
- Works without HUD++: an ADDONS button in the Esc menu opens its own settings window.
- "Reset tab" puts the options back to their defaults; a "Saved" line shows when they are stored, like CompLock's own tabs.
- The ADDONS window closes with its X button, ignores clicks inside it and reopens on the last tab.
- Texts in every language Deadlock ships (18), following the game's client language; English and German by hand, the others machine-made.
- [Addon Settings](https://github.com/luxus/improved-quickbuy/blob/main/docs/ADDON-SETTINGS-API.md), the settings library behind the tab and the window, which other mods can vendor for their own tabs (`lib/addon-settings/`, example in `examples/hello-addon`).
- Rewritten from scratch with performance in mind.

[Unreleased]: https://github.com/luxus/improved-quickbuy/compare/v1.0.4...HEAD
[1.0.4]: https://github.com/luxus/improved-quickbuy/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/luxus/improved-quickbuy/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/luxus/improved-quickbuy/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/luxus/improved-quickbuy/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/luxus/improved-quickbuy/releases/tag/v1.0.0
