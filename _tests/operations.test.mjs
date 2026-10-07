// Grandes opérations, relevés réglementaires, formations et lavage par lot, vérifiés dans Chromium (version française).
// Lancement : node _tests/operations.test.mjs  (depuis la racine du dépôt)
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); if (!fs.existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const B = `http://127.0.0.1:${srv.address().port}`;
const br = await chromium.launch(); const errs = []; let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'ÉCHEC ') + m); if (!c) fails++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const P = { agent: ['SP-0142', 'Sap. J. Leroy'], cos: ['CA-0107', 'Adj. T. Bernard'], commandement: ['CI-0021', 'Cne. M. Garnier'], sssm: ['MED-0003', 'Dr C. Roche'], habillement: ['HAB-0005', 'Adc. L. Perrin'] };
// Une seule session navigateur pour partager le jeu de démonstration entre les profils
const ctx = await br.newContext({ viewport: { width: 1360, height: 920 } });
await ctx.addInitScript(() => { window.print = () => { window.__printed = (document.getElementById('print-area') || {}).innerText || ''; }; ['agent', 'cos', 'commandement', 'sssm', 'habillement'].forEach(r => localStorage.setItem('vbs-tour-' + r, '1')); });
const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.accept());
async function as(role, hash) {
  await pg.goto(B + '/cmr-pompier/connexion.html'); await pg.evaluate(([r, m, n]) => sessionStorage.setItem('vbs-session', JSON.stringify({ token: null, role: r, name: n, matricule: m, offline: true })), [role, ...P[role]]);
  await pg.goto(B + '/cmr-pompier/espace.html#' + (hash || 'tableau-de-bord')); await wait(800);
}
// 1. Commandement : grande opération, relève ajoutée, aucune donnée d'exposition
await as('commandement');
ok(await pg.locator('.op-call').count() === 1, 'Commandement · grande opération récente sur le tableau de bord');
await pg.click('.op-call a'); await wait(500);
const bars0 = await pg.locator('.g-bar').count();
ok(bars0 === 10 && await pg.locator('.g-rel').count() === 3, 'Commandement · chronologie : 10 engagements sur 3 relèves');
ok(await pg.locator('text=Personnels exposés').count() === 0 && await pg.locator('th:has-text("Zone")').count() === 0, "Commandement · aucune donnée d'exposition individuelle");
await pg.click('#add-releve'); await wait(300);
await pg.selectOption('#rl-ca', { label: 'Adjudant T. Bernard' }); await pg.fill('#rl-eng', 'CCF 4');
await pg.click('dialog .btn-primary'); await wait(600);
ok(await pg.locator('.g-bar').count() === bars0 + 1 && await pg.locator('.g-rel').count() === 4, 'Commandement · relève 4 ajoutée');
// 2. CA : retrouve le rapport de la relève, déclare une formation
await as('cos', 'rapports');
ok(await pg.locator('.rep-list li:has-text("R4-CCF4")').count() === 1, 'CA · le rapport de la nouvelle relève est à faire');
await pg.click('#act-new'); await wait(300);
await pg.selectOption('#ac-type', 'caisson'); await pg.fill('#ac-titre', 'FMPA caisson test');
await pg.locator('[name=ac-ag]').nth(0).check(); await pg.locator('[name=ac-ag]').nth(1).check();
await pg.click('dialog .btn-primary'); await wait(500);
ok(await pg.locator('text=FMPA caisson test').count() === 1, 'CA · formation déclarée');
// 3. SSSM : personnels exposés, relevé annuel visé, attestation
await as('sssm', 'operations');
await pg.click('.op-card'); await wait(500);
const rows = await pg.locator('section:has(h3:has-text("Personnels exposés")) tbody tr').count();
ok(rows >= 20 && await pg.locator('.badge:has-text("Renfort")').count() >= 1, 'SSSM · liste des personnels exposés, renforts signalés (' + rows + ')');
await pg.evaluate(() => { location.hash = 'releves'; }); await wait(500);
const before = await pg.locator('.badge:has-text("Visé le")').count();
await pg.locator('[data-rctl]').first().click(); await wait(300);
ok(await pg.locator('dialog .rv-preview:has-text("Relevé annuel des activités potentiellement exposantes")').count() === 1, 'SSSM · aperçu du relevé annuel');
await pg.fill('#rv-obs', 'Suivi post-exposition proposé.'); await pg.click('dialog .btn-primary'); await wait(500);
ok(await pg.locator('.badge:has-text("Visé le")').count() === before + 1, 'SSSM · relevé visé');
await pg.locator('[data-rpdf]').first().click(); await wait(300);
const printed = await pg.evaluate(() => window.__printed);
ok(/Visa du médecin/.test(printed) && /Suivi post-exposition proposé/.test(printed), 'SSSM · PDF du relevé avec le visa et les observations');
// Téléchargement en haut de page : périmètre et période
const sumTxt = async () => (await pg.locator('.dl-sum span').first().innerText());
const nAll = parseInt(await sumTxt(), 10);
await pg.click('[data-dl="scope|groupement"]'); await wait(300); await pg.selectOption('#dl-grp', 'Sud'); await wait(300);
const nSud = parseInt(await sumTxt(), 10);
await pg.click('[data-dl="scope|caserne"]'); await wait(300);
const nCis = parseInt(await sumTxt(), 10);
ok(nAll > nSud && nSud > 0 && nCis > 0 && nCis < nAll, 'SSSM · périmètre tout le monde / groupement / caserne (' + nAll + ' / ' + nSud + ' / ' + nCis + ')');
await pg.click('[data-dl="per|perso"]'); await wait(300); await pg.fill('#dl-from', new Date().getFullYear() + '-07-01'); await pg.locator('#dl-from').dispatchEvent('change'); await wait(300);
await pg.click('#dl-pdf'); await wait(300);
ok(/Relevé des activités potentiellement exposantes/.test(await pg.evaluate(() => window.__printed)), 'SSSM · relevés d\'une caserne sur une période personnalisée (PDF)');
await pg.click('[data-dl="scope|tous"]'); await pg.click('[data-dl="per|annee"]'); await wait(300);
await pg.click('#at-go'); await wait(300);
ok(/Attestation d'exposition/.test(await pg.evaluate(() => window.__printed)), "SSSM · attestation d'exposition générée");
// 4. Agent : formations dans son dossier, relevé annuel téléchargeable
await as('agent', 'dossier');
ok(await pg.locator('h3:has-text("Formations et entretien")').count() === 1, 'Agent · formations et entretien dans son dossier');
await pg.evaluate(() => { location.hash = 'export'; }); await wait(300); await pg.locator('[data-exp="releve"]').click(); await wait(300);
ok(/Relevé annuel/.test(await pg.evaluate(() => window.__printed)), 'Agent · son relevé annuel en PDF');
// 5. Référent EPI : lavage par lot et retour
await as('habillement');
const nOut = await pg.evaluate(() => VBSApp.getDb().tenues.filter(t => t.statut === 'contaminee' && !t.agent).length);
await pg.click('#lv-out'); await wait(300); await pg.click('dialog .btn-primary'); await wait(600);
ok(/Bon d'envoi au lavage/.test(await pg.evaluate(() => window.__printed)) && await pg.evaluate(() => VBSApp.getDb().tenues.filter(t => t.statut === 'contaminee' && !t.agent).length) === 0, 'EPI · lot de ' + nOut + ' tenues envoyé au lavage, bon imprimé');
const nLav = await pg.evaluate(() => VBSApp.getDb().tenues.filter(t => t.statut === 'au_lavage').length);
await pg.click('#lv-in'); await wait(300); await pg.click('dialog .btn-primary'); await wait(600);
ok(await pg.evaluate(() => VBSApp.getDb().tenues.filter(t => t.statut === 'au_lavage').length) === 0 && nLav > 0, 'EPI · retour du prestataire : ' + nLav + ' tenues en stock');
await pg.evaluate(() => { location.hash = 'changements'; }); await wait(300);
ok(await pg.locator('.badge:has-text("Au lavage")').count() >= 1, 'EPI · lot visible dans l\'historique');
ok(errs.length === 0, 'Aucune erreur JavaScript' + (errs.length ? ' : ' + errs.slice(0, 3).join(' | ') : ''));
await br.close(); srv.close();
console.log(fails ? `\n${fails} échec(s)` : '\nTout est bon.');
process.exit(fails ? 1 : 0);
