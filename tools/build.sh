#!/bin/sh
# Build build/improved-quickbuy.vpk (install as any addons/pakNN_dir.vpk; HUD++ does not ship hud_quickbuy.xml).
#   tools/gen_items.py abilities.vdata gc_mod_names generic_data.vdata src/items.gen.js  (only after a game update)
#   src/*.js            -> panorama/scripts/improved_quickbuy.js (one script, one scope)
#   vanilla/hud_quickbuy.xml + our two includes     -> panorama/layout/hud_quickbuy.xml
set -e
cd "$(dirname "$0")/.."
MODLOCK=${MODLOCK:-/workspace/qol-extract/tools/modlock}
sh tools/assemble.sh
MODLOCK_NO_UPDATE_CHECK=1 "$MODLOCK" panorama compile build/pak -o build/improved-quickbuy.vpk --addon improved-quickbuy
sha256sum build/improved-quickbuy.vpk
