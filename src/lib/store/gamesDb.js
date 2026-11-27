import { get, set, del } from 'idb-keyval';
const key = (id) => `game:${id}`;
export async function saveGameBody(g) {
    await set(key(g.id), g);
}
export async function loadGameBody(id) {
    return get(key(id));
}
export async function deleteGameBody(id) {
    await del(key(id));
}
export async function saveReview(id, review) {
    const g = await loadGameBody(id);
    if (!g)
        return;
    g.review = review;
    await saveGameBody(g);
}
