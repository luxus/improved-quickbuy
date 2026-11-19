# Credits and provenance

- **Idea:** Enhanced Quickbuy by Aminsx, <https://gamebanana.com/mods/664041> (CC BY-NC-ND 4.0). Improved Quickbuy reuses the idea of showing upcoming quickbuy items with the souls still missing, and of cost totals in the shop. It contains **no code, CSS, XML, layout or asset from Enhanced Quickbuy**.
- **Game files:**
  - The quickbuy layout `panorama/layout/hud_quickbuy.xml` is Valve's own, with two include lines added.
  - Item icons are Valve's images, addressed by the paths Valve's `abilities.vdata` gives.
- **License scope:** MIT (see LICENSE) covers this project's own code only. `vanilla/hud_quickbuy.xml` and the data in `src/items.gen.js` are Valve's and are not under MIT.
- **[CompLock HUD++](https://deadlockconfig.com/):** the Quickbuy tab uses CompLock's public menu classes (`HudppTab`, `HudppRow`, `HudppSlider`, …) and the same store page (`deadlockconfig.com/docs/hudpp-store/store.html`), under its own key `improved_quickbuy_settings`. No CompLock file is included or replaced.

## Provenance check

`tools/provenance.py` decompiles this mod's VPK and Enhanced Quickbuy's VPK and compares them:

1. **Assets:** every file, by hash of the compiled bytes and of the decompiled text.
2. **Lines:** every normalized line of at least 12 characters, with comments dropped, whitespace collapsed and case folded.
3. **Runs:** every run of 12 consecutive tokens.

Some matches are not counted as findings, and each is listed in the output:
- text that also appears in Valve's vanilla files or CompLock HUD++;
- two generic lines (`'use strict';` and `margin-top: 1px;`);
- the `<scripts>` block placed between Valve's own layout lines.
