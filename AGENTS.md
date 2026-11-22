# Rules

A comment does not enforce a rule. The check named here does.

| Mistake | Check |
| --- | --- |
| `step()` does not call `syncPlay()`, so `#HudppPlay` keeps the margin `liftPins` saw | `node tools/guard-play-pin.js`, a lint. The failure names the fix: `step()` calls `syncPlay()` |
| inline `fontFamily` is one token, such as the `@define` name `block` | `node tools/guard-inline-font.js` |
| ADDONS list is under 880px, or taller than the host's percentage of the 972px Esc parent | `node tools/guard-look-height.js` |
| master tooltip is anchored on the switch or the title block | `node tools/guard-tooltip-anchor.js` |
| `HEAD` does not contain `origin/main` | `node tools/guard-branch-base.js` |

CI runs every `tools/guard-*.js`. This file names those checks.

Release vpks `1.0.0` through `1.0.3` contain the same `BUILD` and `VERSION` as the tag they were cut from. No commit shipped a vpk from a different tree, so there is no stale-vpk check.

`4796ca0` set `HudppTab_*` to hide HUD++ bodies. `23421fd` uses inline visibility. That happened once. The stand-in test is the check.

No commit drops an id from `vanilla/hud_quickbuy.xml`. `tools/layout.py` copies that file and adds two includes. A dropped id is not guarded here.
