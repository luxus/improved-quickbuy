#!/usr/bin/env python3
"""The one vanilla file we override: Valve's hud_quickbuy layout, unchanged except for two includes (our
style sheet after Valve's, our script). It is the only way to get a script into the quickbuy panel: HUD++
already overrides hud.xml and hud_quickbuy.css, and we must not shadow either. Everything else we show is
created at run time."""
import sys
src, out = sys.argv[1:3]
x = open(src, encoding='utf-8').read()
if x.startswith('<!--'):
    x = x[x.index('-->') + 3:].lstrip()
anchor = '\t\t<include src="s2r://panorama/styles/hud_quickbuy_entry.vcss" />\n\t</styles>\n'
assert x.count(anchor) == 1, 'vanilla hud_quickbuy.xml changed: check the styles block'
x = x.replace(anchor, anchor.replace('\t</styles>\n', '\t\t<include src="s2r://panorama/styles/improved_quickbuy.vcss_c" />\n\t</styles>\n'
                                    '\t<scripts>\n\t\t<include src="s2r://panorama/scripts/improved_quickbuy.vjs_c" />\n\t</scripts>\n'))
open(out, 'w', encoding='utf-8').write('<!-- Valve hud_quickbuy layout + Improved Quickbuy includes (tools/layout.py) -->\n' + x)
