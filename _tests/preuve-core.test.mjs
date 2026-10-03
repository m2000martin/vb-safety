// Tests automatiques des règles juridiques du dossier de preuve CMR.
// Lancement : node --test _tests/  (depuis la racine du dépôt)
// Une règle fausse dans un outil de conformité est le défaut le plus grave : chaque règle codée a son test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../cmr-industrie/assets/js/preuve-core.js');

const prod = (id, h, extra = {}) => ({ id, type: 'produit', name: 'Produit ' + id, h, poste: 'Atelier', freq: 3, ...extra });
const proc = (id, procede) => ({ id, type: 'procede', procede, name: 'Procédé ' + id, poste: 'Menuiserie', freq: 2 });

test('A1 · régime CMR pour les mentions H340, H350, H360 (catégories 1A et 1B)', () => {
  for (const h of ['H340', 'H350', 'H360']) assert.equal(C.regimeOf(prod(1, [h])), 'cmr', h);
});
test('A1 · les procédés listés par l\'arrêté du 26 octobre 2020 relèvent du régime CMR', () => {
  for (const p of ['bois', 'silice', 'hap', 'diesel', 'huiles', 'autre']) assert.equal(C.regimeOf(proc(1, p)), 'cmr', p);
});
test('A1 · CMR de catégorie 2 (H341, H351, H361) : régime général, pas le régime CMR', () => {
  for (const h of ['H341', 'H351', 'H361']) assert.equal(C.regimeOf(prod(1, [h])), 'cmr2', h);
});
test('A1 · un agent chimique dangereux sans mention CMR relève du régime général', () => {
  assert.equal(C.regimeOf(prod(1, ['H315', 'H319'])), 'acd');
  assert.equal(C.regimeOf(prod(1, [])), 'aucun');
  assert.equal(C.regimeOf(prod(1, ['H225'])), 'aucun', 'une mention physique seule ne fait pas un danger santé');
});
test('A1 · la mention CMR l\'emporte sur les autres mentions', () => {
  assert.equal(C.regimeOf(prod(1, ['H315', 'H351', 'H350'])), 'cmr');
});
test('B10 · plomb et amiante repérés comme régimes particuliers', () => {
  assert.deepEqual(C.particuliersOf({ name: 'Brasure au plomb' }), ['plomb']);
  assert.deepEqual(C.particuliersOf({ name: 'Joint', subs: ['1332-21-4'] }), ['amiante']);
  assert.deepEqual(C.particuliersOf({ name: 'Plombier-chauffagiste' }), [], 'le mot « plombier » ne vaut pas exposition au plomb');
});
test('A1 · l\'employeur peut corriger le régime proposé, son choix est conservé', () => {
  const P = C.blank(); P.agents['p:1'] = { regime: 'cmr', date: '2026-10-01' };
  const a = C.agents({ products: [prod(1, ['H351'])] }, P)[0];
  assert.equal(a.regimeAuto, 'cmr2'); assert.equal(a.regime, 'cmr'); assert.equal(a.confirme, '2026-10-01');
});

test('B4 · l\'article R. 4412-70 compte exactement treize mesures, dans l\'ordre de l\'article', () => {
  assert.equal(C.MESURES_13.length, 13);
  assert.match(C.MESURES_13[0], /quantités/); assert.match(C.MESURES_13[1], /nombre de travailleurs/);
  assert.match(C.MESURES_13[9], /zones/); assert.match(C.MESURES_13[12], /déchets/);
});
test('B1 à B3 · substitution, puis système clos, puis réduction : chaque étape n\'est exigée qu\'à défaut de la précédente', () => {
  const P = C.blank();
  P.subst['p:1'] = { conclusion: 'substitue', date: '2026-09-01' };
  let s = C.substState(P, 'p:1'); assert.ok(s.b1 && s.b2 && s.b3, 'substitué : système clos et réduction non exigés');
  P.subst['p:1'] = { conclusion: 'impossible', alternatives: 'Essai produit aqueux', date: '2026-09-01' };
  s = C.substState(P, 'p:1'); assert.ok(s.b1); assert.ok(!s.b2, 'impossible : système clos à étudier'); assert.ok(!s.b3);
  P.subst['p:1'].clos = 'non'; P.subst['p:1'].closJustif = 'Pièces de grande taille';
  s = C.substState(P, 'p:1'); assert.ok(s.b2); assert.ok(!s.b3, 'pas de système clos : réduction à décrire');
  P.subst['p:1'].reduction = 'Captage à la source';
  assert.ok(C.substState(P, 'p:1').b3);
  P.subst['p:1'].clos = 'oui'; delete P.subst['p:1'].reduction;
  assert.ok(C.substState(P, 'p:1').b3, 'système clos : réduction supplémentaire non exigée par R. 4412-69');
});
test('B1 · une étude sans date ni alternative examinée n\'est pas consignée', () => {
  const P = C.blank(); P.subst['p:1'] = { conclusion: 'impossible' };
  assert.ok(!C.substState(P, 'p:1').b1);
});
test('B4 · la grille n\'est complète qu\'avec les treize points renseignés', () => {
  const P = C.blank(); P.subst['p:1'] = { mesures: {} };
  for (let i = 1; i <= 12; i++) P.subst['p:1'].mesures[i] = { statut: 'oui' };
  assert.ok(!C.substState(P, 'p:1').b4);
  P.subst['p:1'].mesures[13] = { statut: 'na', justif: 'Pas de déchet' };
  assert.ok(C.substState(P, 'p:1').b4);
});

