#!/usr/bin/env node
// The Esc parent measured 972px on lea (2be066d). 90% of that is 875px, shorter than an 880px list.
// A 640px list cut off the fifth addon (fe815eb).
'use strict';
const fs = require('fs');
const PARENT = 972;
const LIST_MIN = 880;
const src = fs.readFileSync(process.argv[2] || 'lib/addon-settings/addon_settings.js', 'utf8');
const block = name => {
	const i = src.indexOf(name + ': {');
	if (i < 0) return '';
	const j = src.indexOf('}', i);
	return j < 0 ? '' : src.slice(i, j);
};
const field = (name, key) => {
	const m = new RegExp(key + ":\\s*'([^']+)'").exec(block(name));
	return m ? m[1] : null;
};
const host = field('AddonSettingsHost', 'maxHeight');
const list = field('AddonSettingsMain', 'maxHeight');
const fail = msg => { console.log('FAIL ' + msg); process.exit(1); };
if (!host || !list) fail('LOOK is missing AddonSettingsHost.maxHeight or AddonSettingsMain.maxHeight.');
if (!/^\d+%$/.test(host)) fail("AddonSettingsHost.maxHeight is '" + host + "'. Use a percentage of the Esc menu parent. A fixed height clipped the window (2be066d).");
const listPx = /^(\d+)px$/.exec(list);
if (!listPx) fail("AddonSettingsMain.maxHeight is '" + list + "'. Use a px cap. 640px cut off the fifth addon (fe815eb).");
const px = Number(listPx[1]);
const room = PARENT * Number(host.slice(0, -1)) / 100;
if (px < LIST_MIN) fail('AddonSettingsMain.maxHeight is ' + px + 'px. 640px cut off the fifth addon. The list needs ' + LIST_MIN + 'px (fe815eb).');
if (px > room) fail('AddonSettingsMain.maxHeight ' + px + 'px does not fit in ' + host + ' of the Esc parent (' + PARENT + 'px is ' + room + 'px). 90% was 875px and clipped the list (2be066d).');
console.log('ok ADDONS list ' + px + 'px fits in ' + host + ' of the ' + PARENT + 'px Esc parent (' + room + 'px)');
