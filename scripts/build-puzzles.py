#!/usr/bin/env python3
"""
Builds src/data/puzzles.json from the Lichess puzzle database (CC0):
https://database.lichess.org/#puzzles

Streams the .csv.zst once (no full download kept on disk) and keeps a
balanced, high-quality selection:
  * a reservoir per 100-point rating band (the rated pool),
  * extra puzzles per tactical theme so every theme has practice material,
  * puzzles from the openings in the Outpost library,
  * puzzles from master / super-GM games.

Usage:  curl -s https://database.lichess.org/lichess_db_puzzle.csv.zst | python3 scripts/build-puzzles.py
Requires: pip install zstandard
"""
import csv
import io
import json
import os
import random
import sys

import zstandard

random.seed(20261126)

PER_BAND = int(os.environ.get('PER_BAND', 330))
PER_THEME = int(os.environ.get('PER_THEME', 110))
PER_OPENING = int(os.environ.get('PER_OPENING', 220))
MASTER = int(os.environ.get('MASTER', 700))

OPENING_TAGS = [
    ('najdorf', 'Sicilian_Defense_Najdorf_Variation'),
    ('dragon', 'Sicilian_Defense_Dragon_Variation'),
    ('ruy-lopez', 'Ruy_Lopez'),
    ('italian', 'Italian_Game'),
    ('queens-gambit', 'Queens_Gambit_Declined'),
    ('queens-gambit', 'Queens_Gambit_Accepted'),
    ('london', 'London_System'),
    ('catalan', 'Catalan_Opening'),
    ('english', 'English_Opening'),
    ('french', 'French_Defense'),
    ('caro-kann', 'Caro-Kann_Defense'),
    ('kings-indian', 'Kings_Indian_Defense'),
    ('nimzo-indian', 'Nimzo-Indian_Defense'),
    ('grunfeld', 'Grunfeld_Defense'),
    ('slav', 'Semi-Slav_Defense'),
    ('slav', 'Slav_Defense'),
]

THEMES = [
    'fork', 'pin', 'skewer', 'discoveredAttack', 'doubleCheck', 'backRankMate', 'smotheredMate',
    'mateIn1', 'mateIn2', 'mateIn3', 'mateIn4', 'sacrifice', 'deflection', 'attraction', 'clearance',
    'interference', 'xRayAttack', 'zugzwang', 'quietMove', 'defensiveMove', 'hangingPiece',
    'trappedPiece', 'promotion', 'underPromotion', 'advancedPawn', 'capturingDefender', 'intermezzo',
    'exposedKing', 'kingsideAttack', 'queensideAttack', 'enPassant', 'castling', 'anastasiaMate',
    'arabianMate', 'bodenMate', 'dovetailMate', 'hookMate', 'doubleBishopMate',
    'rookEndgame', 'pawnEndgame', 'queenEndgame', 'bishopEndgame', 'knightEndgame', 'queenRookEndgame',
    'opening', 'middlegame', 'endgame', 'equality', 'advantage', 'crushing', 'mate',
    'oneMove', 'short', 'long', 'veryLong', 'master', 'masterVsMaster', 'superGM',
]
PRACTICE_THEMES = THEMES[:44]
theme_index = {t: i for i, t in enumerate(THEMES)}


class Reservoir:
    def __init__(self, size):
        self.size = size
        self.items = []
        self.seen = 0

    def add(self, item):
        self.seen += 1
        if len(self.items) < self.size:
            self.items.append(item)
        else:
            j = random.randrange(self.seen)
            if j < self.size:
                self.items[j] = item


bands = {}
themes = {t: Reservoir(PER_THEME) for t in PRACTICE_THEMES}
openings = {}
master = Reservoir(MASTER)

reader = zstandard.ZstdDecompressor().stream_reader(sys.stdin.buffer)
text = io.TextIOWrapper(reader, encoding='utf-8')
rows = csv.reader(text)
header = next(rows)
col = {name: i for i, name in enumerate(header)}
n = 0
kept = 0
for row in rows:
    n += 1
    if n % 500000 == 0:
        print(f'  scanned {n:,} puzzles', file=sys.stderr, flush=True)
    try:
        rating = int(row[col['Rating']])
        rd = int(row[col['RatingDeviation']])
        pop = int(row[col['Popularity']])
        plays = int(row[col['NbPlays']])
    except ValueError:
        continue
    if pop < 80 or plays < 150 or rd > 90:
        continue
    moves = row[col['Moves']].split()
    if len(moves) < 2 or len(moves) > 12:
        continue
    kept += 1
    tags = row[col['Themes']].split()
    otags = row[col['OpeningTags']]
    opening = None
    for oid, tag in OPENING_TAGS:
        if tag in otags.split():
            opening = oid
            break
    item = (row[col['PuzzleId']], row[col['FEN']], row[col['Moves']], rating, tags, opening)
    band = max(4, min(29, rating // 100))
    bands.setdefault(band, Reservoir(PER_BAND)).add(item)
    for t in tags:
        if t in themes:
            themes[t].add(item)
    if opening:
        openings.setdefault(opening, Reservoir(PER_OPENING)).add(item)
    if 'master' in tags or 'masterVsMaster' in tags or 'superGM' in tags:
        master.add(item)

selected = {}
for r in list(bands.values()) + list(themes.values()) + list(openings.values()) + [master]:
    for it in r.items:
        selected[it[0]] = it

OPENING_IDS = sorted({o for o, _ in OPENING_TAGS})
out = []
for pid, fen, mv, rating, tags, opening in sorted(selected.values(), key=lambda x: x[3]):
    out.append([
        pid,
        fen,
        mv,
        rating,
        [theme_index[t] for t in tags if t in theme_index],
        OPENING_IDS.index(opening) if opening else -1,
    ])

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
dest = os.path.join(root, 'src', 'data', 'puzzles.json')
with open(dest, 'w') as f:
    json.dump({'source': 'Lichess puzzle database (CC0), https://database.lichess.org/#puzzles',
               'themes': THEMES, 'openings': OPENING_IDS, 'puzzles': out}, f, separators=(',', ':'))
print(f'scanned {n:,}, eligible {kept:,}, selected {len(out):,} -> {dest} ({os.path.getsize(dest)/1e6:.1f} MB)', file=sys.stderr)
for t in PRACTICE_THEMES:
    print(f'  {t}: {len(themes[t].items)}', file=sys.stderr, end='')
print(file=sys.stderr)
for o, r in sorted(openings.items()):
    print(f'  {o}: {len(r.items)} (of {r.seen})', file=sys.stderr)
