# Outpost — offline chess coach

Outpost is a chess training app for intermediate and advanced players. It runs entirely on your device, including a Stockfish 18 engine compiled to WebAssembly, so it works offline once installed. On iPhone you install it from Safari as a home-screen app.

## What it does

**Play the coach.** Ten bot levels, from about 800 to full-strength Stockfish. With the live coach on, every move you make is graded (`!!`, `!`, `★`, `?!`, `?`, `??`…) and explained in plain language: what the move does, what it allowed, and what was better. Tiered hints go from a threat check, to the plan, to candidate pieces, to the best move. Take back a mistake and try again.

**Opening library.** 14 openings with 58 annotated lines for both colours: Ruy Lopez, Italian, Queen's Gambit, London, Catalan, English, Najdorf, Dragon, French, Caro-Kann, King's Indian, Nimzo-Indian, Grünfeld and Slav. Each one comes with its main ideas for both sides, typical structures, middlegame plans and traps. Every line has been checked move by move with Stockfish.

- **Learn** walks you through a line with commentary on each move.
- **Drill** makes you recall it. Missed moves are flagged and come back sooner.
- **Play it** starts a game where the bot follows theory from that opening until it runs out. If you leave the book, the coach tells you what theory recommends.

**Games and analysis.** Import games from PGN (paste or file), Lichess or Chess.com. The coach review grades every move, works out accuracy per side and per phase, finds the key moments and writes a short summary. Critical verdicts are re-checked with a deeper search before they are shown. You can explore variations and get a coach comment on any move you try.

**Your games become lessons.** After a review, each of your mistakes becomes a "find the better move" position in your review deck. You can save any position from the analysis board, or play on from it against the bot.

**Spaced repetition.** Opening lines and positions from your own games are scheduled with an SM-2-style algorithm, and the Train tab shows what is due.

**Strategy lessons.** 12 interactive lessons, each with tasks checked by the engine: the isolated queen's pawn, the minority attack, hanging pawns, pawn chains, the hedgehog, opposite-side castling, knight against a bad bishop, outposts, open files, prophylaxis, calculation and the Lucena and Philidor positions.

**Training plans.** Seven tracks (positional foundations, answering 1.e4, answering 1.d4, 1.e4 or 1.d4 for White, attack and calculation, endgames). The Today screen builds a daily session from your due reviews, unreviewed games, your current track and the weaknesses found in your games.

**Position report.** For any position the coach names the structure (IQP, Carlsbad, French chain, Maróczy, hedgehog and more) and gives plans for your side. It also points out open files, outposts, weak pawns, bad bishops, king safety and your least active piece.

Your data stays in the browser's IndexedDB on your device. Settings has backup export and restore.

## Install on iPhone

1. Open the deployed site in Safari.
2. Tap Share, then **Add to Home Screen**.
3. Open it once while online so the service worker can cache everything (about 8 MB, most of it the engine).

After that it works offline. Importing from Lichess or Chess.com is the only feature that needs a connection.

## Deploying

The build output in `dist/` is a static site that works at a domain root or under a sub-path.

### GitHub Pages (included)

`.github/workflows/pages.yml` builds and publishes the default branch. One-time setup: in the repository, go to **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**, then re-run the workflow. The site appears at `https://<user>.github.io/<repo>/`.

### Cloudflare Workers (static assets)

`wrangler.jsonc` is ready to use:

```bash
npm run build
```

```bash
npx wrangler deploy
```

This needs an API token with *Workers Scripts: Edit* permission.

## Development

```bash
npm install
```

```bash
npm run dev
```

`npm install` copies the Stockfish files into `public/engine/` (see `scripts/copy-engine.mjs`).

Other useful commands:

```bash
npm test
```

```bash
npm run build
```

```bash
npx tsx scripts/validate-content.ts --engine --depth 13
```

The last one replays every opening line and lesson position and flags any move that loses more than 0.9 pawns at the given depth.

## How the coach works

- `src/lib/engine/stockfish.ts` is a UCI driver for the single-threaded Stockfish WASM build in a Web Worker. It queues jobs, can cancel them, and caches results.
- `src/lib/coach/board.ts` holds attack maps and static exchange evaluation.
- `src/lib/coach/tactics.ts` detects forks, pins, skewers, discovered attacks, hanging pieces and sacrifices, and measures what an engine line wins.
- `src/lib/coach/structure.ts` works out pawn structure, outposts, files, king safety and piece activity, and stores a plan library per structure.
- `src/lib/coach/explain.ts` classifies moves using the lichess win-probability model and turns everything into coach language.
- `src/lib/coach/review.ts` runs full-game reviews, with a deeper verification pass on critical moments.

## Licences

- Stockfish.js is GPLv3.
- The cburnett chess pieces are GPLv2+.
- Opening names come from the [lichess chess-openings](https://github.com/lichess-org/chess-openings) dataset (CC0).

Because it bundles GPL components, the app as distributed is GPL-3.0-or-later.
