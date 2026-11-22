#!/usr/bin/env node
// Valve's text tooltip opens to the right of its anchor.
// The switch is at the window's right edge, so a tooltip on it is cut off (ca863b1).
// The title block covers the switch and the reset icon (f9268eb). The anchor is the addon header.
'use strict';
const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || 'lib/addon-settings/addon_settings.js', 'utf8');
const fail = msg => { console.log('FAIL ' + msg); process.exit(1); };
if (/tipShow\(\s*wrap\b/.test(src)) fail('The master tooltip is anchored on the switch (wrap). Valve opens it to the right, off the window. Anchor it on the addon header. See ca863b1.');
if (/tipShow\(\s*titles\b/.test(src)) fail('The master tooltip is anchored on the title block (titles). It covers the switch and the reset icon. Anchor it on the addon header. See f9268eb.');
const m = /const tipAt = ([^;]+);/.exec(src);
if (!m) fail('mount() does not set tipAt. Anchor the master tooltip on the addon header (head). See ca863b1 and f9268eb.');
if (/\btitles\b/.test(m[1]) || /^\s*wrap\s*$/.test(m[1])) fail("tipAt is '" + m[1].trim() + "'. Anchor the master tooltip on the addon header (head), not the switch or the title block.");
if (!/\bhead\b/.test(m[1])) fail("tipAt is '" + m[1].trim() + "'. Anchor the master tooltip on the addon header (head).");
console.log('ok master tooltip anchors on the addon header');
