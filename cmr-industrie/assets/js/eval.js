// VB Safety · Évaluation du risque chimique en ligne
// Méthode d'évaluation simplifiée inspirée de l'INRS (ND 2233) :
//  1. hiérarchisation des risques potentiels (danger × exposition potentielle)
//  2. estimation du risque par inhalation (danger × volatilité × procédé × protection collective)
// Toutes les données restent dans le navigateur (localStorage). Aucun envoi vers un serveur.
(function () {
  'use strict';
  var KEY = 'vbs-eval-v1';

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
  var UI = { view: 'inv', sel: null, dtab: 'syn', q: '', niv: '', poste: '', statut: '', per: 50, page: 0, rq: '' };
  function blank() { return { site: '', products: [], actions: {}, next: 1 }; }
  function load() { try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && d.products) return d; } catch (e) {} return blank(); }
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
      refStatus(); render(); checkRefChanges();
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
  function frDate(iso) { try { return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR'); } catch (e) { return iso; } }
  function refStatus() {
    var el = $('#ev-ref'); if (!el || !REF) return;
    var v = (REF.meta.sources || {}).vlep || {};
    el.innerHTML = '<span>Référentiel : <b>Code du travail</b>' + (v.en_vigueur_depuis ? ' (v. ' + frDate(v.en_vigueur_depuis) + ')' : '') + '</span><span>Dernière mise à jour : ' + frDate(REF.meta.genere_le) + '</span>';
  }
  function checkRefChanges() {
    if (!REF) return;
    S.refSeen = S.refSeen || {};
    var changed = [];
    S.products.forEach(function (p) { subsOf(p).forEach(function (x) { var seen = S.refSeen[x.id]; if (seen && seen !== x.fp && changed.indexOf(x) === -1) changed.push(x); else if (!seen) S.refSeen[x.id] = x.fp; }); });
    var el = $('#ev-alert'); if (!el) return;
    if (!changed.length) { el.hidden = true; save(); return; }
    el.innerHTML = '<b>Évolution réglementaire</b><p>Le référentiel a changé pour ' + changed.length + ' substance' + (changed.length > 1 ? 's' : '') + ' de votre inventaire : ' + changed.map(function (x) { return esc(x.nom) + (hasVlep(x) ? ' (VLEP ' + vlepTxt(x, true) + ')' : ''); }).join(', ') + '. Vérifiez vos évaluations et votre plan d\'action.</p><button type="button" class="btn btn-secondary" data-act="ackref">J\'ai pris connaissance</button>';
    el.hidden = false;
  }

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


  // ---------- Rendu ----------
  var PRIO = ['', ['Forte', 'bad'], ['Moyenne', 'mid'], ['Faible', 'ok']];
  var INH = ['', ['Élevé', 'bad'], ['Modéré', 'mid'], ['Faible', 'ok']];
  var FREQ_S = ['Occasionnelle', 'Intermittente', 'Fréquente', 'Permanente'];
  var PROC_T = ['Clos', 'Clos, ouvert', 'Ouvert', 'Dispersif'];
  var PROT_T = ['Captage enveloppant', 'Captage localisé', 'Ventilation générale', 'Aucune'];
  var GROUPS = { substitution: 'Substitution', clos: 'Système clos', reduction: 'Réduction et protection collective', suivi: 'Traçabilité, contrôles et suivi médical', epi: 'Protection individuelle' };
  var GORDER = { substitution: 1, clos: 2, reduction: 3, suivi: 4, epi: 5 };
  var ROWS = [];
  function badge(t, c) { return '<span class="ev-badge ' + c + '">' + t + '</span>'; }
  function dangerBadge(c) { return '<span class="ev-dc dc' + c + '" title="Classe de danger ' + c + ' sur 5">' + c + '</span>'; }
  function cmrBadge(l) { return l === 'cmr' ? badge('CMR', 'cmr') : l === 'susp' ? badge('Suspecté', 'susp') : ''; }
  function lvl(r) { return '<span class="ev-lvl ' + INH[r.inh][1] + '">' + INH[r.inh][0] + '</span>'; }
  function plural(n, w) { return n + ' ' + w + (n > 1 ? 's' : ''); }
  function empty(msg) { return '<div class="ev-empty"><p>' + msg + '</p><div class="ev-empty-cta"><button type="button" class="btn btn-primary" data-act="add">Ajouter un produit</button><button type="button" class="btn btn-secondary" data-act="demo">Charger un exemple</button></div></div>'; }
  function volTxt(p) {
    if (p.etat === 'gaz') return 'Gaz, fumée';
    var v = volScore(p), t = v === 100 ? 'Forte' : v === 10 ? 'Moyenne' : 'Faible';
    return p.etat === 'solide' ? 'Pulv. ' + t.toLowerCase() : t;
  }
  function subline(r) {
    if (r.p.type === 'procede') return 'Procédé émissif';
    if (r.subs.length) return r.subs.map(function (x) { return esc(x.nom) + (x.cas && x.cas[0] ? ' · CAS ' + x.cas[0] : ''); }).join(', ');
    return (r.p.h || []).length ? r.p.h.slice(0, 4).join(', ') + (r.p.h.length > 4 ? '…' : '') : 'Aucune mention santé';
  }
  function nameCell(r) {
    return '<td class="c-name" data-l="Agent / procédé"><button type="button" class="ev-open" data-open="' + r.p.id + '">' + esc(r.p.name) + '</button><small>' + subline(r) + '</small>' + (r.warn.length ? '<small class="ev-warnline">Classification CMR européenne à vérifier</small>' : '') + '</td>';
  }
  function body(id) { return $('#v-' + id + ' .ev-body'); }
  function planState() { var items = planItems(ROWS), done = items.filter(function (it) { var st = S.actions[it.k]; return st && st.statut === 'fait'; }).length; return { items: items, done: done }; }
  function postesCmr() {
    var postes = {};
    ROWS.filter(function (r) { return r.cmr === 'cmr'; }).forEach(function (r) { var k = r.p.poste || 'Poste non renseigné'; postes[k] = postes[k] || { agents: [], nb: 0, rows: [] }; postes[k].agents.push(r.p.name); postes[k].rows.push(r); postes[k].nb = Math.max(postes[k].nb, +r.p.nb || 0); });
    return postes;
  }

  function render() {
    ROWS = compute();
    if ($('#ev-site').value !== (S.site || '')) $('#ev-site').value = S.site || '';
    renderKpis();
    ({ dash: renderDash, inv: renderInv, hier: renderHier, inh: renderInh, plan: renderPlan, cmr: renderCmr, sal: renderSal, export: renderExport, set: renderSet, ref: renderRef })[UI.view]();
    renderDrawer();
    save();
  }
  function renderKpis() {
    var n = ROWS.length, cmr = ROWS.filter(function (r) { return r.cmr === 'cmr'; }), sal = 0, ps = postesCmr();
    Object.keys(ps).forEach(function (k) { sal += ps[k].nb; });
    var inh = ROWS.filter(function (r) { return r.inh === 1; }).length, pl = planState(), acts = pl.items.length;
    var k = function (v, l, c) { return '<div class="kpi' + (c ? ' ' + c : '') + '"><span>' + l + '</span><b>' + v + '</b></div>'; };
    $('#ev-kpis').innerHTML = k(n, 'Produits et procédés') + k(cmr.length, 'Agents CMR', cmr.length ? 'k-red' : '') + k(sal, 'Salariés exposés CMR') + k(inh, 'Risques inhalation élevés', inh ? 'k-red' : '') + k((acts ? Math.round(pl.done / acts * 100) : 0) + ' %', 'Plan d\'action réalisé');
    $$('.app-nav-i em').forEach(function (el) { var t = el.getAttribute('data-n'), v = t === 'inv' ? n : t === 'cmr' ? cmr.length : t === 'plan' ? acts : t === 'sal' ? Object.keys(ps).length : 0; el.textContent = v || ''; });
  }

  function renderDash() {
    var el = body('dash');
    if (!ROWS.length) { el.innerHTML = empty('Commencez par lister les produits chimiques utilisés et les procédés qui émettent des polluants (poussières de bois, silice, fumées…).'); return; }
    var top = ROWS.slice(0, 5), pl = planState(), byG = {};
    pl.items.forEach(function (it) { byG[it.group] = byG[it.group] || [0, 0]; byG[it.group][1]++; if ((S.actions[it.k] || {}).statut === 'fait') byG[it.group][0]++; });
    var dated = pl.items.filter(function (it) { var st = S.actions[it.k] || {}; return st.date && st.statut !== 'fait'; }).sort(function (a, b) { return S.actions[a.k].date < S.actions[b.k].date ? -1 : 1; }).slice(0, 5);
    var c = [0, 0, 0, 0]; ROWS.forEach(function (r) { c[r.prio]++; });
    el.innerHTML = '<div class="ev-dash">' +
      '<div class="ev-box ev-dash-main"><h3>Priorités à traiter</h3><table class="ev-tbl"><thead><tr><th>Agent / procédé</th><th>Poste</th><th>CMR</th><th class="num">Score potentiel</th><th>Priorité</th></tr></thead><tbody>' +
      top.map(function (r) { return '<tr class="is-row l-' + PRIO[r.prio][1] + '" data-open="' + r.p.id + '">' + nameCell(r) + '<td data-l="Poste">' + esc(r.p.poste || '—') + '</td><td data-l="CMR">' + (cmrBadge(r.cmr) || '<span class="ev-mute">—</span>') + '</td><td class="num" data-l="Score">' + fmt(r.pot) + '</td><td data-l="Priorité"><span class="ev-lvl ' + PRIO[r.prio][1] + '">' + PRIO[r.prio][0] + '</span></td></tr>'; }).join('') +
      '</tbody></table><p class="ev-tfoot"><span>' + c[1] + ' forte · ' + c[2] + ' moyenne · ' + c[3] + ' faible</span><button type="button" class="ev-link" data-go="hier">Voir la hiérarchisation</button></p></div>' +
      '<div class="ev-dash-side"><div class="ev-box"><h3>Avancement du plan d\'action</h3><ul class="ev-prog">' +
      Object.keys(GROUPS).filter(function (g) { return byG[g]; }).map(function (g) { var d = byG[g]; return '<li><span>' + GROUPS[g] + '</span><em>' + d[0] + ' / ' + d[1] + '</em><div class="ev-bar"><i class="ok" data-w="' + (d[0] / d[1] * 100).toFixed(0) + '"></i></div></li>'; }).join('') +
      '</ul><button type="button" class="ev-link" data-go="plan">Ouvrir le plan d\'action</button></div>' +
      '<div class="ev-box"><h3>Prochaines échéances</h3>' + (dated.length ? '<ul class="ev-due">' + dated.map(function (it) { var st = S.actions[it.k]; return '<li><time>' + frDate(st.date) + '</time><span>' + esc(it.text) + '</span>' + (st.resp ? '<em>' + esc(st.resp) + '</em>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="ev-mute">Aucune échéance. Attribuez un responsable et une date dans le plan d\'action.</p>') + '</div></div></div>';
    bars(el);
  }
  function bars(el) { $$('.ev-bar i[data-w]', el).forEach(function (i) { i.style.width = i.getAttribute('data-w') + '%'; }); }

  function filtered() {
    var q = nrm(UI.q);
    return ROWS.filter(function (r) {
      if (UI.niv && String(r.inh) !== UI.niv) return false;
      if (UI.poste && (r.p.poste || '') !== UI.poste) return false;
      if (UI.statut && (UI.statut === 'non' ? r.cmr !== '' : r.cmr !== UI.statut)) return false;
      if (q && nrm([r.p.name, r.p.poste].concat(r.p.h || [], r.subs.map(function (x) { return x.nom + ' ' + (x.cas || []).join(' '); })).join(' ')).indexOf(q) === -1) return false;
      return true;
    });
  }
  function renderInv() {
    var el = body('inv');
    if (!ROWS.length) { el.innerHTML = empty('Commencez par lister les produits chimiques utilisés et les procédés qui émettent des polluants (poussières de bois, silice, fumées…).'); return; }
    var postes = []; ROWS.forEach(function (r) { if (r.p.poste && postes.indexOf(r.p.poste) === -1) postes.push(r.p.poste); }); postes.sort();
    if (UI.poste && postes.indexOf(UI.poste) === -1) UI.poste = '';
    var opt = function (v, t, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(t) + '</option>'; };
    var list = filtered().sort(function (a, b) { return b.sinh - a.sinh; }), pages = Math.max(1, Math.ceil(list.length / UI.per));
    if (UI.page >= pages) UI.page = pages - 1;
    var slice = list.slice(UI.page * UI.per, (UI.page + 1) * UI.per);
    el.innerHTML = '<div class="ev-filters"><label class="ev-search"><svg class="icon" aria-hidden="true"><use href="#i-search"/></svg><span class="sr-only">Rechercher</span><input class="input" data-ui="q" value="' + esc(UI.q) + '" placeholder="Rechercher un produit, une substance, un n° CAS…"></label>' +
      '<label><span class="sr-only">Niveau</span><select class="input" data-ui="niv">' + opt('', 'Tous les niveaux', UI.niv) + opt('1', 'Élevé', UI.niv) + opt('2', 'Modéré', UI.niv) + opt('3', 'Faible', UI.niv) + '</select></label>' +
      '<label><span class="sr-only">Poste</span><select class="input" data-ui="poste">' + opt('', 'Tous les postes', UI.poste) + postes.map(function (p) { return opt(p, p, UI.poste); }).join('') + '</select></label>' +
      '<label><span class="sr-only">Statut CMR</span><select class="input" data-ui="statut">' + opt('', 'Tous les statuts', UI.statut) + opt('cmr', 'CMR', UI.statut) + opt('susp', 'CMR suspecté', UI.statut) + opt('non', 'Non CMR', UI.statut) + '</select></label></div>' +
      '<div class="ev-tblwrap"><table class="ev-tbl ev-inv"><thead><tr><th>Agent / procédé</th><th>Poste</th><th>CMR</th><th>Danger</th><th>Volatilité</th><th>Procédé</th><th>Protection</th><th class="num">Score</th><th>Niveau</th><th><span class="sr-only">Détail</span></th></tr></thead><tbody>' +
      (slice.length ? slice.map(function (r) {
        var p = r.p;
        return '<tr class="is-row l-' + INH[r.inh][1] + (UI.sel === p.id ? ' is-sel' : '') + '" data-open="' + p.id + '">' + nameCell(r) +
          '<td data-l="Poste">' + esc(p.poste || '—') + (p.nb ? '<small>' + plural(+p.nb, 'salarié') + '</small>' : '') + '</td>' +
          '<td data-l="CMR">' + (cmrBadge(r.cmr) || '<span class="ev-mute">—</span>') + '</td>' +
          '<td data-l="Danger">' + dangerBadge(r.dc) + '</td>' +
          '<td data-l="Volatilité">' + volTxt(p) + '</td>' +
          '<td data-l="Procédé">' + PROC_T[(+p.proc || 3) - 1] + '</td>' +
          '<td data-l="Protection">' + PROT_T[(+p.prot || 4) - 1] + '</td>' +
          '<td class="num" data-l="Score">' + fmt(r.sinh) + '</td>' +
          '<td data-l="Niveau">' + lvl(r) + '</td>' +
          '<td class="c-chev"><svg class="icon" aria-hidden="true"><use href="#i-chev"/></svg></td></tr>';
      }).join('') : '<tr><td colspan="10" class="ev-none">Aucun résultat pour ces filtres.</td></tr>') +
      '</tbody></table></div>' +
      '<div class="ev-pager"><span>' + plural(list.length, 'résultat') + '</span><div>' +
      (pages > 1 ? '<button type="button" class="ev-link" data-page="-1"' + (UI.page ? '' : ' disabled') + '>Précédent</button><span>Page ' + (UI.page + 1) + ' / ' + pages + '</span><button type="button" class="ev-link" data-page="1"' + (UI.page < pages - 1 ? '' : ' disabled') + '>Suivant</button>' : '') +
      '<label><span class="sr-only">Lignes par page</span><select class="input" data-ui="per">' + [25, 50, 100].map(function (n) { return '<option value="' + n + '"' + (UI.per === n ? ' selected' : '') + '>' + n + ' / page</option>'; }).join('') + '</select></label></div></div>';
  }

  function renderHier() {
    var el = body('hier');
    if (!ROWS.length) { el.innerHTML = empty('La hiérarchisation se calcule dès que l\'inventaire contient des produits.'); return; }
    var max = ROWS[0].pot || 1;
    el.innerHTML = '<div class="ev-tblwrap"><table class="ev-tbl ev-hier"><thead><tr><th class="num">#</th><th>Agent / procédé</th><th>CMR</th><th class="num">Danger</th><th class="num">Quantité</th><th class="num">Fréquence</th><th class="num">Exposition</th><th>Score potentiel</th><th class="num">Cumul</th><th>Priorité</th></tr></thead><tbody>' +
      ROWS.map(function (r, i) {
        var w = Math.max(3, Math.log10(r.pot) / Math.log10(Math.max(max, 10)) * 100);
        return '<tr class="is-row l-' + PRIO[r.prio][1] + '" data-open="' + r.p.id + '"><td class="num ev-mute">' + (i + 1) + '</td>' + nameCell(r) +
          '<td data-l="CMR">' + (cmrBadge(r.cmr) || '<span class="ev-mute">—</span>') + '</td><td class="num" data-l="Danger">' + r.dc + '/5</td><td class="num" data-l="Quantité">' + r.qc + '/5</td><td class="num" data-l="Fréquence">' + r.fc + '/4</td><td class="num" data-l="Exposition">' + r.ec + '/5</td>' +
          '<td data-l="Score potentiel"><div class="ev-score"><b>' + fmt(r.pot) + '</b><div class="ev-bar"><i class="' + PRIO[r.prio][1] + '" data-w="' + w.toFixed(1) + '"></i></div></div></td><td class="num" data-l="Cumul">' + Math.round(r.cum) + ' %</td>' +
          '<td data-l="Priorité"><span class="ev-lvl ' + PRIO[r.prio][1] + '">' + PRIO[r.prio][0] + '</span></td></tr>';
      }).join('') + '</tbody></table></div>';
    bars(el);
  }

  function gains(r) {
    var p = r.p, pc = PROC_S[(+p.proc || 3) - 1], pr = PROT_S[(+p.prot || 4) - 1];
    return { clos: (+p.proc || 3) > 1 ? r.sinh * 0.001 / pc : null, capt: (+p.prot || 4) > 1 ? r.sinh * 0.001 / pr : null };
  }
  function renderInh() {
    var el = body('inh');
    if (!ROWS.length) { el.innerHTML = empty('Ajoutez des produits pour estimer le risque par inhalation à chaque poste.'); return; }
    var list = ROWS.slice().sort(function (a, b) { return b.sinh - a.sinh; });
    el.innerHTML = '<div class="ev-tblwrap"><table class="ev-tbl ev-inh"><thead><tr><th>Agent / procédé</th><th>Poste</th><th class="num">Danger</th><th class="num">Volatilité</th><th class="num">Procédé</th><th class="num">Protection</th><th class="num">Score</th><th>Niveau</th><th class="num">En système clos</th><th class="num">Avec captage enveloppant</th></tr></thead><tbody>' +
      list.map(function (r) {
        var p = r.p, g = gains(r);
        return '<tr class="is-row l-' + INH[r.inh][1] + '" data-open="' + p.id + '">' + nameCell(r) + '<td data-l="Poste">' + esc(p.poste || '—') + '</td>' +
          '<td class="num" data-l="Danger">' + fmt(Math.pow(10, r.dc - 1)) + '</td><td class="num" data-l="Volatilité">' + fmt(volScore(p)) + '</td><td class="num" data-l="Procédé">' + fmt(PROC_S[(+p.proc || 3) - 1]) + '</td><td class="num" data-l="Protection">' + fmt(PROT_S[(+p.prot || 4) - 1]) + '</td>' +
          '<td class="num" data-l="Score"><b>' + fmt(r.sinh) + '</b></td><td data-l="Niveau">' + lvl(r) + '</td>' +
          '<td class="num" data-l="En système clos">' + (g.clos === null ? '<span class="ev-mute">déjà clos</span>' : fmt(g.clos)) + '</td><td class="num" data-l="Avec captage enveloppant">' + (g.capt === null ? '<span class="ev-mute">déjà en place</span>' : fmt(g.capt)) + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="ev-small">Facteurs de la méthode : volatilité 1, 10 ou 100 ; procédé de 0,001 (clos) à 1 (dispersif) ; protection de 0,001 (captage enveloppant) à 1 (aucune). Élevé au-delà de 1 000, modéré de 100 à 1 000.</p>';
  }

  function renderPlan() {
    var el = body('plan');
    if (!ROWS.length) { el.innerHTML = empty('Le plan d\'action se construit à partir de l\'inventaire.'); return; }
    var items = planItems(ROWS);
    items.sort(function (x, y) { return GORDER[x.group] - GORDER[y.group] || x.prio - y.prio; });
    var html = '<div class="ev-tblwrap"><table class="ev-tbl ev-plan"><thead><tr><th>Mesure</th><th>Référence</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead>', cur = '';
    items.forEach(function (it) {
      if (it.group !== cur) { if (cur) html += '</tbody>'; cur = it.group; html += '<tbody><tr class="ev-grp"><th colspan="5"><span>' + GORDER[cur] + '</span>' + GROUPS[cur] + '</th></tr>'; }
      var st = S.actions[it.k] || {};
      html += '<tr class="ev-action' + (st.statut === 'fait' ? ' done' : '') + '"><td class="c-name" data-l="Mesure"><b>' + esc(it.text) + '</b><small>' + (it.sub ? 'Postes : ' + esc(it.sub) : it.prods.map(esc).join(' · ')) + '</small></td>' +
        '<td class="ev-law" data-l="Référence">' + esc(it.law) + '</td>' +
        '<td data-l="Responsable"><input class="input" data-k="' + it.k + '" data-f="resp" placeholder="Nom" aria-label="Responsable" value="' + esc(st.resp || '') + '"></td>' +
        '<td data-l="Échéance"><input class="input" type="date" data-k="' + it.k + '" data-f="date" aria-label="Échéance" value="' + esc(st.date || '') + '"></td>' +
        '<td data-l="Statut"><select class="input" data-k="' + it.k + '" data-f="statut" aria-label="Statut"><option value="">À faire</option><option value="cours"' + (st.statut === 'cours' ? ' selected' : '') + '>En cours</option><option value="fait"' + (st.statut === 'fait' ? ' selected' : '') + '>Fait</option></select></td></tr>';
    });
    el.innerHTML = html + '</tbody></table></div>';
  }

  function renderCmr() {
    var el = body('cmr'), cmr = ROWS.filter(function (r) { return r.cmr; });
    if (!cmr.length) { el.innerHTML = ROWS.length ? '<div class="ev-empty"><p>Aucun agent CMR détecté. Vérifiez les mentions H de chaque fiche de données de sécurité (section 2) et les procédés émissifs.</p></div>' : empty('Les agents CMR sont repérés à partir des mentions H340, H350 et H360 et des procédés cancérogènes.'); return; }
    el.innerHTML = '<div class="ev-tblwrap"><table class="ev-tbl ev-cmr"><thead><tr><th>Agent / procédé</th><th>Statut</th><th>Mentions ou fondement</th><th>VLEP contraignante</th><th>Maladies professionnelles</th><th>Poste</th><th class="num">Salariés</th></tr></thead><tbody>' +
      cmr.map(function (r) {
        var base = r.p.type === 'procede' ? 'Procédé cancérogène (arrêté du 26/10/2020)' : (r.p.h || []).filter(function (h) { return CMR[h] || CMR_SUSP[h]; }).map(function (h) { return '<abbr title="' + esc(H_LABEL[h]) + '">' + h + '</abbr>'; }).join(', ');
        return '<tr class="is-row l-' + (r.cmr === 'cmr' ? 'bad' : 'mid') + '" data-open="' + r.p.id + '">' + nameCell(r) + '<td data-l="Statut">' + cmrBadge(r.cmr) + '</td><td data-l="Fondement">' + base + '</td>' +
          '<td data-l="VLEP">' + (r.vleps.length ? r.vleps.map(function (x) { return (r.vleps.length > 1 ? esc(x.nom) + ' : ' : '') + vlepTxt(x, true); }).join('<br>') : '<span class="ev-mute">—</span>') + '</td>' +
          '<td data-l="Maladies prof.">' + (r.mp.length ? r.mp.map(function (n) { return '<abbr title="' + esc(RMP[n] || '') + '">n° ' + esc(n) + '</abbr>'; }).join(', ') : '<span class="ev-mute">—</span>') + '</td>' +
          '<td data-l="Poste">' + esc(r.p.poste || '—') + '</td><td class="num" data-l="Salariés">' + (r.p.nb || '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function renderSal() {
    var el = body('sal'), ps = postesCmr(), keys = Object.keys(ps);
    if (!keys.length) { el.innerHTML = ROWS.length ? '<div class="ev-empty"><p>Aucun poste exposé à un agent CMR avéré ou présumé : pas de liste des travailleurs exposés à établir pour l\'instant.</p></div>' : empty('Les postes exposés apparaissent ici dès qu\'un agent CMR est inventorié.'); return; }
    el.innerHTML = '<div class="ev-tblwrap"><table class="ev-tbl ev-sal"><thead><tr><th>Poste ou atelier</th><th>Agents CMR</th><th class="num">Salariés</th><th>Durée d\'utilisation</th><th>Obligations</th></tr></thead><tbody>' +
      keys.map(function (k) {
        var f = Math.max.apply(null, ps[k].rows.map(function (r) { return r.fc; }));
        return '<tr><td class="c-name" data-l="Poste"><b>' + esc(k) + '</b></td><td data-l="Agents CMR">' + ps[k].rows.map(function (r) { return '<button type="button" class="ev-open" data-open="' + r.p.id + '">' + esc(r.p.name) + '</button>'; }).join('<br>') + '</td>' +
          '<td class="num" data-l="Salariés">' + (ps[k].nb || '<span class="ev-mute">à préciser</span>') + '</td><td data-l="Durée">' + FREQ_S[f - 1] + '</td>' +
          '<td data-l="Obligations"><ul class="ev-obl"><li>Liste des travailleurs exposés <em>R. 4412-93-1</em></li><li>Suivi individuel renforcé <em>R. 4624-23</em></li><li>Restrictions d\'affectation <em>D. 4153-17, D. 4152-10</em></li></ul></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="ev-note-box"><b>Contenu de la liste nominative</b><p>Pour chaque salarié : nature, durée et degré de l\'exposition, résultats des contrôles. Transmission au service de prévention et de santé au travail, conservation 40 ans. VB Safety Industrie &amp; BTP tiendra cette liste pour vous.</p><a class="btn btn-secondary" href="#demande" data-demande="version">Demander un accès anticipé</a></div>';
  }

  function renderExport() {
    body('export').innerHTML = '<ul class="ev-exp">' +
      '<li><div><b>Tableur (CSV)</b><span>Une ligne par produit : substances, VLEP, mentions H, scores, priorités et actions. S\'ouvre dans Excel ou LibreOffice.</span></div><button type="button" class="btn btn-secondary" data-act="csv">Télécharger</button></li>' +
      '<li><div><b>Rapport imprimable ou PDF</b><span>Inventaire, hiérarchisation, risque par inhalation, plan d\'action et agents CMR, prêts à joindre au document unique.</span></div><button type="button" class="btn btn-secondary" data-act="print">Imprimer</button></li>' +
      '<li><div><b>Sauvegarde complète (JSON)</b><span>Toute l\'évaluation, y compris le plan d\'action. Permet de la reprendre sur un autre ordinateur.</span></div><button type="button" class="btn btn-secondary" data-act="json">Télécharger</button></li>' +
      '<li><div><b>Restaurer une sauvegarde</b><span>Remplace l\'évaluation en cours par un fichier JSON exporté depuis cet outil.</span></div><label class="btn btn-secondary ev-file">Choisir un fichier<input type="file" accept="application/json,.json" data-act-file="import"></label></li></ul>';
  }
  function renderSet() {
    body('set').innerHTML = '<div class="ev-box ev-form-lite"><label class="field"><span class="label">Site ou unité de travail</span><input class="input" data-ui="site" value="' + esc(S.site || '') + '" maxlength="80" placeholder="Ex. Atelier mécanique, site de Meaux"></label>' +
      '<p class="ev-mute">Les données sont enregistrées dans ce navigateur uniquement. Rien n\'est envoyé à nos serveurs.</p></div>' +
      '<ul class="ev-exp"><li><div><b>Charger l\'exemple</b><span>Un atelier fictif avec six produits et procédés, pour découvrir l\'outil.</span></div><button type="button" class="btn btn-secondary" data-act="demo">Charger</button></li>' +
      '<li><div><b>Effacer l\'évaluation</b><span>Supprime définitivement l\'inventaire et le plan d\'action de ce navigateur.</span></div><button type="button" class="btn btn-secondary ev-danger" data-act="clear">Effacer</button></li></ul>';
  }
  function renderRef() {
    var el = body('ref');
    if (!REF) { el.innerHTML = '<p class="ev-mute">Chargement du référentiel…</p>'; return; }
    var src = REF.meta.sources || {}, v = src.vlep || {}, clp = src.clp, q = nrm(UI.rq);
    var list = REF.substances.filter(function (x) { return !q || RIDX.some(function (e) { return e.s === x && e.k.indexOf(q) !== -1; }); });
    el.innerHTML = '<dl class="ev-kv ev-refmeta"><div><dt>Valeurs limites contraignantes</dt><dd>' + REF.substances.filter(hasVlep).length + ' entrées · art. R. 4412-149' + (v.en_vigueur_depuis ? ', version du ' + frDate(v.en_vigueur_depuis) : '') + '</dd></div>' +
      '<div><dt>Maladies professionnelles</dt><dd>' + (REF.tableaux_mp || []).length + ' tableaux du régime général</dd></div>' +
      '<div><dt>Classification européenne</dt><dd>' + (clp ? 'Annexe VI du règlement CLP (' + esc(clp.celex || '') + ')' : 'Intégration en cours') + '</dd></div>' +
      '<div><dt>Dernière mise à jour</dt><dd>' + frDate(REF.meta.genere_le) + ' · <a href="#sources">sources et licences</a></dd></div></dl>' +
      '<div class="ev-filters"><label class="ev-search"><svg class="icon" aria-hidden="true"><use href="#i-search"/></svg><span class="sr-only">Rechercher une substance</span><input class="input" data-ui="rq" value="' + esc(UI.rq) + '" placeholder="Rechercher une substance ou un n° CAS"></label></div>' +
      '<div class="ev-tblwrap"><table class="ev-tbl ev-ref-t"><thead><tr><th>Substance</th><th>N° CAS</th><th>VLEP 8 h</th><th>VLEP 15 min</th><th>Mentions</th><th>Maladies prof.</th></tr></thead><tbody>' +
      list.slice(0, 60).map(function (x) {
        var vv = x.vlep || {}, m = [];
        if (x.peau) m.push('Peau'); if ((x.sens || []).length) m.push('Sensibilisant'); if (officialCmr(x).length) m.push(officialCmr(x).join(', '));
        return '<tr><td class="c-name" data-l="Substance"><b>' + esc(x.nom) + '</b>' + (transitoire(x) ? '<small class="ev-warnline">' + esc(transitoire(x)) + '</small>' : '') + '</td><td data-l="CAS">' + esc((x.cas || []).join(', ') || '—') + '</td>' +
          '<td data-l="VLEP 8 h">' + (vv.v8_mg != null ? num2(vv.v8_mg) + ' mg/m³' : vv.v8_f != null ? num2(vv.v8_f) + ' f/cm³' : vv.v8_ppm != null ? num2(vv.v8_ppm) + ' ppm' : '—') + '</td>' +
          '<td data-l="VLEP 15 min">' + (vv.ct_mg != null ? num2(vv.ct_mg) + ' mg/m³' : vv.ct_ppm != null ? num2(vv.ct_ppm) + ' ppm' : '—') + '</td>' +
          '<td data-l="Mentions">' + (m.join(' · ') || '—') + '</td><td data-l="Maladies prof.">' + ((x.mp || []).map(function (n) { return '<abbr title="' + esc(RMP[n] || '') + '">n° ' + esc(n) + '</abbr>'; }).join(', ') || '—') + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="ev-small">' + (list.length > 60 ? '60 premières entrées sur ' + list.length + ' : affinez la recherche.' : plural(list.length, 'entrée')) + '</p>';
  }

  // ---------- Panneau de détail ----------
  function renderDrawer() {
    var dr = $('#ev-drawer'), app = $('#ev-app'), r = UI.sel != null ? ROWS.filter(function (x) { return x.p.id === UI.sel; })[0] : null;
    if (!r) { UI.sel = null; dr.hidden = true; app.classList.remove('has-drawer'); document.body.classList.remove('ev-lock'); return; }
    var p = r.p, tabs = [['syn', 'Synthèse'], ['don', 'Données'], ['sal', 'Salariés'], ['act', 'Actions']];
    var html = '<div class="dr-head"><div><h3 id="dr-title">' + esc(p.name) + '</h3><p>' + (p.type === 'procede' ? 'Procédé émissif' : 'Produit chimique') + (p.poste ? ' · ' + esc(p.poste) : '') + '</p></div><button type="button" class="dr-close" data-act="close" aria-label="Fermer le détail"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button></div>' +
      '<div class="dr-tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-dtab="' + t[0] + '" aria-selected="' + (UI.dtab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div><div class="dr-body">';
    if (UI.dtab === 'syn') {
      html += '<div class="dr-scores"><div><span>Score d\'exposition (inhalation)</span><b>' + fmt(r.sinh) + '</b>' + lvl(r) + '</div><div><span>Risque potentiel</span><b>' + fmt(r.pot) + '</b><span class="ev-lvl ' + PRIO[r.prio][1] + '">Priorité ' + PRIO[r.prio][0].toLowerCase() + '</span></div></div>';
      if (r.cmr === 'cmr') html += '<div class="dr-alert bad"><b>' + (p.type === 'procede' ? 'Procédé cancérogène' : 'Agent CMR') + '</b><p>Substitution à étudier en priorité, à défaut système clos (art. R. 4412-66 et R. 4412-68). Inscription des salariés sur la liste des travailleurs exposés.</p></div>';
      else if (r.cmr === 'susp') html += '<div class="dr-alert mid"><b>CMR suspecté</b><p>Étudier la substitution. Pas d\'inscription obligatoire sur la liste des travailleurs exposés.</p></div>';
      if (r.warn.length) html += '<div class="dr-alert mid"><b>FDS à vérifier</b><p>' + r.warn.map(function (x) { return esc(x.nom) + ' (' + officialCmr(x).join(', ') + ')'; }).join(', ') + ' : classé CMR au niveau européen, mais le produit ne porte aucune mention CMR.</p></div>';
      if ((p.h || []).length) html += '<h4>Mentions de danger</h4><table class="dr-tbl"><thead><tr><th>Code</th><th>Libellé</th><th class="num">Classe</th></tr></thead><tbody>' + p.h.map(function (h) { return '<tr><td><b class="' + (CMR[h] ? 'hc' : CMR_SUSP[h] ? 'hs' : '') + '">' + h + '</b></td><td>' + esc(H_LABEL[h] || 'Mention hors santé ou non répertoriée') + '</td><td class="num">' + (H_CLASS[h] || '—') + '</td></tr>'; }).join('') + '</tbody></table>';
      if (r.vleps.length) html += '<div class="dr-vlep"><b>Valeur limite contraignante</b>' + r.vleps.map(function (x) { var tr = transitoire(x); return '<p><span>' + esc(x.nom) + '</span>' + vlepTxt(x) + (x.peau ? ' · peau' : '') + (tr ? '<em>' + esc(tr) + '</em>' : '') + '</p>'; }).join('') + '</div>';
      html += '<h4>Utilisation sur le site</h4><dl class="ev-kv">' +
        kv('Poste', esc(p.poste || '—')) + kv('Salariés exposés', p.nb || '—') +
        kv(p.type === 'procede' ? 'Intensité' : 'Quantité par an', p.type === 'procede' ? ['', '', 'Faible', 'Moyenne', '', 'Forte'][+p.intensite || 3] : (p.qte ? fmt(+p.qte) + ' ' + esc(p.unite || 'kg') : '—')) +
        kv('Durée d\'utilisation', FREQ_S[(+p.freq || 1) - 1]) + kv('Volatilité', volTxt(p) + (p.teb ? ' (ébullition ' + esc(p.teb) + ' °C)' : '')) +
        kv('Procédé', PROC[(+p.proc || 3) - 1]) + kv('Protection collective', PROT[(+p.prot || 4) - 1]) + '</dl>';
    } else if (UI.dtab === 'don') {
      if (p.type === 'procede' && RPROC[p.procede]) html += '<p class="dr-p">Procédé inscrit sur la liste de l\'arrêté du 26 octobre 2020 fixant la liste des substances, mélanges et procédés cancérogènes.</p>';
      if (!r.subs.length && p.type !== 'procede') html += '<p class="dr-p ev-mute">Aucune substance rattachée. Ajoutez les substances de la section 3 de la FDS (nom ou n° CAS) pour retrouver leurs valeurs limites et tableaux de maladies professionnelles.</p>';
      html += r.subs.map(function (x) {
        var tr = transitoire(x), cm = officialCmr(x);
        return '<div class="dr-sub"><h4>' + esc(x.nom) + '</h4><dl class="ev-kv">' + kv('N° CAS', esc((x.cas || []).join(', ') || '—')) + (x.ce ? kv('N° CE', esc(x.ce)) : '') +
          kv('VLEP contraignante', hasVlep(x) ? vlepTxt(x) : 'Aucune') + (tr ? kv('Mesure transitoire', esc(tr)) : '') +
          kv('Pénétration cutanée', x.peau ? 'Oui (mention « peau »)' : 'Non signalée') + ((x.sens || []).length ? kv('Sensibilisation', x.sens.map(function (s) { return s === 'resp' ? 'respiratoire' : 'cutanée'; }).join(', ')) : '') +
          (cm.length ? kv('Classification CLP', cm.join(', ') + (x.h && x.h.length ? ' · ' + x.h.join(' ') : '')) : '') + '</dl></div>';
      }).join('');
      if (r.mp.length) html += '<h4>Tableaux de maladies professionnelles</h4><ul class="dr-list">' + r.mp.map(function (n) { return '<li><b>n° ' + esc(n) + '</b> ' + esc(RMP[n] || '') + '</li>'; }).join('') + '</ul>';
    } else if (UI.dtab === 'sal') {
      html += '<dl class="ev-kv">' + kv('Poste', esc(p.poste || 'Non renseigné')) + kv('Salariés exposés', p.nb || 'À préciser') + kv('Durée d\'utilisation', FREQ[(+p.freq || 1) - 1]) + '</dl>';
      html += r.cmr === 'cmr' ? '<h4>Obligations pour ces salariés</h4><ul class="dr-list"><li><b>Liste des travailleurs exposés</b> nature, durée et degré d\'exposition, transmise au SPST, conservée 40 ans (art. R. 4412-93-1)</li><li><b>Suivi individuel renforcé</b> par le service de prévention et de santé au travail (art. R. 4624-23)</li><li><b>Information et formation</b> des salariés sur les risques et les précautions</li><li><b>Affectation interdite</b> aux moins de 18 ans (D. 4153-17) et, pour les reprotoxiques, aux femmes enceintes ou allaitantes (D. 4152-10)</li></ul>'
        : '<p class="dr-p ev-mute">Agent non classé CMR avéré ou présumé : pas d\'inscription sur la liste des travailleurs exposés. L\'évaluation reste à transcrire dans le document unique.</p>';
    } else {
      html += '<ul class="dr-acts">' + actionsFor(r).map(function (a) {
        var k = 'g:' + (a[0] === 'fds' ? 'fds:' + a[1] : a[0]), st = S.actions[k] || {};
        return '<li class="ev-action' + (st.statut === 'fait' ? ' done' : '') + '"><div><b>' + esc(a[1]) + '</b><span>' + esc(a[2]) + ' · ' + GROUPS[a[3]] + '</span></div><select class="input" data-k="' + esc(k) + '" data-f="statut" aria-label="Statut"><option value="">À faire</option><option value="cours"' + (st.statut === 'cours' ? ' selected' : '') + '>En cours</option><option value="fait"' + (st.statut === 'fait' ? ' selected' : '') + '>Fait</option></select></li>';
      }).join('') + '</ul>';
    }
    html += '</div><div class="dr-foot"><button type="button" class="btn btn-primary" data-edit="' + p.id + '">Modifier</button><button type="button" class="btn btn-secondary" data-del="' + p.id + '">Supprimer</button></div>';
    dr.innerHTML = html; dr.hidden = false; app.classList.add('has-drawer');
    if (window.matchMedia('(max-width: 1099px)').matches) document.body.classList.add('ev-lock');
  }
  function kv(k, v) { return '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>'; }
  // ---------- Formulaire produit ----------
  var dlg = $('#ev-dialog'), form = $('#ev-form');
  function fillSelect(sel, arr, start) { sel.innerHTML = arr.map(function (t, i) { return '<option value="' + (i + (start || 1)) + '">' + t + '</option>'; }).join(''); }
  fillSelect(form.freq, FREQ); fillSelect(form.proc, PROC); fillSelect(form.prot, PROT); fillSelect(form.pulv, PULV);
  form.vol.innerHTML = '<option value="">Calculée d\'après la température d\'ébullition</option>' + VOL.map(function (t, i) { return '<option value="' + (i + 1) + '">' + t + '</option>'; }).join('');
  form.procede.innerHTML = Object.keys(PROCEDES).map(function (k) { return '<option value="' + k + '">' + PROCEDES[k].label + '</option>'; }).join('');
  var hList = [], subList = [];
  function drawSubs() {
    var box = $('#ev-subs'); if (!box) return;
    if (!REF) { box.innerHTML = '<span class="ev-hint">Chargement du référentiel…</span>'; return; }
    box.innerHTML = subList.map(function (id) {
      var x = RBY[id]; if (!x) return '';
      var cm = officialCmr(x), tr = transitoire(x);
      return '<div class="ev-sub"><div><b>' + esc(x.nom) + '</b><span>' + (x.cas && x.cas.length ? 'CAS ' + x.cas.join(', ') : 'Sans n° CAS') + (x.ce ? ' · CE ' + esc(x.ce) : '') + '</span>' +
        (hasVlep(x) ? '<span class="ev-sub-v">VLEP contraignante ' + vlepTxt(x) + (x.peau ? ' · pénétration cutanée' : '') + '</span>' : '<span>Pas de valeur limite contraignante</span>') +
        (tr ? '<span class="ev-sub-t">' + esc(tr) + '</span>' : '') +
        (cm.length ? '<span class="ev-sub-c">Classification européenne : ' + cm.join(', ') + (x.h && x.h.length ? ' · ' + x.h.join(' ') : '') + '</span>' : '') +
        '</div><div class="ev-sub-act">' + (x.h && x.h.length ? '<button type="button" class="ev-link" data-applyh="' + esc(id) + '">Appliquer ses mentions H</button>' : '') + '<button type="button" class="ev-link del" data-rmsub="' + esc(id) + '">Retirer</button></div></div>';
    }).join('');
    var warn = $('#ev-subwarn'), cl = cmrLevel({ type: form.type.value, h: hList });
    var bad = subList.map(function (id) { return RBY[id]; }).filter(function (x) { return x && officialCmr(x).length && cl !== 'cmr'; });
    warn.hidden = !bad.length;
    warn.textContent = bad.length ? 'Attention : ' + bad.map(function (x) { return x.nom + ' (' + officialCmr(x).join(', ') + ')'; }).join(', ') + ' est classé CMR au niveau européen. Si sa concentration dépasse le seuil de classification, le produit doit porter une mention H340, H350 ou H360 : vérifiez la FDS.' : '';
  }
  function addSub(id) { if (id && RBY[id] && subList.indexOf(id) === -1) { subList.push(id); var x = RBY[id]; if (!form.name.value.trim()) form.name.value = x.nom; if (x.teb != null && !form.teb.value) form.teb.value = x.teb; } drawSubs(); }
  function drawSug(q) {
    var ul = $('#ev-sug'), res = REF ? findSubs(q) : [];
    if (!res.length) { ul.hidden = true; ul.innerHTML = ''; form.sub.setAttribute('aria-expanded', 'false'); return; }
    ul.innerHTML = res.map(function (x, i) { return '<li role="option" id="sug-' + i + '" data-sub="' + esc(x.id) + '"' + (i === 0 ? ' aria-selected="true"' : '') + '><b>' + esc(x.nom) + '</b><span>' + (x.cas && x.cas[0] ? 'CAS ' + x.cas[0] : '') + (hasVlep(x) ? ' · VLEP ' + vlepTxt(x, true) : '') + '</span></li>'; }).join('');
    ul.hidden = false; form.sub.setAttribute('aria-expanded', 'true');
  }
  function drawChips() {
    $('#ev-chips').innerHTML = hList.length ? hList.map(function (h) { return '<button type="button" class="ev-chip' + (CMR[h] ? ' c' : CMR_SUSP[h] ? ' s' : '') + '" data-h="' + h + '" title="Retirer">' + h + (H_LABEL[h] ? ' · ' + H_LABEL[h] : '') + ' <span aria-hidden="true">×</span></button>'; }).join('') : '<span class="ev-hint">Aucune mention santé : le produit sera classé au niveau de danger 1.</span>';
    var fake = { type: form.type.value, h: hList }, dc = dangerClass(fake), l = cmrLevel(fake);
    $('#ev-dc-preview').innerHTML = 'Classe de danger : ' + dangerBadge(dc) + ' ' + cmrBadge(l);
    if (REF) drawSubs();
  }
  function syncForm() {
    var proc = form.type.value === 'procede', etat = form.etat.value;
    $$('.only-prod', form).forEach(function (e) { e.hidden = proc; });
    $$('.only-proc', form).forEach(function (e) { e.hidden = !proc; });
    $$('.only-liq', form).forEach(function (e) { e.hidden = proc || etat !== 'liquide'; });
    $$('.only-sol', form).forEach(function (e) { e.hidden = proc || etat !== 'solide'; });
    drawChips();
  }
  function openForm(p, type) {
    form.reset(); form.dataset.id = p ? p.id : '';
    $('#ev-dialog-title').textContent = p ? 'Modifier ' + p.name : type === 'procede' ? 'Ajouter un procédé émissif' : 'Ajouter un produit chimique';
    p = p || { type: type || 'produit', etat: 'liquide', freq: 2, proc: 3, prot: 4, pulv: 2, intensite: 3, unite: 'kg' };
    ['name', 'type', 'procede', 'etat', 'teb', 'vol', 'pulv', 'qte', 'unite', 'freq', 'poste', 'nb', 'proc', 'prot', 'intensite'].forEach(function (k) { if (form[k] && p[k] != null) form[k].value = p[k]; });
    hList = (p.h || []).slice(); form.htext.value = '';
    subList = (p.subs || []).slice(); form.sub.value = ''; $('#ev-sug').hidden = true; drawSubs();
    syncForm(); $('#ev-form-err').hidden = true;
    dlg.showModal(); setTimeout(function () { form.name.focus(); }, 30);
  }
  form.addEventListener('change', function (e) { if (e.target.name === 'type' || e.target.name === 'etat') syncForm(); if (e.target.name === 'procede' && !form.name.value) form.name.value = PROCEDES[form.procede.value].label; });
  $('#ev-hadd').addEventListener('click', function () {
    var txt = form.htext.value, miss = [];
    parseH(txt).forEach(function (h) { if (hList.indexOf(h) === -1) hList.push(h); });
    parseCas(txt).forEach(function (c) { var hit = RIDX.filter(function (e) { return (e.s.cas || []).indexOf(c) !== -1; })[0]; if (hit) addSub(hit.s.id); else miss.push(c); });
    $('#ev-casmiss').textContent = miss.length ? 'N° CAS repérés sans valeur limite contraignante dans le référentiel : ' + miss.join(', ') : '';
    form.htext.value = ''; drawChips(); drawSubs();
  });
  form.sub.addEventListener('input', function () { drawSug(form.sub.value); });
  form.sub.addEventListener('keydown', function (e) {
    var ul = $('#ev-sug'), items = $$('li', ul), cur = items.findIndex(function (li) { return li.getAttribute('aria-selected') === 'true'; });
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!items.length) return; e.preventDefault(); var n = (cur + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach(function (li, i) { li.setAttribute('aria-selected', i === n); }); form.sub.setAttribute('aria-activedescendant', items[n].id); }
    else if (e.key === 'Enter') { e.preventDefault(); if (cur >= 0) { addSub(items[cur].dataset.sub); form.sub.value = ''; drawSug(''); } }
    else if (e.key === 'Escape') { e.stopPropagation(); drawSug(''); }
  });
  $('#ev-sug').addEventListener('mousedown', function (e) { var li = e.target.closest('[data-sub]'); if (li) { e.preventDefault(); addSub(li.dataset.sub); form.sub.value = ''; drawSug(''); } });
  form.sub.addEventListener('blur', function () { setTimeout(function () { drawSug(''); }, 150); });
  $('#ev-subs').addEventListener('click', function (e) {
    var rm = e.target.closest('[data-rmsub]'), ap = e.target.closest('[data-applyh]');
    if (rm) { subList.splice(subList.indexOf(rm.dataset.rmsub), 1); drawSubs(); }
    if (ap) { (RBY[ap.dataset.applyh].h || []).forEach(function (h) { if (hList.indexOf(h) === -1) hList.push(h); }); drawChips(); drawSubs(); }
  });
  form.htext.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('#ev-hadd').click(); } });
  form.htext.addEventListener('paste', function () { setTimeout(function () { if (parseH(form.htext.value).length > 1) $('#ev-hadd').click(); }, 0); });
  $('#ev-chips').addEventListener('click', function (e) { var b = e.target.closest('[data-h]'); if (b) { hList.splice(hList.indexOf(b.dataset.h), 1); drawChips(); } });
  $('#ev-cancel').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.htext.value.trim()) $('#ev-hadd').click();
    var proc = form.type.value === 'procede';
    if (proc && !form.name.value.trim()) form.name.value = PROCEDES[form.procede.value].label;
    if (!form.name.value.trim()) { $('#ev-form-err').textContent = 'Indiquez le nom du produit.'; $('#ev-form-err').hidden = false; form.name.focus(); return; }
    var p = { id: form.dataset.id ? +form.dataset.id : S.next++, name: form.name.value.trim(), type: form.type.value, h: proc ? [] : hList.slice(), freq: +form.freq.value, poste: form.poste.value.trim(), nb: form.nb.value ? Math.max(0, parseInt(form.nb.value, 10) || 0) : '', proc: +form.proc.value, prot: +form.prot.value };
    p.subs = proc ? [] : subList.slice();
    S.refSeen = S.refSeen || {}; p.subs.forEach(function (id) { if (RBY[id]) S.refSeen[id] = RBY[id].fp; });
    if (proc) { var d = PROCEDES[form.procede.value]; p.procede = form.procede.value; p.intensite = +form.intensite.value; p.etat = d.etat; p.pulv = d.pulv || 2; p.vol = d.vol || ''; }
    else { p.etat = form.etat.value; p.teb = form.teb.value; p.vol = form.vol.value; p.pulv = +form.pulv.value; p.qte = form.qte.value ? +String(form.qte.value).replace(',', '.') : ''; p.unite = form.unite.value; }
    var i = S.products.findIndex(function (x) { return x.id === p.id; });
    if (i >= 0) S.products[i] = p; else S.products.push(p);
    UI.sel = p.id;
    dlg.close(); render(); announce(i >= 0 ? 'Produit modifié.' : 'Produit ajouté.');
  });


  // ---------- Navigation et actions ----------
  var VIEWS = ['dash', 'inv', 'hier', 'inh', 'plan', 'cmr', 'sal', 'export', 'set', 'ref'];
  function announce(t) { $('#ev-live').textContent = t; }
  function showView(id, scroll) {
    if (VIEWS.indexOf(id) < 0) id = 'inv';
    UI.view = id;
    $$('.app-nav-i').forEach(function (b) { var on = b.dataset.view === id; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    $$('.ev-view').forEach(function (v) { v.hidden = v.id !== 'v-' + id; });
    render();
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
    if (scroll) { var a = $('#outil'); if (a.getBoundingClientRect().top < 0 || scroll === 'force') a.scrollIntoView({ block: 'start' }); }
    var cur = $('.app-nav-i.on'); if (cur && cur.scrollIntoView && window.matchMedia('(max-width: 899px)').matches) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  function openDetail(id) { UI.sel = +id; UI.dtab = 'syn'; renderDrawer(); $$('tr.is-row').forEach(function (tr) { tr.classList.toggle('is-sel', +tr.dataset.open === UI.sel); }); var c = $('.dr-close'); if (c) c.focus({ preventScroll: true }); }
  function closeDetail() { var id = UI.sel; UI.sel = null; renderDrawer(); $$('tr.is-sel').forEach(function (tr) { tr.classList.remove('is-sel'); }); var b = $('.ev-open[data-open="' + id + '"]'); if (b) b.focus({ preventScroll: true }); }
  function download(name, data, type) {
    var blob = new Blob([data], { type: type }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function slug() { return S.site ? '-' + S.site.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : ''; }
  function printAll(only) {
    var prev = UI.view;
    document.body.classList.toggle('ev-print-view', !!only);
    if (!only) ['dash', 'inv', 'hier', 'inh', 'plan', 'cmr', 'sal'].forEach(function (v) { UI.view = v; ({ dash: renderDash, inv: renderInv, hier: renderHier, inh: renderInh, plan: renderPlan, cmr: renderCmr, sal: renderSal })[v](); });
    UI.view = prev;
    window.print();
    document.body.classList.remove('ev-print-view');
  }

  document.addEventListener('click', function (e) {
    var menu = e.target.closest('.ev-menu');
    $$('.ev-menu[open]').forEach(function (m) { if (m !== menu) m.open = false; });
    var go = e.target.closest('[data-go]');
    if (go) { e.preventDefault(); showView(go.dataset.go, 'force'); return; }
    var nv = e.target.closest('.app-nav-i');
    if (nv) { showView(nv.dataset.view, true); return; }
    var dt = e.target.closest('[data-dtab]');
    if (dt) { UI.dtab = dt.dataset.dtab; renderDrawer(); var nb = $('[data-dtab="' + UI.dtab + '"]'); if (nb) nb.focus(); return; }
    var pg = e.target.closest('[data-page]');
    if (pg) { UI.page += +pg.dataset.page; render(); return; }
    var t = e.target.closest('[data-act], [data-edit], [data-del]');
    if (!t) {
      var row = e.target.closest('[data-open]');
      if (row && !e.target.closest('input, select, a')) openDetail(row.dataset.open);
      return;
    }
    if (t.closest('.ev-menu')) t.closest('.ev-menu').open = false;
    if (t.dataset.edit) { openForm(S.products.filter(function (p) { return p.id === +t.dataset.edit; })[0]); return; }
    if (t.dataset.del) { var p = S.products.filter(function (x) { return x.id === +t.dataset.del; })[0]; if (p && confirm('Supprimer « ' + p.name + ' » de l\'inventaire ?')) { S.products = S.products.filter(function (x) { return x !== p; }); UI.sel = null; render(); announce('Produit supprimé.'); } return; }
    var act = t.dataset.act;
    if (act === 'add') openForm(null, 'produit');
    else if (act === 'addproc') openForm(null, 'procede');
    else if (act === 'demo') { if (!S.products.length || confirm('Remplacer l\'évaluation actuelle par l\'exemple ?')) { S = demo(); UI.sel = null; showView('inv', 'force'); } }
    else if (act === 'clear') { if (confirm('Effacer toutes les données de cette évaluation ? Cette action est définitive.')) { S = blank(); UI.sel = null; render(); } }
    else if (act === 'csv') exportCsv();
    else if (act === 'json') download('evaluation-risque-chimique' + slug() + '.json', JSON.stringify({ format: 'vbs-eval', version: 1, exporte_le: new Date().toISOString(), data: S }, null, 1), 'application/json');
    else if (act === 'print') printAll(false);
    else if (act === 'printview') printAll(true);
    else if (act === 'close') closeDetail();
    else if (act === 'ackref') { S.refSeen = S.refSeen || {}; S.products.forEach(function (p) { subsOf(p).forEach(function (x) { S.refSeen[x.id] = x.fp; }); }); save(); $('#ev-alert').hidden = true; }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && UI.sel != null && !dlg.open) { closeDetail(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('tr.is-row')) { e.preventDefault(); openDetail(e.target.dataset.open); }
  });
  document.addEventListener('input', function (e) {
    var u = e.target.dataset && e.target.dataset.ui;
    if (u === 'q' || u === 'rq') { UI[u] = e.target.value; UI.page = 0; var pos = e.target.selectionStart; render(); var inp = $('[data-ui="' + u + '"]'); if (inp) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (x) {} } }
    else if (u === 'site' || e.target.id === 'ev-site') { S.site = e.target.value; if (u === 'site') $('#ev-site').value = S.site; save(); }
  });
  document.addEventListener('change', function (e) {
    var d = e.target.dataset || {};
    if (d.ui && d.ui !== 'q' && d.ui !== 'rq' && d.ui !== 'site') { UI[d.ui] = d.ui === 'per' ? +e.target.value : e.target.value; UI.page = 0; render(); return; }
    if (d.actFile === 'import') {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try { var j = JSON.parse(rd.result), data = j && j.data; if (!data || !Array.isArray(data.products)) throw 0; if (!confirm('Remplacer l\'évaluation actuelle par « ' + f.name + ' » ?')) return; S = data; S.actions = S.actions || {}; S.next = S.next || S.products.reduce(function (m, p) { return Math.max(m, p.id + 1); }, 1); UI.sel = null; showView('inv', 'force'); announce('Sauvegarde restaurée.'); }
        catch (x) { alert('Ce fichier n\'est pas une sauvegarde de l\'outil d\'évaluation.'); }
      };
      rd.readAsText(f); e.target.value = ''; return;
    }
    if (d.k) {
      S.actions[d.k] = S.actions[d.k] || {}; S.actions[d.k][d.f] = e.target.value; save();
      var tr = e.target.closest('.ev-action'); if (tr && d.f === 'statut') tr.classList.toggle('done', e.target.value === 'fait');
      renderKpis();
      if (UI.view === 'plan' && d.f === 'statut' && e.target.closest('.app-drawer')) renderPlan();
    }
  });

  function csvCell(v) { v = String(v == null ? '' : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function exportCsv() {
    var rows = compute(), lines = [['Site', 'Produit ou procédé', 'Type', 'Substances (CAS)', 'VLEP contraignantes (8 h)', 'Tableaux maladies professionnelles', 'Mentions H', 'CMR', 'Classe de danger', 'Quantité par an', 'Unité', 'Fréquence', 'Poste', 'Salariés', 'Priorité', 'Score risque potentiel', 'Risque inhalation', 'Score inhalation', 'Actions']];
    rows.forEach(function (r) {
      var p = r.p;
      lines.push([S.site, p.name, p.type === 'procede' ? 'Procédé' : 'Produit', r.subs.map(function (x) { return x.nom + (x.cas && x.cas[0] ? ' (' + x.cas[0] + ')' : ''); }).join(' | '), r.vleps.map(function (x) { return x.nom + ' : ' + vlepTxt(x, true); }).join(' | '), r.mp.join(', '), (p.h || []).join(' '), r.cmr === 'cmr' ? 'Oui' : r.cmr === 'susp' ? 'Suspecté' : 'Non', r.dc, p.qte || '', p.type === 'procede' ? '' : p.unite, FREQ_S[r.fc - 1], p.poste, p.nb, PRIO[r.prio][0], Math.round(r.pot), INH[r.inh][0], +r.sinh.toPrecision(3), actionsFor(r).map(function (a) { var st = S.actions['g:' + (a[0] === 'fds' ? 'fds:' + a[1] : a[0])] || {}; return a[1] + (st.statut === 'fait' ? ' (fait)' : st.statut === 'cours' ? ' (en cours)' : ''); }).join(' | ')]);
    });
    download('evaluation-risque-chimique' + slug() + '.csv', '﻿' + lines.map(function (l) { return l.map(csvCell).join(';'); }).join('\n'), 'text/csv;charset=utf-8');
  }

  function demo() {
    var d = blank(); d.site = 'Atelier de démonstration';
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

  // Démarrage
  loadRef();
  var h0 = (location.hash || '').slice(1);
  showView(VIEWS.indexOf(h0) >= 0 ? h0 : (S.products.length ? 'dash' : 'inv'));
})();
