import { get, set, del } from 'idb-keyval';
import type { GameReview } from '../coach/review';

export interface StoredGame {
  id: string;
  headers: Record<string, string>;
  startFen: string;
  sans: string[];
  comments?: Record<number, string>;
  review?: GameReview;
  /** Practice context, when the game started from an opening. */
  openingId?: string;
}

const key = (id: string) => `game:${id}`;

export async function saveGameBody(g: StoredGame) {
  await set(key(g.id), g);
}

export async function loadGameBody(id: string): Promise<StoredGame | undefined> {
  return get<StoredGame>(key(id));
}

export async function deleteGameBody(id: string) {
  await del(key(id));
}

export async function saveReview(id: string, review: GameReview) {
  const g = await loadGameBody(id);
  if (!g) return;
  g.review = review;
  await saveGameBody(g);
}