function liste() {
  const S = { products: [prod(1, ['H350'], { poste: 'Dégraissage' }), prod(2, ['H315'], { poste: 'Dégraissage' }), proc(3, 'bois')] };
  const P = C.blank();
  P.salaries = [{ id: 1, nom: 'Martin', prenom: 'Léa', poste: 'Dégraissage', contrat: 'cdi' }, { id: 2, nom: 'Durand', prenom: 'Paul', poste: 'Menuiserie', contrat: 'interim', agence: 'Intérim Est' }];
  P.expos = [{ id: 1, sal: 1, agent: 'p:1', voies: ['inhalation'], duree: 3, degre: 2, du: '2025-01-01' }, { id: 2, sal: 1, agent: 'p:2' }, { id: 3, sal: 2, agent: 'p:3' }];
  const ags = C.agents(S, P);
  return { S, P, ags, rows: C.listeRows(S, P, ags) };
}
test('E1 · seuls les agents du régime CMR figurent sur la liste nominative', () => {
  const { rows } = liste();
  assert.equal(rows.length, 2); assert.ok(rows.every(r => r.agentKey !== 'p:2'));
});
test('E1 · nature, durée et degré figurent « si connus », sinon la liste le dit', () => {
  const { rows } = liste();
  const lea = rows.find(r => r.sal === 1), paul = rows.find(r => r.sal === 2);
  assert.equal(lea.nature, 'Inhalation'); assert.match(lea.duree, /2 à 6 h/); assert.match(lea.degre, /Modéré/);
  assert.equal(paul.nature, 'Non connue'); assert.equal(paul.duree, 'Non connue'); assert.equal(paul.degre, 'Non connu');
});
test('E1 · la liste est exigible depuis le 5 juillet 2024', () => { assert.equal(C.LISTE_EXIGIBLE, '2024-07-05'); });
test('E1 · une version arrêtée est figée : modifier la liste ensuite ne la change pas', () => {
  const { S, P, ags, rows } = liste();
  const v = C.freezeVersion(P, rows, '2026-10-03', 'RH', 'Création');
  assert.equal(v.n, 1); assert.ok(!C.changedSince(P, rows));
  P.expos[0].degre = 1;
  const rows2 = C.listeRows(S, P, ags);
  assert.ok(C.changedSince(P, rows2), 'le changement est détecté');
  assert.match(P.versions[0].rows.find(r => r.sal === 1).degre, /Modéré/, 'la version 1 garde l\'ancien degré');
  assert.equal(C.freezeVersion(P, rows2, '2026-10-04').n, 2);
});
test('E2 · l\'extrait individuel ne contient que les lignes du salarié', () => {
  const { rows } = liste();
  const ex = C.extraitIndividuel(rows, 2);
  assert.equal(ex.length, 1); assert.ok(ex.every(r => r.sal === 2));
});
test('E2 · la version pour le CSE est anonyme : aucun nom, aucun identifiant', () => {
  const { rows } = liste();
  const an = C.anonyme(rows), txt = JSON.stringify(an);
  assert.ok(!/Martin|Durand|Léa|Paul|Intérim Est/.test(txt));
  assert.ok(an.every(r => !('nom' in r) && !('sal' in r) && !('agence' in r) && /^Salarié \d+$/.test(r.code)));
});
test('E4 · l\'extrait d\'agence ne concerne que les intérimaires', () => {
  const { P } = liste();
  assert.deepEqual(C.interimaires(P).map(s => s.id), [2]);
});
test('Aucune donnée médicale : les champs non prévus sont écartés au chargement', () => {
  const P = C.normalize({ salaries: [{ id: 1, nom: 'X', grossesse: true, aptitude: 'inapte' }], expos: [{ id: 1, sal: 1, agent: 'p:1', plombemie: 300 }] });
  assert.deepEqual(Object.keys(P.salaries[0]).sort(), ['id', 'nom']);
  assert.deepEqual(Object.keys(P.expos[0]).sort(), ['agent', 'id', 'sal']);
  for (const k of C.CHAMPS_SALARIE.concat(C.CHAMPS_EXPO)) assert.ok(!/grossesse|enceinte|aptitude|biolog|plombemie|medical|sante/i.test(k), k);
});

