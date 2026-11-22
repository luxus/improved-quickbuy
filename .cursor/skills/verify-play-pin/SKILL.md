---
name: verify-play-pin
description: "Check that Addon Settings' menu look rewrites #HudppPlay's margin when .CanChangeHero arrives after the ADDONS row. Use when editing step, syncPlay, liftPins, or the Esc pin in lib/addon-settings/addon_settings.js."
---

# Verify PLAY's pin

PLAY's margin is wrong when `.CanChangeHero` lands on `#EscapeMenu` after `liftPins` and the menu look does not write it. PLAY then sits on SWAP HERO. That happened on lea on 22 Nov 2026. Commits `c4eda93`, `7d76853`, `fdcfd5e`, and `d2eb832` tried other repairs and were reverted. `e17b680` is the fix.

## What is checked

After every menu look (`step`), if the ADDONS row has bound `#HudppPlay`, its `margin-bottom` is `312px` without `.CanChangeHero` and `382px` with it. `280` and `350` are HUD++'s own pins. `32` is one Esc row.

The check passes only when the source does all three of these:

- `liftPins` stores the PLAY panel on `W.play`.
- `syncPlay` reads `BHasClass('CanChangeHero')` and assigns `style.marginBottom`.
- `step` calls `syncPlay()`.

`step` calls `syncPlay` as one step, the same way the file does. A class arriving is not a write. HUD++'s `.CanChangeHero #HudppPlay` rule did not rewrite the margin (reverts `a58eb80`, `9d4f5a0`, `d6f1616`, `bf6b008`).

## How to run

From the repo root, with Node:

```
node tools/guard-play-pin.js
node tools/guard-play-pin.js --prove
```

The first must print `ok` for the file and `ok self-test`. It deletes `syncPlay();` from `step` in a copy and that copy must fail. `--prove` must fail `d6f1616` and pass `e17b680`. That needs the objects from `origin/feat/addons-window-polish`. A missing object is a failed proof, not a pass.

CI runs `node tools/guard-play-pin.js` from `.github/workflows/ci.yml`.

## How to read a failure

`step() does not call syncPlay()` means the look never rewrites the margin. The counterexample is the bug: `liftPins` while the class is absent, the class arrives, the next look leaves `312px`.

`syncPlay() does not write marginBottom from CanChangeHero` means the look runs but does not record the class.

`liftPins() does not keep W.play` means `syncPlay` returns immediately because it has no panel.

A failure that names a bad order while all three source facts are present is a bug in the model, or a new step the model does not have. Do not weaken the check. Read `liftPins`, `syncPlay`, and `step` and update the model so each of its steps is still one step of those functions.

## Coverage

- Files: `lib/addon-settings/addon_settings.js`
- Functions: `liftPins`, `syncPlay`, `step`
- Sync commit: `a3edff33b59e903046e251c48a8df53bb08ca18e`
- Move the sync commit only after you have read those three functions at the new commit and the steps above still describe them.

## What this does not cover

It does not run the game. It does not model the opacity fade, `translateY`, or a second timer. Those were the reverted attempts, and they did not write this margin. It stops at five events. It assumes HUD++ does not write `#HudppPlay`'s margin when the class changes.
