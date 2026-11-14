/* Geometria da marca Quarks — fonte única.
   Medida diretamente da arte de referência (557×412 px): as coordenadas estão
   nesse sistema, e todos os traços são linhas de centro com espessura STROKE.
   Os quatro arcos externos são concêntricos (centro ≈ 280,191). */

export const VIEWBOX = '10 25 540 363';
export const STROKE = 17;      // letras
export const STROKE_ARC = 14.5; // arcos (mais finos na arte original)

export const ARCS = [
  'M143 109A159.9 159.9 0 0 1 414 109',   // externo superior
  'M195 113A111.2 111.2 0 0 1 365 113',   // médio superior
  'M252 115Q280 98 308 119',              // interno superior
  'M173 248A120.2 120.2 0 0 0 387 248',   // interno inferior
  'M142 281A165.1 165.1 0 0 0 418 281',   // externo inferior
];

export const LETTERS = [
  'M57 144a37.3 37.3 0 1 1 0 74.6a37.3 37.3 0 1 1 0-74.6M69 193L105.5 233', // Q
  'M134.3 143.5V185a32.2 32.2 0 0 0 64.4 0V143.5',                         // U
  'M247 219L279 151Q283 145 291 145H309A23.5 23.5 0 0 1 309 192H290M309 192L324 219', // ʌR
  'M385.5 144V218M459 141L393 190.5M408 180L441 219',                          // K
  'M536 157C527 145 515 143.5 508 143.5C493 143.5 481 150 481 162C481 177 498 178 512 180C527 182 540 186 540 199C540 212 527 218 509 218C494 218 485 213 480 206', // S
];

/* haste do R: traço mais fino, como na arte original */
export const THIN = [{ d: 'M285 150V206', w: 10 }];

export const DOTS = [
  [280, 54.5, 6.6], [94.3, 109.3, 9.4], [515.3, 108.3, 7.2], [49.3, 260, 7.3],
  [430.7, 253.3, 9.8], [476, 260, 7.3], [280, 335, 7.2], [280, 378.3, 7.6],
];

/* núcleo: cabeça + duas "orelhas" */
export const NUCLEUS = [[280, 265, 21.3], [256.7, 256.7, 10.5], [303.3, 256.7, 10.5]];
export const NUCLEUS_TOP = 243.7;

const circles = (list) => list.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');

/* SVG estático completo (para <symbol>, favicon, etc.) */
export function markInner(color = 'currentColor') {
  return `<g fill="none" stroke="${color}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">`
    + ARCS.map((d) => `<path d="${d}" stroke-width="${STROKE_ARC}"/>`).join('')
    + LETTERS.map((d) => `<path d="${d}"/>`).join('')
    + THIN.map((t) => `<path d="${t.d}" stroke-width="${t.w}"/>`).join('')
    + `</g><g fill="${color}">${circles(DOTS)}${circles(NUCLEUS)}</g>`;
}

export const parts = { circles };
