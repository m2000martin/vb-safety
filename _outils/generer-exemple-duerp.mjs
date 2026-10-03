// Régénère l'exemple de dossier DUERP (ressources/exemple-dossier-duerp-risque-chimique.pdf) à partir de l'exemple fictif de l'outil.
// Serveur local sur le port 8765 requis (npx http-server -p 8765), puis : node _outils/generer-exemple-duerp.mjs <dossier de sortie>
// Aperçus : pdftoppm -r 110 -png <pdf> page, puis conversion en WebP dans static/duerp-exemple/.
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SP = process.argv[2];
const b = await chromium.launch(); const pg = await b.newPage({ locale: 'fr-FR', timezoneId: 'Europe/Paris' });
await pg.goto('http://127.0.0.1:8765/cmr-industrie/duerp.html#exemple'); await pg.waitForTimeout(1200);
// Données de l'exemple : entreprise fictive, actions avec responsables et échéances
await pg.evaluate(() => {
  const resp = ['Responsable HSE', 'Chef d\'atelier', 'Direction', 'Responsable maintenance'];
  S.site = 'Atelier de démonstration (exemple fictif)';
  planItems(compute()).forEach((it, i) => { S.actions[it.k] = { resp: resp[i % resp.length], date: '2027-0' + (1 + (i % 6)) + '-15', statut: i % 4 === 0 ? 'fait' : i % 4 === 1 ? 'cours' : '' }; });
  localStorage.setItem('vbs-eval-demo', JSON.stringify(S));
});
await pg.addInitScript(() => { window.print = () => { window.__printed = true; throw new Error('arrêt pour capture'); }; });
await pg.goto('http://127.0.0.1:8765/cmr-industrie/expert.html#imprimer-all'); await pg.waitForFunction(() => window.__printed, null, { timeout: 15000 });
await pg.evaluate(() => {
  document.querySelectorAll('a').forEach(a => { if (/Revenir/.test(a.textContent)) a.remove(); });
  // Champs de saisie remplacés par leur valeur, comme sur un document imprimé
  document.querySelectorAll('input, select').forEach(el => {
    let v = el.tagName === 'SELECT' ? el.options[el.selectedIndex].text : el.value;
    if (el.type === 'date' && v) { const [y, m, d] = v.split('-'); v = d + '/' + m + '/' + y; }
    if (el.type === 'checkbox' || el.type === 'hidden') return;
    const sp = document.createElement('span'); sp.textContent = v || '—'; sp.style.fontSize = '12px'; el.replaceWith(sp);
  });
});
await pg.emulateMedia({ media: 'print' });
await pg.pdf({ path: SP + '/exemple-duerp.pdf', format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '14mm', left: '12mm', right: '12mm' }, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#666">Exemple fictif · VB Safety · page <span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
await b.close();
