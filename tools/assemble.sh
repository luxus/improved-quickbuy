#!/bin/sh
# Assemble build/pak (script, style sheet, layout) from src/ and vanilla/. No modlock needed: CI and tests use this.
set -e
cd "$(dirname "$0")/.."
rm -rf build/pak && mkdir -p build/pak/panorama/scripts build/pak/panorama/styles build/pak/panorama/layout
VER=$(sed -n "s/^const VERSION = '\\([^']*\\)';/\\1/p" src/main.js | head -n 1)
{
	echo "// Improved Quickbuy $VER - built from src/ by tools/build.sh; inspired by Enhanced Quickbuy (gamebanana.com/mods/664041), no code of it included."
	echo '(() => {'
	echo "'use strict';"
	sh lib/addon-settings/vendor.sh print
	cat src/strings.js src/items.gen.js src/main.js
	echo '})();'
} > build/pak/panorama/scripts/improved_quickbuy.js
cp src/improved_quickbuy.css build/pak/panorama/styles/improved_quickbuy.css
node tools/loc.js src/strings.js STRINGS build/pak improved_quickbuy >/dev/null
python3 tools/layout.py vanilla/hud_quickbuy.xml build/pak/panorama/layout/hud_quickbuy.xml
node --check build/pak/panorama/scripts/improved_quickbuy.js
