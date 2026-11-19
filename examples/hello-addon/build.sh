#!/bin/sh
# Build the example's pak folder: the library vendored in front of the addon's script (one script, one scope).
# Compile it like any Panorama addon (e.g. modlock panorama compile build/pak -o hello-addon.vpk).
set -e
cd "$(dirname "$0")"
LIB=../../lib/addon-settings
rm -rf build/pak && mkdir -p build/pak/panorama/scripts
{ echo '(() => {'; echo "'use strict';"; sh "$LIB/vendor.sh" print; cat src/hello_addon.js; echo '})();'; } > build/pak/panorama/scripts/hello_addon.js
node --check build/pak/panorama/scripts/hello_addon.js
echo build/pak/panorama/scripts/hello_addon.js
