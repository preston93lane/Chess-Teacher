/** Piece sets (SVG, served from public/pieces/<id>/). Licences in README. */
export const PIECE_SETS = [
    { id: 'cburnett', name: 'Classic' },
    { id: 'merida', name: 'Merida' },
    { id: 'chessnut', name: 'Chessnut' },
    { id: 'celtic', name: 'Celtic' },
    { id: 'spatial', name: 'Spatial' },
    { id: 'fantasy', name: 'Fantasy' },
    { id: 'mpchess', name: 'Bold' },
    { id: 'papercut', name: 'Papercut' },
    { id: 'totoy', name: 'Totoy' },
    { id: 'kiwen-suwi', name: 'Kiwen' },
    { id: 'rhosgfx', name: 'Pixel' },
];
export function pieceUrl(set, key) {
    const id = PIECE_SETS.some((s) => s.id === set) ? set : 'cburnett';
    return `${import.meta.env.BASE_URL}pieces/${id}/${key}.svg`;
}
