#!/bin/sh
# Changelog and release notes from Conventional Commits (git-cliff, see cliff.toml).
#   tools/changelog.sh preview          print the section for commits since the last tag
#   tools/changelog.sh release 1.1.0    write that section into CHANGELOG.md as [1.1.0] - today
#   tools/changelog.sh notes 1.1.0      print the GitHub release notes for 1.1.0 (used by the publish workflow)
# preview/release need git-cliff (or npx); notes only reads CHANGELOG.md.
set -e
cd "$(dirname "$0")/.."
cliff() { if command -v git-cliff >/dev/null; then git-cliff "$@"; else npx -y git-cliff@2 "$@"; fi; }
case "$1" in
preview) cliff --config cliff.toml --unreleased --strip all ;;
release)
	v=${2:?version, e.g. 1.1.0}
	echo "$v" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || { echo "not semver: $v" >&2; exit 1; }
	grep -q "^## \[$v\]" CHANGELOG.md && { echo "CHANGELOG.md has $v already" >&2; exit 1; }
	section=$(cliff --config cliff.toml --unreleased --tag "v$v" --strip all)
	[ -n "$section" ] || { echo "no feat/fix/perf commits since the last tag" >&2; exit 1; }
	prev=$(grep -m1 -oE '^## \[[0-9]+\.[0-9]+\.[0-9]+\]' CHANGELOG.md | tr -d '#[] ')
	SECTION="$section" V="$v" PREV="$prev" python3 - <<'PY'
import os, re
p = 'CHANGELOG.md'; s = open(p).read()
v, prev, sec = os.environ['V'], os.environ['PREV'], os.environ['SECTION'].strip()
s = s.replace('## [Unreleased]\n', '## [Unreleased]\n\n' + sec + '\n', 1)
s = re.sub(r'\n{3,}', '\n\n', s)
base = 'https://github.com/luxus/improved-quickbuy'
s = re.sub(r'^\[Unreleased\]: .*$', f'[Unreleased]: {base}/compare/v{v}...HEAD\n[{v}]: {base}/compare/v{prev}...v{v}', s, count=1, flags=re.M)
open(p, 'w').write(s)
PY
	echo "CHANGELOG.md: added [$v]. Review it, then commit as: chore(release): $v" ;;
notes)
	v=${2:?version}
	body=$(awk -v h="## [$v]" 'index($0, h) == 1 { on = 1; next } on && /^## \[/ { exit } on && !/^\[.*\]: / { print }' CHANGELOG.md)
	[ -n "$(echo "$body" | tr -d '[:space:]')" ] || { echo "no [$v] section in CHANGELOG.md" >&2; exit 1; }
	sum=$(cut -d' ' -f1 "release/improved-quickbuy-$v.vpk.sha256")
	printf '%s\n\n' "$(echo "$body" | sed '/./,$!d')"
	cat <<NOTES
### Install

- Deadlock Mod Manager: add the source \`https://luxus.github.io/improved-quickbuy/dmm-source.json\` (or use the buttons on https://luxus.github.io/improved-quickbuy/) and install Improved Quickbuy.
- Manual: download \`improved-quickbuy-$v.vpk\`, rename it to a free slot such as \`pak03_dir.vpk\`, and put it into \`Deadlock/game/citadel/addons/\`. [CompLock HUD++](https://deadlockconfig.com/) is optional.

SHA-256 of \`improved-quickbuy-$v.vpk\`: \`$sum\`

Inspired by Enhanced Quickbuy by Aminsx (gamebanana.com/mods/664041). Written from scratch; contains no code or assets from it.
NOTES
	;;
*) sed -n '2,6p' "$0"; exit 1 ;;
esac