test('M12 · quarante-cinq obligations, numéros uniques, chacune avec son article et sa pièce', () => {
  assert.equal(C.OBLIGATIONS.length, 45);
  assert.equal(new Set(C.OBLIGATIONS.map(o => o.id)).size, 45);
  const parBloc = {}; C.OBLIGATIONS.forEach(o => { parBloc[o.bloc] = (parBloc[o.bloc] || 0) + 1; });
  assert.deepEqual(parBloc, { A: 7, B: 10, C: 6, D: 7, E: 4, F: 5, G: 3, H: 3 });
  for (const o of C.OBLIGATIONS) { assert.match(o.articles, /^[LRD]\. \d{4}/, o.id); assert.ok(o.piece, o.id); assert.ok(C.BLOCS[o.bloc], o.id); }
});
test('M12 · articles clés des obligations nouvelles et chiffrées', () => {
  const by = Object.fromEntries(C.OBLIGATIONS.map(o => [o.id, o]));
  assert.equal(by.E1.articles, 'R. 4412-93-1'); assert.equal(by.E2.articles, 'R. 4412-93-2'); assert.equal(by.E3.articles, 'R. 4412-93-3'); assert.equal(by.E4.articles, 'R. 4412-93-4');
  assert.equal(by.B1.articles, 'R. 4412-66'); assert.equal(by.B4.articles, 'R. 4412-70');
  assert.match(by.C2.frequence, /au moins une fois par an/i, 'seule fréquence chiffrée de la section');
  assert.match(by.A5.frequence, /40 ans/); assert.match(by.F2.frequence, /4 ans/);
});
test('M12 · l\'outil ne déclare jamais une obligation « conforme »', () => {
  const { S, P, ags, rows } = liste();
  const cov = C.coverage({ S, P, agents: ags, listeRows: rows });
  const txt = JSON.stringify(cov) + C.OBLIGATIONS.map(o => C.mention(o, '2026-10-03')).join(' ');
  assert.ok(!/conforme/i.test(txt));
  assert.equal(C.mention(C.OBLIGATIONS.find(o => o.id === 'B1'), '2026-10-03'), 'Pièce prévue par l\'article R. 4412-66 du code du travail, renseignée le 03/10/2026.');
  assert.match(C.mention(C.OBLIGATIONS.find(o => o.id === 'C2')), /^Pièce prévue par les articles R\. 4412-76 et R\. 4724-8/);
});
test('M12 · A7 sans objet : le portail national n\'existe pas', () => {
  const { S, P, ags, rows } = liste();
  assert.equal(C.coverage({ S, P, agents: ags, listeRows: rows }).find(c => c.o.id === 'A7').statut, 'sans-objet');
});
test('M12 · E3 n\'est couvert que si la dernière version a été transmise au service de santé', () => {
  const { S, P, ags, rows } = liste();
  const st = () => C.coverage({ S, P, agents: ags, listeRows: rows }).find(c => c.o.id === 'E3').statut;
  assert.equal(st(), 'manquant');
  C.freezeVersion(P, rows, '2026-10-03');
  assert.equal(st(), 'manquant');
  P.envois.push({ dest: 'spst', version: 1, date: '2026-10-03' });
  assert.equal(st(), 'outil');
  C.freezeVersion(P, rows, '2026-10-05');
  assert.equal(st(), 'manquant', 'une nouvelle version doit être transmise à son tour');
});
test('M12 · E4 sans objet sans intérimaire exposé, sinon un envoi par intérimaire', () => {
  const { S, P, ags, rows } = liste();
  const st = () => C.coverage({ S, P, agents: ags, listeRows: rows }).find(c => c.o.id === 'E4').statut;
  assert.equal(st(), 'manquant');
  P.envois.push({ dest: 'agence', sal: 2, date: '2026-10-03' });
  assert.equal(st(), 'outil');
  P.salaries[1].contrat = 'cdd';
  assert.equal(st(), 'sans-objet');
});
test('M12 · sans agent CMR, les obligations de traçabilité nominative sont sans objet', () => {
  const S = { products: [prod(1, ['H315'])] }, P = C.blank(), ags = C.agents(S, P);
  const cov = C.coverage({ S, P, agents: ags, listeRows: [] });
  for (const id of ['B1', 'B4', 'E1', 'E3']) assert.equal(cov.find(c => c.o.id === id).statut, 'sans-objet', id);
});
test('M12 · une pièce déclarée par l\'employeur est distinguée d\'une pièce produite par l\'outil', () => {
  const { S, P, ags, rows } = liste();
  P.pieces.C2 = { ok: true, date: '2026-03-12', lieu: 'Classeur HSE' };
  const c2 = C.coverage({ S, P, agents: ags, listeRows: rows }).find(c => c.o.id === 'C2');
  assert.equal(c2.statut, 'manuel'); assert.equal(c2.source, 'employeur'); assert.equal(c2.date, '2026-03-12');
});

test('Fichier de projet : l\'évaluation et le dossier sont sauvegardés et restaurés ensemble', () => {
  const { S, P } = liste();
  const back = C.unpackProject(JSON.parse(JSON.stringify(C.packProject(S, P))));
  assert.equal(back.S.products.length, 3); assert.equal(back.P.salaries.length, 2);
  const old = C.unpackProject({ format: 'vbs-eval', version: 1, data: { products: [] } });
  assert.ok(old && old.P === null, 'les sauvegardes de l\'outil DUERP restent lisibles');
  assert.equal(C.unpackProject({ foo: 1 }), null);
});
