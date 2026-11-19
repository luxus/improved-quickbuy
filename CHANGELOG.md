# Changelog

All notable changes to Improved Quickbuy are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Entries after 1.0.0 are generated from
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) with `tools/changelog.sh`
(see [CONTRIBUTING.md](CONTRIBUTING.md)); each GitHub release takes its notes from its section here.

## [Unreleased]

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

[Unreleased]: https://github.com/luxus/improved-quickbuy/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/luxus/improved-quickbuy/releases/tag/v1.0.0
