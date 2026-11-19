#!/usr/bin/env node
// Write Valve loc files from a JS string table: node tools/loc.js <strings.js> <const name> <pak dir> <name>
//   -> <pak dir>/resource/localization/<name>/<name>_<language>.txt, written like Valve's own files there:
//      UTF-8 with BOM, CRLF, "lang" { "Language" "Tokens" { ... } }
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const [src, name, dir, base] = process.argv.slice(2);
if (!base) { console.error('usage: loc.js <strings.js> <const name> <pak dir> <name>'); process.exit(1); }
const table = vm.runInNewContext(fs.readFileSync(src, 'utf8') + '\n;' + name);
const q = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
const out = path.join(dir, 'resource', 'localization', base);
fs.mkdirSync(out, { recursive: true });
for (const lang of Object.keys(table)) {
	const lines = ['"lang"', '{', '\t"Language"\t' + q(lang), '\t"Tokens"', '\t{'];
	for (const [k, v] of Object.entries(table[lang])) {
		if (!/^[A-Za-z0-9_]+$/.test(k)) throw new Error(lang + ': bad token ' + k);
		lines.push('\t\t' + q(k) + '\t' + q(v));
	}
	lines.push('\t}', '}', '');
	fs.writeFileSync(path.join(out, base + '_' + lang + '.txt'), '\ufeff' + lines.join('\r\n'));
	console.log(path.join('resource', 'localization', base, base + '_' + lang + '.txt'));
}
