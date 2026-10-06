// Profil administrateur du Carnet Expo CMR : droits par profil et indicateurs ajoutés, vérifiés dans Chromium.
// Lancement : node _tests/admin.test.mjs  (depuis la racine du dépôt)
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), SC = process.argv[2] || os.tmpdir();
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json' };
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(new URL(q.url,'http://x').pathname)); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f,'index.html'); if (!fs.existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(r); }).listen(0);
const B = `http://127.0.0.1:${srv.address().port}`;
const br = await chromium.launch(); const errs = []; let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'ÉCHEC ') + m); if (!c) fails++; };
const ctx = await br.newContext({ viewport: { width: 1360, height: 920 } });
await ctx.addInitScript(() => { if (!sessionStorage.getItem('vbs-session')) sessionStorage.setItem('vbs-session', JSON.stringify({ token:null, role:'admin', name:'Cdt S. Durand', matricule:'ADM-0001', offline:true })); ['agent','cos','commandement','sssm','habillement','admin'].forEach(r => localStorage.setItem('vbs-tour-'+r,'1')); });
const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
const wait = (t=500) => pg.waitForTimeout(t);
await pg.goto(B + '/cmr-pompier/espace.html'); await wait(900);
ok((await pg.locator('#page-title').innerText()) === "Droits d'accès", 'Admin · arrive sur « Droits d\'accès »');
const adb = await pg.evaluate(() => { const d = VBSApp.getDb(); return { it: d.interventions.length, p: d.participations.length, u: d.users.length }; });
ok(adb.it === 0 && adb.p === 0 && adb.u > 0, `Admin · aucune donnée d'intervention ni d'exposition chargée (${adb.it}/${adb.p}, ${adb.u} utilisateurs)`);
await pg.screenshot({ path: SC + '/adm-droits.png' });
// Réglages
await pg.click('label:has(input[data-page="cos|export"]) .sw'); await wait();
await pg.click('label:has(input[data-perm="cos|rapport_rediger"]) .sw'); await wait();
await pg.click('label:has(input[data-perm="commandement|relance"]) .sw'); await wait();
ok(await pg.evaluate(() => { const c = VBSApp.getDb().config; return c.pages.cos.export === false && c.actions.cos.rapport_rediger === false && c.actions.commandement.relance === false; }), 'Admin · trois réglages enregistrés');
ok(await pg.locator('input[data-page="cos|tableau-de-bord"]').isDisabled(), 'Admin · tableau de bord non masquable');
await pg.goto(B + '/cmr-pompier/espace.html#indicateurs'); await wait(700);
for (const id of ['k_retard', 'k_decon', 'g_types', 'g_zones']) { await pg.click(`[data-add="${id}"]`); await wait(350); }
await pg.click('[data-role="commandement"]'); await wait(200);
ok(!(await pg.locator('[data-add="k_decon"]').count()), 'Admin · indicateur d\'exposition non proposé au commandement');
for (const id of ['k_retard', 'g_statuts']) { await pg.click(`[data-add="${id}"]`); await wait(350); }
await pg.click('[data-role="cos"]'); await wait(200);
await pg.click('[data-down="0"]'); await wait(350);
ok(await pg.evaluate(() => JSON.stringify(VBSApp.getDb().config.widgets.cos) === JSON.stringify(['k_decon','k_retard','g_types','g_zones'])), 'Admin · ajout et ordre des indicateurs CA/COS');
ok(await pg.locator('.adm-pv .pv .w-added .kpi').count() === 2 && await pg.locator('.adm-pv .pv .wbars').count() === 2, 'Admin · aperçu en direct du tableau de bord CA/COS');
ok((await pg.locator('.adm-pv .pv-side ul').innerText()).indexOf('Export') === -1 && (await pg.locator('.adm-pv .pv-hid').innerText()).includes('Export'), 'Admin · aperçu : page masquée signalée');
ok((await pg.locator('.adm-pv .pv-denied').innerText()).includes('rédiger'), 'Admin · aperçu : action retirée signalée');
ok(await pg.evaluate(() => VBSApp.getDb().interventions.length === 0), "Admin · l'aperçu n'a chargé aucune donnée réelle");
await pg.screenshot({ path: SC + '/adm-indic.png' });
// Aperçu CA/COS
await pg.screenshot({ path: SC + '/adm-indic-pv.png', fullPage: true });
await pg.goto(B + '/cmr-pompier/espace.html#droits'); await wait(600);
await pg.click('[data-pv="commandement"]'); await wait(300);
ok(await pg.locator('dialog .pv[data-pv-role="commandement"]').count() === 1, 'Admin · aperçu du commandement en fenêtre');
await pg.screenshot({ path: SC + '/adm-droits-pv.png' });
await pg.keyboard.press('Escape'); await wait(200);
await pg.goto(B + '/cmr-pompier/espace.html#indicateurs'); await wait(600);
await pg.click('[data-preview="cos"]'); await wait(1000);
ok((await pg.locator('#demo-banner').innerText()).includes('Aperçu administrateur'), 'CA/COS · bandeau d\'aperçu');
const navTxt = await pg.locator('#nav').innerText();
ok(!navTxt.includes('Export') && navTxt.includes('Rapports'), 'CA/COS · page Export masquée');
ok(await pg.locator('.w-added .kpi').count() === 2 && await pg.locator('.w-added .wbars').count() === 2, 'CA/COS · 2 indicateurs + 2 graphiques ajoutés au tableau de bord');
await pg.screenshot({ path: SC + '/adm-cos-dash.png', fullPage: true });
await pg.goto(B + '/cmr-pompier/espace.html#rapports'); await wait(700);
ok(!(await pg.locator('#cisu-in, #new-op, a[href="#rapport/nouveau"]').count()), 'CA/COS · plus de création de rapport');
const firstTodo = await pg.locator('.rep-list a[href^="#rapport/"]').first().getAttribute('href');
await pg.goto(B + '/cmr-pompier/espace.html' + firstTodo); await wait(700);
ok(await pg.evaluate(() => !document.getElementById('ed-save') || document.getElementById('ed-save').disabled), 'CA/COS · rapport en lecture seule');
await pg.goto(B + '/cmr-pompier/espace.html#export'); await wait(500);
ok((await pg.locator('#page-title').innerText()) !== 'Export', 'CA/COS · adresse #export directe refusée');
await pg.goto(B + '/cmr-pompier/espace.html#droits'); await wait(500);
ok((await pg.locator('#page-title').innerText()) !== "Droits d'accès", 'CA/COS · pages administrateur inaccessibles');
// Retour admin puis aperçu commandement
await pg.goto(B + '/cmr-pompier/espace.html'); await wait(700);
await pg.click('#back-admin'); await wait(900);
ok((await pg.locator('#user-role').innerText()).startsWith('Administrateur') && (await pg.locator('#page-title').innerText()) === 'Tableaux de bord', 'Retour à l\'administration, sur la page quittée');
await pg.goto(B + '/cmr-pompier/espace.html#droits'); await wait(600);
await pg.click('[data-preview="commandement"]'); await wait(1000);
ok(await pg.locator('.w-added .kpi').count() === 1 && await pg.locator('.w-added .wbars').count() === 1, 'Commandement · indicateurs ajoutés');
await pg.goto(B + '/cmr-pompier/espace.html#gestion'); await wait(700);
ok(!(await pg.locator('[data-remind]').count()), 'Commandement · relance retirée');
await pg.goto(B + '/cmr-pompier/espace.html#tableau-de-bord'); await wait(700);
await pg.screenshot({ path: SC + '/adm-cmd-dash.png', fullPage: true });
// Profil non touché : SSSM garde tout
await pg.evaluate(() => { VBS.offlinePreview({ role: 'sssm', matricule: 'MED-0003', name: 'Dr C. Roche' }); }); await pg.goto(B + '/cmr-pompier/espace.html#rapports'); await pg.reload(); await wait(900);
ok(await pg.locator('[data-import]').count() > 0, 'SSSM · droits d\'origine conservés');
console.log(errs.length ? 'ERREURS JS ' + errs.join(' / ') : 'OK   aucune erreur JS');
console.log(fails ? fails + ' échec(s)' : 'Tout est OK');
await br.close(); srv.close();
