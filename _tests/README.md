# Tests automatiques

Ce dossier n'est pas publié sur le site (GitHub Pages ignore les dossiers qui commencent par `_`).

- `preuve-core.test.mjs` : une vérification par règle juridique codée dans le dossier de preuve CMR (régimes, treize mesures, liste nominative et ses trois vues, 45 obligations, absence de donnée médicale). Lancement : `node --test _tests/preuve-core.test.mjs`
- `smoke.mjs` : contrôle de non-régression. Ouvre toutes les pages du site dans Chromium, parcourt l'outil DUERP, le mode expert, le Carnet sapeurs-pompiers et le dossier de preuve. Lancement : `node _tests/smoke.mjs` (Playwright requis).

## Pages de l'outil CMR

`cmr-industrie/outil/<écran>/index.html` sont des copies de `cmr-industrie/outil/index.html` (une adresse par écran). Après toute modification de cette page : `node _outils/generer-routes.mjs`. Le test `smoke.mjs` vérifie que les copies sont à jour.
