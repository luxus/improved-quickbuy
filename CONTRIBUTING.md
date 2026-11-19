# Contributing

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>(<optional scope>): <summary in the imperative, lower case, no period>
```

| Type | Use for | Changelog section |
| --- | --- | --- |
| `feat` | something new a player can see or use | Added |
| `fix` | a bug a player could hit | Fixed |
| `perf` | less work in game, same behavior | Changed |
| `revert` | undoing an earlier change | Removed |
| `refactor` | code changes with no effect in game | not listed |
| `docs` | README, CREDITS, comments | not listed |
| `chore` | build, tools, CI, tests, release housekeeping | not listed |

Scopes are optional; useful ones are `hud`, `shop`, `settings`, `complock`, `dmm`.
A breaking change (for example settings that no longer load) gets a `!` after the type and a
`BREAKING CHANGE:` footer, and means a major version bump. Write the summary for players: it becomes the
changelog line as is.

## Versions

[Semantic Versioning](https://semver.org/spec/v2.0.0.html): `fix`/`perf` only → patch, any `feat` → minor,
any breaking change → major. 1.0.0 is the first release and the changelog baseline; earlier development
history is not in the changelog.

## Making a release

1. `tools/check.sh` is green (tests, mutants, provenance) and the VPK was tried in game.
2. `tools/changelog.sh preview` shows the new section from the commits since the last tag.
3. `tools/changelog.sh release X.Y.Z` writes it into `CHANGELOG.md` as `[X.Y.Z] - <today>`; edit the
   wording if needed.
4. Store the VPK as `release/improved-quickbuy-X.Y.Z.vpk.b64` with its `.sha256`, and point
   `site/mods/improved-quickbuy.json` at it (`release.id`, `version`, `contentRevision`, artifact
   `filename`, `download.url`, `size`, `hashes.sha256`).
5. Commit as `chore(release): X.Y.Z`, then tag `vX.Y.Z` on that commit and push the tag.

The tag starts `.github/workflows/publish.yml`: it checks that tag, `CHANGELOG.md`, listing and VPK agree,
runs Deadlock Mod Manager's source checker, updates GitHub Pages, and creates a draft release whose notes
are the `CHANGELOG.md` section (`tools/changelog.sh notes X.Y.Z`). Publish the draft by hand.

`tools/changelog.sh preview` and `release` need [git-cliff](https://git-cliff.org) (or `npx`); CI does not
use it.
