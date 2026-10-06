// Version anglaise du Carnet Expo CMR : couverture des traductions et assistant en anglais, vérifiés dans Chromium.
// Lancement : node _tests/i18n.test.mjs  (depuis la racine du dépôt)
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
const PROFILES = { agent: ['SP-0142', 'Sap. J. Leroy'], cos: ['CA-0107', 'Adj. T. Bernard'], commandement: ['CI-0021', 'Cne. M. Garnier'], sssm: ['MED-0003', 'Dr C. Roche'], habillement: ['HAB-0005', 'Adc. L. Perrin'], admin: ['ADM-0001', 'Cdt S. Durand'] };

async function open(role, lang) {
  const ctx = await br.newContext({ viewport: { width: 1360, height: 920 } });
  await ctx.addInitScript(([r, m, n, l]) => {
    localStorage.setItem('vbs-lang', l); localStorage.setItem('vbs-tour-' + r, '1');
    if (!sessionStorage.getItem('vbs-session')) sessionStorage.setItem('vbs-session', JSON.stringify({ token: null, role: r, name: n, matricule: m, offline: true }));
  }, [role, ...PROFILES[role], lang]);
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(role + ' : ' + e.message)); pg.on('dialog', d => d.dismiss());
  await pg.goto(B + '/cmr-pompier/espace.html'); await wait(900);
  return { ctx, pg };
}

// 1. Connexion en anglais, bascule FR/EN
{
  const ctx = await br.newContext(); const pg = await ctx.newPage();
  await pg.goto(B + '/cmr-pompier/connexion.html?lang=en'); await wait(400);
  const body = await pg.locator('body').innerText();
  ok(/Sign in|Log in/i.test(body) && (await pg.locator('[data-lang-toggle]').first().innerText()).trim() === 'FR', 'Connexion en anglais, bouton « FR » pour revenir');
  await pg.locator('[data-lang-toggle]').first().click(); await wait(600);
  ok((await pg.locator('[data-lang-toggle]').first().innerText()).trim() === 'EN' && /Connexion|connecter/i.test(await pg.locator('body').innerText()), 'Retour en français par le bouton');
  await ctx.close();
}

// 1 bis. Pages publiques anglaises : liens, fenêtre de contact traduite, bascule vers le français
for (const [p, fr] of [['/cmr-pompier/en/', '/cmr-pompier/'], ['/cmr-pompier/en/ppe-module.html', '/cmr-pompier/module-epi.html'], ['/cmr-pompier/en/firefighter-health.html', '/cmr-pompier/sante-sapeurs-pompiers.html']]) {
  const ctx = await br.newContext(); const pg = await ctx.newPage(); const bad = [];
  pg.on('response', r => { if (r.status() >= 400 && !/\.webp$/.test(r.url())) bad.push(r.url()); }); pg.on('pageerror', e => errs.push(p + ' : ' + e.message));
  await pg.goto(B + p); await wait(300);
  await pg.locator('[data-demande]').first().click(); await wait(250);
  const modal = await pg.locator('.req-card').innerText();
  const miss = await pg.evaluate(() => VBSi18n.misses);
  ok(!Object.keys(miss).length && /Full name/.test(modal) && !bad.length, `${p} · page et fenêtre de contact en anglais` + (bad.length ? ' — 404 : ' + bad.join(' ') : ''));
  ok(new URL(await pg.locator('a.lang-link').getAttribute('href'), B + p).pathname === fr, `${p} · bouton FR vers ${fr}`);
  await ctx.close();
}

// 2. Tous les écrans de chaque profil, sans texte français restant
for (const role of Object.keys(PROFILES)) {
  const { ctx, pg } = await open(role, 'en');
  const ids = await pg.evaluate(() => VBSApp.menu.map(m => m.id));
  for (const id of ids) { await pg.evaluate(h => { location.hash = h; }, id); await wait(400); }
  const miss = await pg.evaluate(() => VBSi18n.misses);
  ok(Object.keys(miss).length === 0, `${role} · ${ids.length} écrans en anglais` + (Object.keys(miss).length ? ' — manquants : ' + Object.keys(miss).slice(0, 5).join(' | ') : ''));
  await ctx.close();
}

// 3. Assistant : phrases en anglais (analyseur local, mode démo)
const ASK = {
  cos: [['Open my latest report to complete', /^#rapport\//], ['My overdue reports', /overdue/i], ['New report', /^#rapport\/nouveau$/], ['What is the exclusion zone?', /Exclusion zone|exclusion zone/i], ['Open my history', /^#dossier$/]],
  commandement: [['Overdue reports', /overdue/i], ['Who approves the reports?', /SSSM/], ['Open the overall management view', /^#gestion$/]],
  sssm: [['Open the latest report to review', /^#rapport\//], ['Reports sent this week', /sent/i], ['Individual follow-up', /^#suivi$/]],
  agent: [['Open my history', /^#dossier$/], ['Export my data', /^#export$/], ['How do I decontaminate after a fire?', /decontamination/i]],
  habillement: [['Fire kit', /^#tenues$/], ['Kit changes', /^#changements$/]],
  admin: [['Access rights', /^#droits$/], ['Profile dashboards', /^#indicateurs$/]]
};
for (const role of Object.keys(ASK)) {
  const { ctx, pg } = await open(role, 'en');
  await pg.evaluate(() => VBSAssistant.open()); await wait(200);
  const chip = (await pg.locator('.asst-chip').first().innerText()).trim();
  ok(!/[éèàç]|Ouvre|Rapports/.test(chip), `${role} · suggestions de l'assistant en anglais (« ${chip} »)`);
  for (const [q, want] of ASK[role]) {
    await pg.evaluate(() => { location.hash = 'tableau-de-bord'; }); await wait(250);
    await pg.evaluate(q => VBSAssistant.ask(q), q); await wait(500);
    const hash = await pg.evaluate(() => location.hash);
    const reply = (await pg.locator('.asst-msg.bot').last().innerText()).trim();
    const hit = want.test(hash) || want.test(reply);
    ok(hit && !/didn't understand/.test(reply) && !/J'ouvre|Aucun|rapport/.test(reply), `${role} · « ${q} » → ${hash} · ${reply.slice(0, 70)}`);
  }
  await ctx.close();
}

// 4. En français, rien n'est traduit
{
  const { ctx, pg } = await open('cos', 'fr');
  ok((await pg.locator('#page-title').innerText()) === 'Tableau de bord' && (await pg.locator('[data-lang-toggle]').first().innerText()).trim() === 'EN', 'Français par défaut, bouton « EN »');
  await ctx.close();
}

ok(errs.length === 0, 'Aucune erreur JavaScript' + (errs.length ? ' : ' + errs.slice(0, 3).join(' | ') : ''));
await br.close(); srv.close();
console.log(fails ? `\n${fails} échec(s)` : '\nTout est bon.');
process.exit(fails ? 1 : 0);
