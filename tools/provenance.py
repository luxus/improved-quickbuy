#!/usr/bin/env python3
"""Provenance check: no line and no asset of Enhanced Quickbuy (GameBanana 664041) is in our build.

  tools/provenance.py --ours build/improved-quickbuy.vpk --original <Enhanced Quickbuy pak> \
      --vanilla <dir of Valve's decompiled files> [--allowed <HUD++ decompiled dir>] [--also <other vpk>]

Both VPKs are decompiled with Source2Viewer-CLI (what the game sees, not our sources). Every text file is
normalized: comments dropped (// and /* */ and <!-- -->), whitespace collapsed, case folded. Then:
  1. assets: every file of ours vs every file of the original, by sha256 of the compiled bytes and of the
     decompiled text;
  2. lines: every normalized line of ours with at least MIN_CHARS characters that also occurs in the original;
  3. shingles: every run of SHINGLE consecutive tokens of ours that also occurs in the original.
Lines and shingles that occur in Valve's vanilla files (or in --allowed sources, i.e. HUD++, whose public
conventions we follow) are not the original's expression and are listed separately, not as findings.
Exit code 1 if anything is found."""
import argparse, hashlib, os, re, subprocess, sys, tempfile

CLI = os.environ.get('S2V', '/tmp/vrf/Source2Viewer-CLI')
MIN_CHARS = 12
SHINGLE = 12
TEXT = ('.js', '.css', '.xml', '.txt')
# language boilerplate that any file of its kind has; listed with the reason, reported, not counted
GENERIC = {
    "'use strict';": 'JavaScript strict-mode directive',
    'margin-top: 1px;': 'single CSS declaration',
}
# a layout run made only of layout keywords and Valve's own tokens is structure, not expression: the
# <scripts> block every layout with a script has, next to Valve's markup
LAYOUT_WORDS = {'root', 'styles', 'scripts', 'include', 'src'}

def decompile(vpk):
    out = tempfile.mkdtemp(prefix='prov_')
    subprocess.run([CLI, '-i', vpk, '-d', '-o', out, '-q'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return out

def raw_files(vpk):
    out = tempfile.mkdtemp(prefix='provraw_')
    subprocess.run([CLI, '-i', vpk, '-o', out, '-q'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return walk(out)

def walk(d):
    files = {}
    for base, _, names in os.walk(d):
        for n in names:
            p = os.path.join(base, n)
            files[os.path.relpath(p, d)] = p
    return files

def strip_comments(t):
    t = re.sub(r'<!--.*?-->', ' ', t, flags=re.S)
    t = re.sub(r'/\*.*?\*/', ' ', t, flags=re.S)
    t = re.sub(r'(?<![:"\'])//.*$', '', t, flags=re.M)
    return t

def norm_lines(t):
    for line in strip_comments(t).split('\n'):
        n = ' '.join(line.split()).lower()
        if len(n) >= MIN_CHARS:
            yield n

TOKEN = re.compile(r'[A-Za-z_$][A-Za-z0-9_$]*|\d+|"[^"\n]*"|\'[^\'\n]*\'|`[^`]*`|\S')

def tokens(t):
    return [x.lower() for x in TOKEN.findall(strip_comments(t))]

def shingles(t):
    tk = tokens(t)
    return {' '.join(tk[i:i + SHINGLE]) for i in range(max(0, len(tk) - SHINGLE + 1))}

def texts(files):
    return {k: open(p, encoding='utf-8', errors='replace').read() for k, p in files.items() if k.endswith(TEXT)}

def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ours', required=True)
    ap.add_argument('--original', required=True)
    ap.add_argument('--vanilla', required=True)
    ap.add_argument('--allowed', action='append', default=[])
    ap.add_argument('--also', action='append', default=[])
    a = ap.parse_args()

    ours = texts(walk(decompile(a.ours)))
    common_lines, common_sh = set(), set()
    for d in [a.vanilla] + a.allowed:
        for t in texts(walk(d)).values():
            common_lines.update(norm_lines(t)); common_sh.update(shingles(t))

    valve_tokens = set()
    for t in texts(walk(a.vanilla)).values():
        valve_tokens.update(tokens(t))
    def structural(name, run):
        return name.endswith('.xml') and all(not re.match(r'\w', x) or x in LAYOUT_WORDS or x in valve_tokens for x in run.split(' '))

    found = 0
    for ref in [a.original] + a.also:
        informational = ref in a.also
        label = os.path.basename(ref)
        theirs = texts(walk(decompile(ref)))
        their_lines, their_sh = set(), set()
        for t in theirs.values():
            their_lines.update(norm_lines(t)); their_sh.update(shingles(t))

        # 1. assets
        mine_raw = {k: sha(p) for k, p in raw_files(a.ours).items()}
        their_raw = {sha(p): k for k, p in raw_files(ref).items()}
        same_assets = [(k, their_raw[h]) for k, h in mine_raw.items() if h in their_raw]
        their_txt = {hashlib.sha256(t.encode()).hexdigest(): k for k, t in theirs.items()}
        same_assets += [(k, their_txt[hashlib.sha256(t.encode()).hexdigest()]) for k, t in ours.items() if hashlib.sha256(t.encode()).hexdigest() in their_txt]

        # 2. lines, 3. shingles
        hits, shared = [], []
        sh_hits, sh_shared, sh_struct = [], [], []
        total_lines = 0
        for name, t in sorted(ours.items()):
            for n in norm_lines(t):
                total_lines += 1
                if n in their_lines:
                    (shared if n in common_lines or n in GENERIC else hits).append((name, n))
            for s in sorted(shingles(t)):
                if s in their_sh:
                    (sh_shared if s in common_sh else sh_struct if structural(name, s) else sh_hits).append((name, s))

        print(f'== against {label} ({len(theirs)} text files)')
        print(f'   our files: {", ".join(sorted(ours))}; {total_lines} normalized lines >= {MIN_CHARS} chars')
        print(f'   identical assets: {len(same_assets)}')
        for x in same_assets: print('     ASSET', x)
        print(f'   lines also in it: {len(hits)} (+{len(shared)} Valve/HUD++ text or generic, not counted)')
        for f, n in shared:
            if n in GENERIC: print('     generic', f, '|', n, '-', GENERIC[n])
        for f, n in hits: print('     LINE', f, '|', n[:160])
        print(f'   {SHINGLE}-token runs also in it: {len(sh_hits)} (+{len(sh_shared)} Valve/HUD++ text, +{len(sh_struct)} layout structure, not counted)')
        for f, x in sh_struct: print('     structure', f, '|', x[:160])
        for f, s in sh_hits[:60]: print('     RUN ', f, '|', s[:160])
        if os.environ.get('V'):
            for f, n in shared: print('     (valve/hud++ line)', f, '|', n[:160])
        if informational:
            print('   (informational: this build also holds our own v4-v7 code, which we may reuse; findings here are not failures)')
        else:
            found += len(same_assets) + len(hits) + len(sh_hits)
    print('RESULT:', 'clean' if not found else f'{found} findings')
    sys.exit(1 if found else 0)

main()
