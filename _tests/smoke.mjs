// Contrôle de non-régression : ouvre chaque page du site dans Chromium et vérifie
// qu'elle se charge sans erreur JavaScript, puis parcourt les outils existants.
// Lancement : node _tests/smoke.mjs  (depuis la racine du dépôt)
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.xlsx': 'application/octet-stream', '.txt': 'text/plain', '.xml': 'application/xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(ROOT, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const BASE = `http://127.0.0.1:${server.address().port}`;

const pages = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8').match(/<loc>[^<]+<\/loc>/g).map(l => l.replace(/<\/?loc>/g, '').replace('https://vb-safety.com', ''));
['/cmr-industrie/duerp.html', '/cmr-industrie/expert.html', '/cmr-industrie/dossier.html', '/cmr-industrie/connexion.html', '/cmr-pompier/connexion.html', '/cmr-pompier/espace.html', '/404.html'].concat(process.argv.slice(2)).forEach(p => { if (!pages.includes(p)) pages.push(p); });

const browser = await chromium.launch();
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'ÉCHEC ') + m); if (!c) fails++; };
for (const p of pages) {
  const ctx = await browser.newContext(); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|api\.vb-safety|ERR_|Content Security Policy.*api/.test(m.text())) errs.push(m.text()); });
  const r = await pg.goto(BASE + p, { waitUntil: 'load' }).catch(e => null);
  await pg.waitForTimeout(300);
  ok(r && r.status() === 200 && !errs.length, `${p} ${r ? r.status() : 'n/a'}${errs.length ? ' · ' + errs.join(' | ') : ''}`);
  await ctx.close();
}

// Parcours de l'outil DUERP : exemple rempli, puis chaque étape
{
  const ctx = await browser.newContext(); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(BASE + '/cmr-industrie/duerp.html#exemple'); await pg.waitForTimeout(800);
  for (const s of ['produits', 'prio', 'actions', 'salaries', 'dossier']) {
    await pg.evaluate(id => { location.hash = id; }, s); await pg.waitForTimeout(200);
    ok(await pg.locator('#q-title').count() > 0, `DUERP exemple · étape ${s}`);
    if (s === 'salaries') ok((await pg.locator('.sal-list li').count()) >= 1, 'DUERP exemple · postes CMR listés');
  }
  // Ajout d'un produit en vrai (hors exemple)
  await pg.evaluate(() => sessionStorage.removeItem('vbs-du-demo')); await pg.goto('about:blank');
  await pg.goto(BASE + '/cmr-industrie/duerp.html#entreprise'); await pg.waitForTimeout(400);
  await pg.fill('[data-s="site"]', 'Atelier test'); await pg.click('[data-tile="effectif"][data-v="11-49"]');
  await pg.click('#q-next'); await pg.click('[data-act="add"]');
  await pg.fill('[data-f="name"]', 'Solvant test'); await pg.click('#q-next');
  await pg.fill('[data-f="htext"]', 'H350 H336'); await pg.click('#q-next');
  await pg.click('#q-next'); await pg.click('[data-tile="etat"][data-v="liquide"]'); await pg.click('#q-next');
  await pg.click('[data-tile="vol"][data-v="2"]'); await pg.click('#q-next');
  await pg.fill('[data-f="qte"]', '100'); await pg.click('[data-tile="unite"][data-v="L"]'); await pg.click('#q-next');
  await pg.click('[data-tile="freq"][data-v="3"]'); await pg.click('#q-next');
  await pg.click('[data-tile="proc"][data-v="3"]'); await pg.click('#q-next');
  await pg.click('[data-tile="prot"][data-v="4"]'); await pg.click('#q-next');
  await pg.fill('[data-f="poste"]', 'Dégraissage'); await pg.fill('[data-f="nb"]', '2'); await pg.click('#q-next');
  await pg.click('#q-next');
  const saved = await pg.evaluate(() => JSON.parse(localStorage.getItem('vbs-eval-v1')));
  ok(saved && saved.products.length === 1 && saved.products[0].h.includes('H350'), 'DUERP · produit saisi et enregistré dans le navigateur');
  ok(!errs.length, 'DUERP · aucune erreur JavaScript' + (errs.length ? ' · ' + errs.join(' | ') : ''));
  // Le mode expert lit les mêmes données
  await pg.goto(BASE + '/cmr-industrie/expert.html'); await pg.waitForTimeout(800);
  ok(await pg.locator('text=Solvant test').count() > 0, 'Mode expert · relit l\'évaluation');
  await ctx.close();
}

