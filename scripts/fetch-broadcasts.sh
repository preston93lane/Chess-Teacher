#!/usr/bin/env bash
# Streams Lichess broadcast PGNs (CC0) for the given months to stdout.
# Usage: scripts/fetch-broadcasts.sh 2024-11 2024-12 ... | node scripts/build-explorer.mjs
for m in "$@"; do
  echo "fetching $m" >&2
  curl -s "https://database.lichess.org/broadcast/lichess_db_broadcast_$m.pgn.zst" \
    | python3 -c "import sys,zstandard; zstandard.ZstdDecompressor().copy_stream(sys.stdin.buffer, sys.stdout.buffer)"
done
