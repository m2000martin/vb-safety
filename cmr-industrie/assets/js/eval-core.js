// VB Safety · moteur d'évaluation du risque chimique (partagé par evaluation.html et duerp/).
// Méthode simplifiée inspirée de l'INRS (ND 2233). Données enregistrées dans le navigateur uniquement.
/* eslint-disable no-unused-vars */
// Les exemples sont gardés à part : ils n'écrasent jamais l'évaluation de l'utilisateur.
var KEY = (function () { try { return sessionStorage.getItem('vbs-du-demo') === '1' ? 'vbs-eval-demo' : 'vbs-eval-v1'; } catch (e) { return 'vbs-eval-v1'; } })();
function demoMode() { return KEY === 'vbs-eval-demo'; }
function setDemoMode(on) { try { if (on) sessionStorage.setItem('vbs-du-demo', '1'); else sessionStorage.removeItem('vbs-du-demo'); } catch (e) {} KEY = on ? 'vbs-eval-demo' : 'vbs-eval-v1'; }

// ---------- Référentiels ----------
// Classes de danger santé (1 à 5) à partir des mentions H.
// Choix VB Safety : les agents CMR avérés ou présumés (H340, H350, H360) sont placés en classe 5.
var H_CLASS = {
  H300: 5, H310: 5, H330: 5, H340: 5, H350: 5, H360: 5, H370: 5,
  H301: 4, H311: 4, H331: 4, H314: 4, H372: 4,
  H302: 3, H312: 3, H332: 3, H317: 3, H318: 3, H334: 3, H341: 3, H351: 3, H361: 3, H362: 3, H371: 3, H373: 3, H304: 3, EUH070: 3,
  H315: 2, H319: 2, H335: 2, H336: 2, EUH066: 2
};
var H_LABEL = {
  H300: 'Mortel en cas d\'ingestion', H301: 'Toxique en cas d\'ingestion', H302: 'Nocif en cas d\'ingestion', H304: 'Mortel par aspiration',
  H310: 'Mortel par contact cutané', H311: 'Toxique par contact cutané', H312: 'Nocif par contact cutané', H314: 'Brûlures et lésions oculaires graves',
  H315: 'Irritation cutanée', H317: 'Allergie cutanée', H318: 'Lésions oculaires graves', H319: 'Irritation oculaire',
  H330: 'Mortel par inhalation', H331: 'Toxique par inhalation', H332: 'Nocif par inhalation', H334: 'Allergie respiratoire',
  H335: 'Irritation des voies respiratoires', H336: 'Somnolence ou vertiges', H340: 'Mutagène (avéré ou présumé)', H341: 'Mutagène suspecté',
  H350: 'Cancérogène (avéré ou présumé)', H351: 'Cancérogène suspecté', H360: 'Toxique pour la reproduction (avéré ou présumé)',
  H361: 'Toxique pour la reproduction suspecté', H362: 'Effets via l\'allaitement', H370: 'Atteinte des organes', H371: 'Atteinte possible des organes',
  H372: 'Atteinte des organes (expositions répétées)', H373: 'Atteinte possible des organes (expositions répétées)', EUH066: 'Dessèchement de la peau', EUH070: 'Toxique par contact oculaire'
};
var CMR = { H340: 1, H350: 1, H360: 1 };
var CMR_SUSP = { H341: 1, H351: 1, H361: 1 };
// Procédés cancérogènes (liste réglementaire, arrêté du 26 octobre 2020) les plus courants
var PROCEDES = {
  bois: { label: 'Poussières de bois inhalables', etat: 'solide', pulv: 3 },
  silice: { label: 'Poussière de silice cristalline alvéolaire', etat: 'solide', pulv: 3 },
  hap: { label: 'HAP : suies, goudrons, brais de houille', etat: 'gaz' },
  diesel: { label: 'Émissions d\'échappement de moteurs diesel', etat: 'gaz' },
  huiles: { label: 'Huiles minérales usagées de moteur (contact cutané)', etat: 'liquide', vol: 1 },
  autre: { label: 'Autre procédé cancérogène listé', etat: 'gaz' }
};
var FREQ = [
  'Occasionnelle : moins de 30 min par jour (ou moins de 2 h par semaine)',
  'Intermittente : 30 min à 2 h par jour (ou 2 à 8 h par semaine)',
  'Fréquente : 2 à 6 h par jour (ou 1 à 3 jours par semaine)',
  'Permanente : plus de 6 h par jour (ou plus de 3 jours par semaine)'
];
var PROC = ['Système clos permanent', 'Clos, ouvert régulièrement', 'Procédé ouvert', 'Procédé dispersif (pulvérisation, soufflage…)'];
var PROC_S = [0.001, 0.05, 0.5, 1];
var PROT = ['Captage enveloppant ou sorbonne', 'Captage localisé ou cabine ventilée', 'Ventilation générale mécanique', 'Aucune ventilation particulière'];
var PROT_S = [0.001, 0.1, 0.7, 1];
var PULV = ['Solide compact, peu friable', 'Poudre à grains moyens', 'Poudre fine, poussières'];
var VOL = ['Faible (ébullition au-dessus de 150 °C)', 'Moyenne (ébullition entre 50 et 150 °C)', 'Forte (ébullition en dessous de 50 °C)'];
// Matrice exposition potentielle : [classe de quantité][classe de fréquence]
var MATRIX = [[1, 1, 1, 1], [1, 2, 2, 2], [2, 3, 3, 3], [2, 3, 4, 4], [2, 4, 5, 5]];

