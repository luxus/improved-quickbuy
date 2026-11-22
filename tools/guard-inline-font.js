#!/usr/bin/env node
// An inline fontFamily cannot use a stylesheet @define. 'block' rendered thin (ab048c6).
'use strict';
const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || 'lib/addon-settings/addon_settings.js', 'utf8');
const bad = [];
const re = /fontFamily:\s*'([^']*)'/g;
let m;
while ((m = re.exec(src))) if (!m[1].includes(',')) bad.push(m[1]);
if (bad.length) {
	console.log('FAIL fontFamily ' + bad.map(v => "'" + v + "'").join(', ') + ' is one token.');
	console.log('An inline style cannot use a stylesheet @define. Name the stack: VALVEPulp, Noto Sans, sans-serif. See ab048c6.');
	process.exit(1);
}
console.log('ok inline fontFamily values name a stack');
