import type { Opening } from '../../lib/openings/types';
import { ruyLopez, italian } from './e4-white';
import { queensGambit, london, catalan, english } from './d4-white';
import { najdorf, dragon, french, caroKann } from './e4-black';
import { kingsIndian, nimzoIndian, grunfeld, slav } from './d4-black';

export const OPENINGS: Opening[] = [
  ruyLopez,
  italian,
  queensGambit,
  london,
  catalan,
  english,
  najdorf,
  dragon,
  french,
  caroKann,
  kingsIndian,
  nimzoIndian,
  grunfeld,
  slav,
];
