#!/bin/sh
# node test/bench.js with a heap big enough that no GC runs inside a measured window
exec node --expose-gc --max-semi-space-size=256 "$(dirname "$0")/bench.js" "$@"