// Carnet sapeurs-pompiers : page de connexion et module EPI
{
  const ctx = await browser.newContext(); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(BASE + '/cmr-pompier/connexion.html'); await pg.waitForTimeout(400);
  ok(await pg.locator('form, button').count() > 0 && !errs.length, 'Carnet · page de connexion' + (errs.length ? ' · ' + errs.join(' | ') : ''));
  await ctx.close();
}

// Dossier de preuve CMR (version 1) : parcours complet avec des données réelles, puis l'exemple fictif
{
  const ctx = await browser.newContext(); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; window.__lastDoc = document.getElementById('pv-print') && document.getElementById('pv-print').innerText; }; });
  await pg.goto(BASE + '/cmr-industrie/duerp.html');
  await pg.evaluate(() => { sessionStorage.clear(); localStorage.clear(); localStorage.setItem('vbs-eval-v1', JSON.stringify({ site: 'Atelier réel', effectif: '11-49', next: 3, actions: {}, products: [
    { id: 1, type: 'produit', name: 'Dégraissant H350', h: ['H350', 'H336'], etat: 'liquide', vol: 2, qte: 100, unite: 'L', freq: 3, proc: 3, prot: 4, poste: 'Dégraissage', nb: 2 },
    { id: 2, type: 'procede', procede: 'bois', name: 'Poussières de bois', intensite: 3, freq: 2, proc: 3, prot: 2, poste: 'Menuiserie', nb: 1, etat: 'solide', pulv: 3 } ] })); });
  const evalBefore = await pg.evaluate(() => localStorage.getItem('vbs-eval-v1'));
  await pg.goto(BASE + '/cmr-industrie/dossier.html#agents'); await pg.waitForTimeout(600);
  ok(await pg.locator('.pv-reg.cmr').count() >= 2, 'Dossier · deux agents proposés au régime CMR');
  await pg.click('[data-a="confirm-all"]');
  await pg.click('a[href="#revisions"]'); await pg.click('[data-a="revision"]');
  await pg.click('a[href="#substitution"]');
  ok(await pg.locator('details.pv-card').count() === 2, 'Dossier · une fiche de substitution par agent CMR');
  await pg.click('a[href="#salaries"]');
  await pg.fill('#ns-nom', 'Martin'); await pg.fill('#ns-prenom', 'Léa'); await pg.fill('#ns-poste', 'Dégraissage'); await pg.click('[data-a="add-sal"]');
  await pg.click('[data-a="add-sug"]');
  await pg.fill('#ns-nom', 'Durand'); await pg.fill('#ns-prenom', 'Paul'); await pg.fill('#ns-poste', 'Menuiserie'); await pg.selectOption('#ns-contrat', 'interim'); await pg.click('[data-a="add-sal"]');
  await pg.click('[data-a="add-sug"]');
  await pg.click('a[href="#liste"]');
  await pg.fill('#vr-auteur', 'RH'); await pg.click('[data-a="freeze"]');
  await pg.click('[data-a="print"][data-doc="anonyme"]');
  const anon = await pg.evaluate(() => window.__lastDoc || '');
  ok(/Salarié 1/.test(anon) && !/MARTIN|Léa|DURAND|Paul/.test(anon), 'Dossier · version CSE imprimée sans aucun nom');
  await pg.click('[data-a="envoi"]');
  await pg.click('[data-a="envoi-agence"]');
  await pg.click('a[href="#sommaire"]');
  const st = await pg.evaluate(() => { const P = JSON.parse(localStorage.getItem('vbs-preuve-v1')); return { v: P.versions.length, rows: P.versions[0].rows.length, envois: P.envois.length, rev: P.revisions.length }; });
  ok(st.v === 1 && st.rows === 2 && st.envois === 2 && st.rev === 1, 'Dossier · version 1 (2 lignes), 2 envois et 1 révision enregistrés ' + JSON.stringify(st));
  const badges = await pg.locator('.pv-st.outil').count();
  ok(badges >= 8, 'Dossier · le sommaire reconnaît les pièces produites (' + badges + ')');
  await pg.click('[data-a="print"][data-doc="tout"]');
  const all = await pg.evaluate(() => window.__lastDoc || '');
  ok(/Sommaire du dossier CMR/.test(all) && /Registre des agents/.test(all) && !/conforme/i.test(all), 'Dossier · dossier complet imprimé, sans le mot « conforme »');
  ok(await pg.evaluate(() => localStorage.getItem('vbs-eval-v1')) === evalBefore, 'Dossier · l\'évaluation DUERP n\'est jamais modifiée par le dossier');
  await pg.goto(BASE + '/cmr-industrie/duerp.html#produits'); await pg.waitForTimeout(400);
  ok(await pg.locator('text=Dégraissant H350').count() > 0, 'DUERP · relit toujours la même évaluation après usage du dossier');
  await pg.goto(BASE + '/cmr-industrie/dossier.html#exemple'); await pg.waitForTimeout(800);
  ok(await pg.locator('.demo-note').count() === 1 && await pg.evaluate(() => JSON.parse(localStorage.getItem('vbs-preuve-v1')).salaries.length === 2), 'Dossier · l\'exemple fictif ne touche pas aux données réelles');
  ok(!errs.length, 'Dossier · aucune erreur JavaScript' + (errs.length ? ' · ' + errs.join(' | ') : ''));
  await ctx.close();
}

