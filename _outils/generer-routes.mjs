// Génère une page par écran de l'outil CMR : /cmr-industrie/outil/<écran>/index.html
// Chaque page est une copie exacte de /cmr-industrie/outil/index.html (chemins absolus) :
// l'adresse affichée est propre, le rechargement et le bouton « précédent » fonctionnent sur GitHub Pages.
// À relancer après toute modification de cmr-industrie/outil/index.html : node _outils/generer-routes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const C = require(path.join(ROOT, 'cmr-industrie/assets/js/preuve-core.js'));
const OUTIL = path.join(ROOT, 'cmr-industrie/outil');
export const ROUTES = ['agents', 'revisions', 'substitution', 'salaries', 'liste', 'sommaire', 'accueil'].concat(C.OBLIGATIONS.map(o => o.id.toLowerCase()));
const src = fs.readFileSync(path.join(OUTIL, 'index.html'), 'utf8');
if (process.argv[1] && process.argv[1].endsWith('generer-routes.mjs')) {
  for (const r of ROUTES) { fs.mkdirSync(path.join(OUTIL, r), { recursive: true }); fs.writeFileSync(path.join(OUTIL, r, 'index.html'), src); }
  console.log(ROUTES.length + ' pages générées dans cmr-industrie/outil/');
}