// ---------- État ----------
var S = load();
function blank() { return { site: '', products: [], actions: {}, next: 1 }; }
function load() {
  try {
    var d = JSON.parse(localStorage.getItem(KEY));
    // Ancien exemple enregistré à la place des données de l'utilisateur : on l'écarte
    if (d && !demoMode() && (d.isDemo || d.site === 'Atelier de démonstration')) { localStorage.removeItem(KEY); return blank(); }
    if (d && d.products) return d;
  } catch (e) {}
  return blank();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

// ---------- Utilitaires ----------
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function fmt(n) { if (n >= 1) return Math.round(n).toLocaleString('fr-FR'); return String(+n.toPrecision(2)).replace('.', ','); }
function parseH(txt) {
  var out = [], m, re = /\b(EUH\s?\d{3}|H\s?\d{3})([A-Za-z]{0,2})\b/g;
  while ((m = re.exec(txt || ''))) { var c = m[1].replace(/\s/g, '').toUpperCase(); if (out.indexOf(c) === -1) out.push(c); }
  return out;
}

// ---------- Référentiel de substances (textes officiels) ----------
var REF = null, RIDX = [], RBY = {}, RPROC = {}, RMP = {};
function nrm(v) { return String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function validCas(c) {
  var m = /^(\d{2,7})-(\d{2})-(\d)$/.exec(c); if (!m) return false;
  var d = (m[1] + m[2]).split('').reverse(), sum = 0; d.forEach(function (x, i) { sum += (i + 1) * +x; });
  return sum % 10 === +m[3];
}
function parseCas(txt) { var out = [], m, re = /\b\d{2,7}-\d{2}-\d\b/g; while ((m = re.exec(txt || ''))) if (validCas(m[0]) && out.indexOf(m[0]) === -1) out.push(m[0]); return out; }
function loadRef() {
  if (!window.fetch) return;
  fetch('data/substances.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.substances) return;
    REF = d; RBY = {}; RPROC = {}; RMP = {};
    RIDX = d.substances.map(function (x) { RBY[x.id] = x; return { s: x, k: nrm([x.nom].concat(x.syn || [], x.cas || [], [x.ce || '']).join(' ')), n: nrm(x.nom) }; });
    (d.procedes || []).forEach(function (p) { RPROC[p.id] = p; });
    (d.tableaux_mp || []).forEach(function (t) { if (!RMP[t.n]) RMP[t.n] = t.titre; });
    if (typeof window.EV_ONREF === 'function') window.EV_ONREF();
  }).catch(function () {});
}
function findSubs(q) {
  var n = nrm(q); if (n.length < 2) return [];
  var starts = [], has = [];
  RIDX.forEach(function (e) { if (e.n.indexOf(n) === 0) starts.push(e.s); else if (e.k.indexOf(n) !== -1) has.push(e.s); });
  return starts.concat(has).slice(0, 8);
}
function subsOf(p) {
  if (p.type === 'procede') { var pr = RPROC[p.procede]; return pr && pr.vlep_id && RBY[pr.vlep_id] ? [RBY[pr.vlep_id]] : []; }
  return (p.subs || []).map(function (id) { return RBY[id]; }).filter(Boolean);
}
function mpOf(p) {
  var out = [];
  if (p.type === 'procede' && RPROC[p.procede]) out = (RPROC[p.procede].mp || []).slice();
  subsOf(p).forEach(function (x) { (x.mp || []).forEach(function (n) { if (out.indexOf(n) === -1) out.push(n); }); });
  return out;
}
function num2(v) { return String(+(+v).toPrecision(3)).replace('.', ','); }
function vlepTxt(x, short) {
  var v = x.vlep || {}, a = [];
  if (v.v8_mg != null || v.v8_ppm != null || v.v8_f != null) a.push((short ? '' : '8 h : ') + (v.v8_mg != null ? num2(v.v8_mg) + ' mg/m³' : v.v8_f != null ? num2(v.v8_f) + ' f/cm³' : num2(v.v8_ppm) + ' ppm') + (v.v8_ppm != null && v.v8_mg != null && !short ? ' (' + num2(v.v8_ppm) + ' ppm)' : ''));
  if (!short && (v.ct_mg != null || v.ct_ppm != null)) a.push('15 min : ' + (v.ct_mg != null ? num2(v.ct_mg) + ' mg/m³' : num2(v.ct_ppm) + ' ppm'));
  return a.join(' · ');
}
function hasVlep(x) { var v = x.vlep || {}; return v.v8_mg != null || v.v8_ppm != null || v.v8_f != null || v.ct_mg != null || v.ct_ppm != null; }
function transitoire(x) {
  var t = (x.vlep || {}).transitoire; if (!t) return '';
  var years = (t.match(/20\d\d/g) || []).map(Number), now = new Date().getFullYear();
  return years.length && Math.max.apply(null, years) >= now ? t.replace(/\s*\(\d+\)/g, '') : '';
}
function officialCmr(x) { return (x.cmr || []).filter(function (c) { return /1A|1B/.test(c); }); }

// ---------- Calculs ----------
function dangerClass(p) {
  if (p.type === 'procede') return 5;
  var c = 1; (p.h || []).forEach(function (h) { if (H_CLASS[h] > c) c = H_CLASS[h]; });
  return c;
}
function cmrLevel(p) {
  if (p.type === 'procede') return 'cmr';
  if ((p.h || []).some(function (h) { return CMR[h]; })) return 'cmr';
  if ((p.h || []).some(function (h) { return CMR_SUSP[h]; })) return 'susp';
  return '';
}
function qmax() { var m = 0; S.products.forEach(function (p) { if (p.type !== 'procede' && +p.qte > m) m = +p.qte; }); return m; }
function qClass(p, Q) {
  if (p.type === 'procede') return +p.intensite || 3;
  var q = +p.qte || 0; if (!Q || !q) return 1;
  var r = q / Q; return r < 0.01 ? 1 : r < 0.05 ? 2 : r < 0.12 ? 3 : r < 0.33 ? 4 : 5;
}
function volScore(p) {
  if (p.etat === 'gaz') return 100;
  if (p.etat === 'solide') return [1, 10, 100][(+p.pulv || 2) - 1];
  var v = +p.vol;
  if (!v) { var t = parseFloat(p.teb); if (isNaN(t)) { var tb = subsOf(p).map(function (x) { return x.teb; }).filter(function (x) { return x != null; }); if (tb.length) t = Math.min.apply(null, tb); } v = isNaN(t) ? 2 : t < 50 ? 3 : t <= 150 ? 2 : 1; }
  return [1, 10, 100][v - 1];
}
function compute() {
  var Q = qmax(), total = 0;
  var rows = S.products.map(function (p) {
    var dc = dangerClass(p), qc = qClass(p, Q), fc = +p.freq || 1, ec = MATRIX[qc - 1][fc - 1];
    var sd = Math.pow(10, dc - 1), se = Math.pow(10, ec - 1), pot = sd * se;
    var sinh = sd * volScore(p) * PROC_S[(+p.proc || 3) - 1] * PROT_S[(+p.prot || 4) - 1];
    total += pot;
    var subs = subsOf(p), cl = cmrLevel(p);
    var warn = p.type === 'procede' ? [] : subs.filter(function (x) { return officialCmr(x).length && cl !== 'cmr'; });
    return { p: p, dc: dc, qc: qc, fc: fc, ec: ec, pot: pot, prio: pot >= 10000 ? 1 : pot >= 100 ? 2 : 3, sinh: sinh, inh: sinh >= 1000 ? 1 : sinh >= 100 ? 2 : 3, cmr: cl,
      subs: subs, vleps: subs.filter(hasVlep), peau: subs.some(function (x) { return x.peau; }), sensResp: subs.some(function (x) { return (x.sens || []).indexOf('resp') !== -1; }), sens: subs.some(function (x) { return (x.sens || []).length; }), warn: warn, mp: mpOf(p) };
  });
  rows.sort(function (a, b) { return b.pot - a.pot; });
  var cum = 0; rows.forEach(function (r) { cum += r.pot; r.cum = total ? cum / total * 100 : 0; });
  return rows;
}
function actionsFor(r) {
  var p = r.p, a = [], poste = p.poste ? ' (' + p.poste + ')' : '', nb = +p.nb || 0;
  if (r.cmr === 'cmr') {
    a.push(['subst', 'Rechercher un substitut moins dangereux et consigner le résultat de l\'étude', 'Art. R. 4412-66', 'substitution']);
    if ((+p.proc || 3) > 1) a.push(['clos', 'Si la substitution est impossible, passer en système clos', 'Art. R. 4412-68', 'clos']);
    a.push(['liste', 'Inscrire ' + (nb ? nb + ' salarié' + (nb > 1 ? 's' : '') : 'les salariés') + poste + ' sur la liste des travailleurs exposés et la transmettre au SPST', 'Art. R. 4412-93-1', 'suivi']);
    a.push(['sir', 'Organiser le suivi individuel renforcé des salariés exposés', 'Art. R. 4624-23', 'suivi']);
    if (!r.vleps.length) a.push(['mesurecmr', 'Évaluer l\'exposition par des mesurages au poste (pas de valeur limite contraignante connue pour cet agent)', 'Art. R. 4412-61', 'suivi']);
    a.push(['affect', 'Vérifier les restrictions d\'affectation : moins de 18 ans, femmes enceintes ou allaitantes (reprotoxiques), CDD et intérimaires', 'Art. D. 4153-17, D. 4152-10', 'suivi']);
  } else if (r.cmr === 'susp') {
    a.push(['subst', 'Étudier la substitution : agent suspecté cancérogène, mutagène ou reprotoxique', 'Principes généraux de prévention', 'substitution']);
  }
  if (r.vleps.length) a.push(['vlepc', 'Faire contrôler au moins une fois par an le respect des valeurs limites contraignantes par un organisme accrédité', r.cmr === 'cmr' ? 'Art. R. 4412-76' : 'Art. R. 4412-27', 'suivi']);
  r.warn.forEach(function (x) { a.push(['fds', 'Vérifier la FDS : ' + x.nom + ' est classé ' + officialCmr(x).join(', ') + ' au niveau européen, mais le produit ne porte aucune mention CMR (concentration à contrôler)', 'Règlement CLP, annexe VI', 'suivi']); });
  if (r.sensResp) a.push(['sens', 'Agent sensibilisant pour les voies respiratoires : en informer le médecin du travail et limiter l\'exposition', 'Art. R. 4412-149', 'suivi']);
  if (r.inh <= 2) {
    if ((+p.proc || 3) === 4) a.push(['disp', 'Limiter le caractère dispersif du procédé (application au rouleau plutôt qu\'en pulvérisation, humidification…)', 'Réduction à la source', 'reduction']);
    if ((+p.prot || 4) >= 3) a.push(['capt', 'Installer un captage des polluants à la source (captage enveloppant ou localisé)', 'Protection collective', 'reduction']);
    if (r.inh === 1) a.push(['mesure', 'Mesurer l\'exposition des salariés au poste pour confirmer le niveau de risque', 'Évaluation', 'suivi']);
  }
  if (r.dc >= 3 && (+p.prot || 4) === 4 && !a.some(function (x) { return x[0] === 'capt'; })) a.push(['venti', 'Mettre en place une ventilation adaptée au poste', 'Protection collective', 'reduction']);
  if (r.peau) a.push(['peau', 'Pénétration cutanée importante : gants adaptés au produit, hygiène des mains, pas de contact cutané direct', 'Mention « peau », art. R. 4412-149', 'epi']);
  if (r.dc >= 2) a.push(['epi', 'Vérifier l\'adéquation des EPI (gants, protection respiratoire, lunettes), en dernier recours', 'Protection individuelle', 'epi']);
  return a;
}

function planItems(rows) {
  var map = {}, list = [];
  rows.forEach(function (r) {
    actionsFor(r).forEach(function (a) {
      var code = a[0] === 'fds' ? 'fds:' + a[1] : a[0], it = map[code];
      if (!it) { it = map[code] = { k: 'g:' + code, code: code, text: a[1], law: a[2], group: a[3], prods: [], postes: {}, prio: r.prio }; list.push(it); }
      if (it.prods.indexOf(r.p.name) === -1) it.prods.push(r.p.name);
      if (r.p.poste || r.p.nb) { var k = r.p.poste || r.p.name; it.postes[k] = Math.max(it.postes[k] || 0, +r.p.nb || 0); }
      if (r.prio < it.prio) it.prio = r.prio;
      if (a[0] === 'vlepc') { it.vl = it.vl || []; r.vleps.forEach(function (x) { var t = x.nom + ' : ' + vlepTxt(x, true); if (it.vl.indexOf(t) === -1) it.vl.push(t); }); if (r.cmr === 'cmr' && it.law.indexOf('76') === -1) it.law = 'Art. R. 4412-27 et R. 4412-76'; }
    });
  });
  list.forEach(function (it) {
    if (it.code === 'vlepc') it.sub = 'VLEP 8 h : ' + it.vl.join(' · ');
    if (it.code === 'liste') {
      var ps = Object.keys(it.postes), tot = 0; ps.forEach(function (k) { tot += it.postes[k]; });
      it.text = 'Inscrire ' + (tot ? tot + ' salarié' + (tot > 1 ? 's' : '') : 'les salariés exposés') + ' sur la liste des travailleurs exposés et la transmettre au SPST';
      it.sub = ps.map(function (k) { return k + (it.postes[k] ? ' (' + it.postes[k] + ')' : ''); }).join(', ');
    }
  });
  return list;
}



var PRIO = ['', ['Forte', 'bad'], ['Moyenne', 'mid'], ['Faible', 'ok']];
var INH = ['', ['Élevé', 'bad'], ['Modéré', 'mid'], ['Faible', 'ok']];
var FREQ_S = ['Occasionnelle', 'Intermittente', 'Fréquente', 'Permanente'];
var PROC_T = ['Clos', 'Clos, ouvert', 'Ouvert', 'Dispersif'];
var PROT_T = ['Captage enveloppant', 'Captage localisé', 'Ventilation générale', 'Aucune'];
var GROUPS = { substitution: 'Substitution', clos: 'Système clos', reduction: 'Réduction et protection collective', suivi: 'Traçabilité, contrôles et suivi médical', epi: 'Protection individuelle' };
var GORDER = { substitution: 1, clos: 2, reduction: 3, suivi: 4, epi: 5 };
function demo() {
  var d = blank(); d.site = 'Atelier de démonstration'; d.isDemo = true;
  var list = [
    { name: 'Dégraissant au trichloréthylène', subs: ['79-01-6'], h: ['H315', 'H317', 'H319', 'H336', 'H341', 'H350', 'H412'], etat: 'liquide', teb: 87, qte: 400, unite: 'L', freq: 3, poste: 'Dégraissage des pièces', nb: 3, proc: 3, prot: 3 },
    { name: 'Peinture au chromate de zinc', subs: ['fr:chrome-hexavalent-et-ses-composes'], h: ['H317', 'H350', 'H410'], etat: 'liquide', teb: 140, qte: 150, unite: 'L', freq: 2, poste: 'Cabine de peinture', nb: 2, proc: 4, prot: 2 },
    { name: 'Diluant cellulosique', subs: ['108-88-3', '123-86-4', '67-64-1'], h: ['H225', 'H304', 'H315', 'H336', 'H373'], etat: 'liquide', teb: 70, qte: 900, unite: 'L', freq: 3, poste: 'Cabine de peinture', nb: 2, proc: 4, prot: 2 },
    { name: 'Résine époxy', h: ['H315', 'H317', 'H319', 'H411'], etat: 'liquide', teb: 250, qte: 200, unite: 'kg', freq: 2, poste: 'Assemblage', nb: 6, proc: 3, prot: 4 },
    { name: 'Acétone', subs: ['67-64-1'], h: ['H225', 'H319', 'H336', 'EUH066'], etat: 'liquide', teb: 56, qte: 300, unite: 'L', freq: 1, poste: 'Assemblage', nb: 6, proc: 3, prot: 4 },
    { type: 'procede', procede: 'bois', name: 'Poussières de bois inhalables', intensite: 3, freq: 3, poste: 'Menuiserie', nb: 4, proc: 3, prot: 2, etat: 'solide', pulv: 3 }
  ];
  list.forEach(function (p) { p.id = d.next++; p.type = p.type || 'produit'; d.products.push(p); });
  d.refSeen = {}; if (REF) d.products.forEach(function (p) { (p.subs || []).forEach(function (id) { if (RBY[id]) d.refSeen[id] = RBY[id].fp; }); });
  return d;
}
