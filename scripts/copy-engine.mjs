// Copies the single-threaded Stockfish WASM build into public/engine so it is
// served (and precached for offline use) alongside the app.
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'stockfish', 'bin');
const dest = join(root, 'public', 'engine');
const files = ['stockfish-18-lite-single.js', 'stockfish-18-lite-single.wasm'];

if (!existsSync(src)) {
  console.warn('[copy-engine] stockfish package not installed yet; skipping');
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
for (const f of files) copyFileSync(join(src, f), join(dest, f));
copyFileSync(join(root, 'node_modules', 'stockfish', 'Copying.txt'), join(dest, 'STOCKFISH-LICENSE.txt'));
console.log('[copy-engine] copied Stockfish engine to public/engine');
