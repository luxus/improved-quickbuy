# Hello Addon (Addon Settings example)

The smallest addon that uses [Addon Settings](../../docs/ADDON-SETTINGS-API.md): one toggle, one slider,
one select. `sh build.sh` writes `build/pak/panorama/scripts/hello_addon.js` (library + `src/hello_addon.js`
in one scope). To load it in game, include that script from the layout your addon already overrides,
for example:

```xml
<scripts>
	<include src="s2r://panorama/scripts/hello_addon.vjs_c" />
</scripts>
```

It is not part of the Improved Quickbuy VPK; the tests load it next to Improved Quickbuy to check that two
addons share one settings menu.