// Démo industrie : code faux refusé, VLN533 ouvre le dossier de preuve sur l'exemple
{
  const ctx = await browser.newContext(); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(BASE + '/cmr-industrie/'); await pg.click('.ih-cta a.btn-primary');
  ok(/connexion\.html$/.test(pg.url()), 'Démo · « Accéder à la démo » ouvre la page de connexion');
  await pg.fill('#code', 'ABC123'); await pg.click('#login-btn'); await pg.waitForTimeout(300);
  ok(/incorrect/.test(await pg.locator('#login-msg').textContent()) && /connexion\.html$/.test(pg.url()), 'Démo · un code faux est refusé');
  await pg.fill('#code', 'vln533'); await pg.click('#login-btn'); await pg.waitForURL(/dossier\.html#/); await pg.waitForTimeout(600);
  ok(await pg.locator('.demo-note').count() === 1 && /45 obligations/.test(await pg.locator('#q-title').textContent()), 'Démo · VLN533 ouvre l\'outil sur la liste des obligations, avec l\'exemple fictif');
  ok(await pg.evaluate(() => !localStorage.getItem('vbs-eval-v1')), 'Démo · aucune donnée réelle créée');
  await pg.goto(BASE + '/cmr-industrie/'); 
  ok(await pg.locator('.header-cta[href="/devis/"]').count() === 1 && await pg.locator('.ih-note').count() === 0, 'Portail · bouton « Demander un devis » en haut, petit texte retiré');
  ok(!errs.length, 'Démo · aucune erreur JavaScript' + (errs.length ? ' · ' + errs.join(' | ') : ''));
  await ctx.close();
}

// Outil : s'ouvre sur la liste des 45 obligations ; voir le détail, cocher « fait », « Faire avec VB Safety »
{
  const ctx = await browser.newContext(); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(BASE + '/cmr-industrie/dossier.html'); await pg.waitForTimeout(600);
  ok(await pg.locator('.ob-it').count() === 45, 'Obligations · l\'outil s\'ouvre sur les 45 obligations, même sans inventaire');
  await pg.click('[data-a="ob-open"][data-id="E1"]');
  ok(/5 juillet 2024/.test(await pg.locator('#ob-d-E1').textContent()), 'Obligations · le détail s\'affiche au clic');
  await pg.click('[data-a="ob-done"][data-id="D3"]');
  ok(await pg.evaluate(() => JSON.parse(localStorage.getItem('vbs-preuve-v1')).pieces.D3.ok === true), 'Obligations · « C\'est fait » est enregistré');
  await pg.click('[data-a="ob-faire"][data-id="B1"]'); await pg.waitForTimeout(200);
  ok(/Substitution/.test(await pg.locator('#q-title').textContent()), 'Obligations · « Faire avec VB Safety » ouvre l\'écran de l\'outil');
  await pg.goto(BASE + '/cmr-industrie/dossier.html#obligations'); await pg.waitForTimeout(400);
  await pg.click('[data-a="ob-faire"][data-id="C2"]'); await pg.waitForTimeout(300);
  ok(await pg.locator('#ob-d-C2 .ob-tool').count() === 1, 'Obligations · « Faire avec VB Safety » ouvre l\'outil sous l\'obligation (C2)');
  await pg.goto(BASE + '/devis/?besoin=' + encodeURIComponent('Obligation C2 · test')); await pg.waitForTimeout(300);
  ok(/C2/.test(await pg.inputValue('#dv-msg-t')) && await pg.inputValue('#dv-type') === 'Industrie', 'Devis · pré-rempli quand on vient de l\'outil');
  ok(!errs.length, 'Obligations · aucune erreur JavaScript' + (errs.length ? ' · ' + errs.join(' | ') : ''));
  await ctx.close();
}

// Outils sous les obligations : entreprise saisie une fois, registre rempli, justificatif et dépôt
{
  const ctx = await browser.newContext(); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { window.print = () => { window.__lastDoc = document.getElementById('pv-print').innerText; }; });
  await pg.goto(BASE + '/cmr-industrie/dossier.html'); await pg.waitForTimeout(500);
  await pg.fill('#ent-nom', 'Métallerie Test'); await pg.fill('#ent-siren', '999999998');
  await pg.click('[data-a="ob-open"][data-id="B8"]');
  await pg.fill('[data-fi="B8"][data-r="0"][data-c="1"]', 'Captage poste de soudage');
  await pg.click('[data-a="row-add"][data-id="B8"]');
  ok(await pg.locator('[data-fi="B8"][data-c="1"]').count() === 2, 'Outils · ajout d\'une ligne au registre');
  await pg.click('[data-a="print"][data-doc="fiche"][data-id="B8"]');
  const doc = await pg.evaluate(() => window.__lastDoc || '');
  ok(/Registre de vérification/.test(doc) && /Métallerie Test/.test(doc) && /999999998/.test(doc) && /Captage poste de soudage/.test(doc), 'Outils · justificatif téléchargé avec l\'entreprise et les lignes saisies');
  await pg.setInputFiles('[data-upload="B8"]', { name: 'rapport.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') });
  ok(/n'a pas été enregistré/.test(await pg.locator('.ob-tool').first().textContent()), 'Outils · dépôt de fichier affiché, sans enregistrement (version hébergée)');
  await pg.click('[data-a="ob-filter"][data-f="fait"]');
  ok(await pg.locator('.ob-it.st-outil [data-id="B8"]').count() > 0, 'Outils · B8 passe en « fait avec VB Safety »');
  ok(!errs.length, 'Outils · aucune erreur JavaScript' + (errs.length ? ' · ' + errs.join(' | ') : ''));
  await ctx.close();
}

await browser.close(); server.close();
console.log(fails ? `\n${fails} échec(s)` : '\nTout est OK');
process.exit(fails ? 1 : 0);
