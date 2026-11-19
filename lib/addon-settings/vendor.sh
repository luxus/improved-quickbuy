#!/bin/sh
# Vendor Addon Settings into an addon. Always copy the library unchanged; its BUILD decides which copy hosts.
#   vendor.sh print            the library on stdout, to put in front of your script (same JS scope)
#   vendor.sh pak <pak-dir>    write <pak-dir>/panorama/scripts/addon_settings/addon_settings_b<BUILD>.js,
#                              for a layout that includes it before your own script
set -e
here="$(cd "$(dirname "$0")" && pwd)"
lib="$here/addon_settings.js"
build=$(sed -n 's/^const BUILD = \([0-9][0-9]*\);.*/\1/p' "$lib")
[ -n "$build" ] || { echo "no BUILD in $lib" >&2; exit 1; }
banner="// Addon Settings $(cat "$here/VERSION") (build $build), vendored unchanged from lib/addon-settings. MIT."
case "$1" in
print) echo "$banner"; cat "$lib" ;;
pak)
	dir=${2:?pak dir}
	mkdir -p "$dir/panorama/scripts/addon_settings"
	{ echo "$banner"; cat "$lib"; } > "$dir/panorama/scripts/addon_settings/addon_settings_b$build.js"
	echo "panorama/scripts/addon_settings/addon_settings_b$build.js" ;;
*) sed -n '2,6p' "$0"; exit 1 ;;
esac
