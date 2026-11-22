#!/bin/sh
# Build, test, negative controls, provenance. ORIGINAL=<Enhanced Quickbuy pak> VANILLA=<Valve decompiled dir> HUDPP=<HUD++ decompiled dir>
set -e
cd "$(dirname "$0")/.."
for f in tools/guard-*.js; do node "$f" || exit 1; done
sh tools/build.sh
node test/test.js
sh examples/hello-addon/build.sh >/dev/null && node test/registry.js
sh test/mutants.sh | tee /tmp/iqb_mutants.txt
! grep -q -e SURVIVED -e BROKEN /tmp/iqb_mutants.txt
python3 tools/provenance.py --ours build/improved-quickbuy.vpk --original "${ORIGINAL:?}" --vanilla "${VANILLA:?}" ${HUDPP:+--allowed "$HUDPP"}
