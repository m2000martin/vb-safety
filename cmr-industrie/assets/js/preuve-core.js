// VB Safety · Dossier de preuve CMR : règles et calculs, sans interface.
// Utilisé par dossier.html (navigateur) et par les tests automatiques (_tests/, Node).
// Aucune donnée médicale : pas de résultat biologique, pas d'état de grossesse, pas de contenu d'avis médical.
// Référentiel juridique : articles lus sur le Code du travail numérique le 3 octobre 2026, à relire sur Légifrance.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PREUVE = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var REFERENTIEL = { date: '2026-10-03', source: 'Code du travail numérique (ministère du Travail)', relecture: 'À relire sur Légifrance par un juriste en droit social avant tout usage contentieux' };
  // Date à partir de laquelle la liste nominative est exigible (décret n° 2024-307 du 4 avril 2024)
  var LISTE_EXIGIBLE = '2024-07-05';

  // ------------------------------------------------------------------ régimes (bloc A, M1)
  var REGIMES = {
    cmr: { label: 'Régime CMR', detail: 'Substance ou mélange CMR de catégorie 1A ou 1B, ou procédé listé par l\'arrêté du 26 octobre 2020', art: 'Art. R. 4412-59 et R. 4412-60' },
    cmr2: { label: 'Agent chimique dangereux (CMR catégorie 2)', detail: 'Suspecté cancérogène, mutagène ou reprotoxique : régime général des agents chimiques dangereux', art: 'Art. R. 4412-1 et suivants' },
    acd: { label: 'Agent chimique dangereux', detail: 'Régime général des agents chimiques dangereux', art: 'Art. R. 4412-1 et suivants' },
    aucun: { label: 'Non classé dangereux pour la santé', detail: 'Aucune mention de danger santé déclarée', art: '' }
  };
  var PARTICULIERS = {
    plomb: { label: 'Plomb', detail: 'Règles propres au plomb (deux vestiaires, douches, repas en tenue de ville) ; tout poste exposé déclenche le suivi individuel renforcé depuis le décret du 8 avril 2026', art: 'Art. R. 4412-156 et suivants' },
    amiante: { label: 'Amiante', detail: 'Section propre à l\'amiante, hors du périmètre de cet outil', art: 'Art. R. 4412-94 et suivants' }
  };
  var H_CMR = ['H340', 'H350', 'H360'];
  var H_CMR2 = ['H341', 'H351', 'H361', 'H362'];

  function nrm(v) { return String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function hList(p) { return (p && p.h) || []; }

  // Régime applicable à un produit ou procédé de l'évaluation (même règle que le moteur d'évaluation)
  function regimeOf(p) {
    if (!p) return 'aucun';
    if (p.type === 'procede') return 'cmr';
    var h = hList(p);
    if (h.some(function (c) { return H_CMR.indexOf(c) !== -1; })) return 'cmr';
    if (h.some(function (c) { return H_CMR2.indexOf(c) !== -1; })) return 'cmr2';
    if (h.some(function (c) { return /^(H3\d\d|EUH0(66|70))$/.test(c); })) return 'acd';
    return 'aucun';
  }
  // Régimes particuliers repérés d'après le nom du produit et de ses substances
  function particuliersOf(p, subsNames) {
    var txt = nrm([p && p.name].concat(subsNames || [], (p && p.subs) || []).join(' ')), out = [];
    if (/\bplomb\b|7439-92-1/.test(txt)) out.push('plomb');
    if (/amiante|1332-21-4|chrysotile|crocidolite|amosite/.test(txt)) out.push('amiante');
    return out;
  }
  function reprotoxique(p) { return hList(p).indexOf('H360') !== -1; }

  // Agents de l'évaluation, avec leur régime, et les choix confirmés par l'employeur (P.agents)
  function agents(S, P, subsNamesOf) {
    return ((S && S.products) || []).map(function (p) {
      var k = 'p:' + p.id, conf = (P && P.agents && P.agents[k]) || {};
      var auto = regimeOf(p), part = particuliersOf(p, subsNamesOf ? subsNamesOf(p) : []);
      return { key: k, p: p, name: p.name, type: p.type === 'procede' ? 'procede' : 'produit', regimeAuto: auto, regime: conf.regime || auto, particuliers: part, repro: reprotoxique(p), poste: p.poste || '', confirme: conf.date || '', auteur: conf.auteur || '', note: conf.note || '' };
    });
  }
  function agentsCmr(S, P, f) { return agents(S, P, f).filter(function (a) { return a.regime === 'cmr'; }); }

  // ------------------------------------------------------------------ substitution et treize mesures (bloc B, M3)
  // Art. R. 4412-70 : mesures applicables dans tous les cas (libellés résumés, numérotation de l'article)
  var MESURES_13 = [
    'Limitation des quantités de l\'agent sur le lieu de travail',
    'Limitation du nombre de travailleurs exposés ou susceptibles de l\'être',
    'Processus de travail et mesures techniques évitant ou réduisant le dégagement de l\'agent',
    'Évacuation de l\'agent (captage à la source, art. R. 4222-12 et R. 4222-13)',
    'Méthodes de mesure appropriées, notamment pour la détection précoce des expositions anormales',
    'Procédures et méthodes de travail appropriées',
    'Protection collective et, si l\'exposition ne peut être évitée autrement, protection individuelle',
    'Mesures d\'hygiène, notamment le nettoyage régulier des sols, murs et autres surfaces',
    'Information des travailleurs',
    'Délimitation des zones à risque et signalisation, y compris l\'interdiction de fumer',
    'Dispositifs pour les cas d\'urgence pouvant entraîner des expositions anormalement élevées',
    'Stockage, manipulation et transport sûrs, notamment en récipients hermétiques clairement étiquetés',
    'Collecte, stockage et évacuation sûrs des déchets'
  ];
  var CONCLUSIONS = {
    substitue: 'Agent supprimé ou remplacé par un agent moins dangereux',
    'en-cours': 'Substitution en cours d\'étude ou de mise en œuvre',
    impossible: 'Substitution techniquement impossible à ce jour'
  };
  function substState(P, key) {
    var s = (P && P.subst && P.subst[key]) || {}, m = s.mesures || {}, done = 0;
    for (var i = 1; i <= 13; i++) if (m[i] && m[i].statut) done++;
    var b1 = !!(s.conclusion && s.date && (s.alternatives || s.conclusion === 'substitue'));
    var needClos = s.conclusion && s.conclusion !== 'substitue';
    var b2 = !needClos || !!(s.clos && (s.clos === 'oui' || s.closJustif));
    var needRed = needClos && s.clos !== 'oui';
    var b3 = !needRed || !!s.reduction;
    return { s: s, b1: b1, b2: b2, b3: b3, b4: done === 13, mesuresFaites: done, needClos: !!needClos, needRed: !!needRed };
  }

  // ------------------------------------------------------------------ liste nominative (bloc E, M4)
  var CONTRATS = { cdi: 'CDI', cdd: 'CDD', interim: 'Intérimaire', apprenti: 'Apprenti ou alternant', autre: 'Autre' };
  var VOIES = { inhalation: 'Inhalation', cutanee: 'Contact cutané', ingestion: 'Ingestion accidentelle' };
  var DUREES = ['', 'Moins de 30 min par jour', '30 min à 2 h par jour', '2 à 6 h par jour', 'Plus de 6 h par jour'];
  var DEGRES = ['', 'Élevé (estimé)', 'Modéré (estimé)', 'Faible (estimé)'];
  // Champs autorisés : la liste ne contient jamais de donnée médicale
  var CHAMPS_SALARIE = ['id', 'nom', 'prenom', 'poste', 'contrat', 'agence', 'entree', 'sortie'];
  var CHAMPS_EXPO = ['id', 'sal', 'agent', 'du', 'au', 'voies', 'duree', 'degre', 'source', 'mesure'];

  function blank() { return { v: 1, agents: {}, revisions: [], subst: {}, salaries: [], expos: [], versions: [], envois: [], pieces: {}, next: 1 }; }
  function normalize(P) {
    var b = blank(); P = P && typeof P === 'object' ? P : {};
    Object.keys(b).forEach(function (k) { if (P[k] == null || typeof P[k] !== typeof b[k] || Array.isArray(P[k]) !== Array.isArray(b[k])) P[k] = b[k]; });
    P.salaries = P.salaries.map(function (s) { return pick(s, CHAMPS_SALARIE); });
    P.expos = P.expos.map(function (e) { return pick(e, CHAMPS_EXPO); });
    return P;
  }
  function pick(o, keys) { var r = {}; keys.forEach(function (k) { if (o && o[k] != null) r[k] = o[k]; }); return r; }

  function fullName(s) { return [String(s.nom || '').toUpperCase(), s.prenom || ''].join(' ').trim() || 'Salarié sans nom'; }
  function inPeriod(e, onDate) { return (!e.du || e.du <= onDate) && (!e.au || e.au >= onDate); }

  // Lignes de la liste : une ligne par salarié et par agent, avec nature, durée et degré « connus ou non »
  function listeRows(S, P, agentInfo) {
    var byKey = {}; (agentInfo || []).forEach(function (a) { byKey[a.key] = a; });
    var rows = [];
    P.expos.forEach(function (e) {
      var s = P.salaries.filter(function (x) { return x.id === e.sal; })[0], a = byKey[e.agent];
      if (!s || !a || a.regime !== 'cmr') return;
      rows.push({
        sal: s.id, nom: fullName(s), contrat: CONTRATS[s.contrat] || '', agence: s.agence || '', poste: s.poste || a.poste || '',
        agent: a.name, agentKey: a.key, agentType: a.type === 'procede' ? 'Procédé cancérogène' : 'Substance ou mélange CMR',
        nature: (e.voies && e.voies.length) ? e.voies.map(function (v) { return VOIES[v] || v; }).join(', ') : 'Non connue',
        duree: e.duree ? DUREES[+e.duree] || String(e.duree) : 'Non connue',
        degre: e.mesure ? 'Mesuré : ' + e.mesure : e.degre ? DEGRES[+e.degre] || String(e.degre) : 'Non connu',
        du: e.du || '', au: e.au || ''
      });
    });
    rows.sort(function (x, y) { return x.nom.localeCompare(y.nom, 'fr') || x.agent.localeCompare(y.agent, 'fr'); });
    return rows;
  }
  // Empreinte de la liste : sert à savoir si elle a changé depuis la dernière version arrêtée
  function fingerprint(rows) {
    var str = JSON.stringify(rows.map(function (r) { return [r.sal, r.nom, r.contrat, r.poste, r.agentKey, r.nature, r.duree, r.degre, r.du, r.au]; })), h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  // Version arrêtée : copie figée, jamais modifiée ensuite
  function freezeVersion(P, rows, date, auteur, motif) {
    var n = P.versions.length ? P.versions[P.versions.length - 1].n + 1 : 1;
    var v = { n: n, date: date, auteur: auteur || '', motif: motif || '', fp: fingerprint(rows), rows: JSON.parse(JSON.stringify(rows)) };
    P.versions.push(v);
    return v;
  }
  function lastVersion(P) { return P.versions.length ? P.versions[P.versions.length - 1] : null; }
  function changedSince(P, rows) { var v = lastVersion(P); return !v || v.fp !== fingerprint(rows); }

  // Trois vues (art. R. 4412-93-2 et R. 4412-93-4)
  function extraitIndividuel(rows, salId) { return rows.filter(function (r) { return r.sal === salId; }); }
  function anonyme(rows) {
    var codes = {}, n = 0;
    rows.forEach(function (r) { if (!codes[r.sal]) codes[r.sal] = 'Salarié ' + (++n); });
    return rows.map(function (r) { return { code: codes[r.sal], poste: r.poste, agent: r.agent, agentType: r.agentType, nature: r.nature, duree: r.duree, degre: r.degre, du: r.du, au: r.au }; });
  }
  function interimaires(P) { return P.salaries.filter(function (s) { return s.contrat === 'interim'; }); }

  // Suggestion : les agents CMR du poste du salarié
  function suggestions(P, sal, agentInfo) {
    var have = {}; P.expos.forEach(function (e) { if (e.sal === sal.id) have[e.agent] = 1; });
    var poste = nrm(sal.poste).trim();
    return (agentInfo || []).filter(function (a) { return a.regime === 'cmr' && !have[a.key] && poste && nrm(a.poste).trim() === poste; });
  }
  // Valeurs proposées à partir de l'évaluation (durée et degré estimés)
  function exposFromEval(a, row) {
    var p = a.p || {}, voies = ['inhalation'];
    if ((row && row.peau) || (p.type === 'procede' && p.procede === 'huiles')) voies.push('cutanee');
    if (p.type === 'procede' && p.procede === 'huiles') voies = ['cutanee'];
    return { voies: voies, duree: +p.freq || '', degre: row ? row.inh : '', source: 'estimation' };
  }

  // ------------------------------------------------------------------ révisions datées (A3, M2)
  function revisionSummary(S, rowsEval) {
    var cmr = (rowsEval || []).filter(function (r) { return r.cmr === 'cmr'; });
    return { produits: ((S && S.products) || []).length, cmr: cmr.length, prioritesFortes: (rowsEval || []).filter(function (r) { return Math.min(r.prio, r.inh) === 1; }).length };
  }

  // ------------------------------------------------------------------ les 45 obligations (M12)
  // [n°, obligation, articles, pièce, fréquence]
  var BLOCS = {
    A: 'Qualifier et évaluer', B: 'Supprimer, substituer, réduire', C: 'Mesurer et respecter les valeurs limites', D: 'Informer et former',
    E: 'Tracer nominativement (depuis 2024)', F: 'Déclencher le suivi médical', G: 'Protéger certains travailleurs', H: 'Entreprises extérieures, déchets, représentants du personnel'
  };
  var OBLIGATIONS = [
    ['A1', 'Identifier les agents et procédés relevant du régime CMR', 'R. 4412-59, R. 4412-60', 'Inventaire avec catégorie et régime', 'À chaque nouveau produit ou procédé'],
    ['A2', 'Évaluer la nature, le degré et la durée de l\'exposition, toutes voies comprises', 'R. 4412-61, R. 4412-65', 'Évaluation par activité', 'Avant toute activité nouvelle'],
    ['A3', 'Renouveler l\'évaluation', 'R. 4412-62', 'Révisions datées', '« Régulièrement » et à chaque changement'],
    ['A4', 'Consigner les résultats dans le DUERP', 'R. 4412-64', 'Chapitre risque chimique du DUERP', 'Permanent'],
    ['A5', 'Tenir le DUERP à jour, garder toutes ses versions, le transmettre au service de santé', 'R. 4121-2, R. 4121-4', 'Versions datées, preuve de transmission', 'Chaque année dès 11 salariés ; versions gardées 40 ans'],
    ['A6', 'Définir les actions de prévention', 'L. 4121-3-1', 'Liste d\'actions, ou programme annuel dès 50 salariés', 'À chaque mise à jour'],
    ['A7', 'Déposer le DUERP sur un portail national', 'L. 4121-3-1', 'Aucune : le portail n\'a jamais été construit', 'Sans objet à ce jour'],
    ['B1', 'Rechercher la substitution et consigner le résultat dans le DUERP', 'R. 4412-66', 'Étude de substitution par agent', 'À chaque usage exposant'],
    ['B2', 'À défaut, travailler en système clos', 'R. 4412-68', 'Justification', ''],
    ['B3', 'À défaut, réduire l\'exposition au plus bas techniquement possible', 'R. 4412-69', 'Mesures et niveaux résiduels', ''],
    ['B4', 'Appliquer les treize mesures', 'R. 4412-70', 'Grille en treize points avec justificatif', 'Permanent'],
    ['B5', 'Hygiène, vêtements et équipements, information du prestataire de nettoyage', 'R. 4412-72, R. 4412-73', 'Registre d\'entretien, consigne écrite', 'Après chaque utilisation'],
    ['B6', 'Restreindre et signaler les zones à risque', 'R. 4412-74', 'Zones et personnes autorisées', 'Permanent'],
    ['B7', 'Encadrer la maintenance à exposition accrue', 'R. 4412-75', 'Procédure écrite, avis du médecin du travail et du CSE', 'Avant chaque type d\'opération'],
    ['B8', 'Vérifier les protections collectives', 'R. 4412-23', 'Registre de vérification', '« Régulièrement »'],
    ['B9', 'Prévoir par écrit les mesures en cas d\'accident', 'R. 4412-33', 'Consignes d\'alarme et d\'évacuation', 'Préalable'],
    ['B10', 'Régimes particuliers : plomb, amiante', 'R. 4412-156, R. 4412-120', 'Selon le régime', ''],
    ['C1', 'Mesurer l\'exposition dans l\'air', 'R. 4412-76', 'Résultats de mesurage', '« De façon régulière »'],
    ['C2', 'Faire contrôler les valeurs limites par un organisme accrédité', 'R. 4412-76, R. 4724-8', 'Rapport de contrôle', 'Au moins une fois par an'],
    ['C3', 'Communiquer les résultats', 'R. 4412-79', 'Preuve de transmission au médecin du travail et au CSE', 'Après chaque mesurage'],
    ['C4', 'En cas de dépassement d\'une valeur contraignante, arrêter le travail au poste', 'R. 4412-77, R. 4412-78', 'Constat, actions correctives, nouvelle mesure', 'Immédiat'],
    ['C5', 'Traiter une alerte du médecin du travail sur une valeur biologique', 'R. 4412-82', 'Fiche de traitement de l\'alerte (reçue sous forme non nominative)', 'À chaque alerte'],
    ['C6', 'Appliquer la table des valeurs limites en vigueur', 'R. 4412-149, R. 4412-152', 'Table datée', 'Valeurs modifiées en 2024 et 2026, bascules prévues jusqu\'en 2029'],
    ['D1', 'Établir une notice par poste exposé', 'R. 4412-39', 'Notice de poste', 'Actualisée au besoin'],
    ['D2', 'Tenir un dossier d\'information en sept rubriques', 'R. 4412-86, R. 4412-93', 'Dossier d\'information CMR', 'Permanent'],
    ['D3', 'Former et informer, avec le CSE et le médecin du travail', 'R. 4412-87, R. 4412-88', 'Programme, feuilles de présence, recyclages', '« Répétées régulièrement »'],
    ['D4', 'Informer sur les effets sur la fertilité, l\'embryon et l\'allaitement', 'R. 4412-89', 'Contenu de l\'information', ''],
    ['D5', 'Signaler les CMR, étiqueter les récipients', 'R. 4412-90', 'Étiquetage, signalisation', 'Permanent'],
    ['D6', 'Laisser les travailleurs et le CSE vérifier l\'application des règles', 'R. 4412-91', 'Accès aux pièces', 'Sur demande'],
    ['D7', 'Informer des expositions anormales', 'R. 4412-92', 'Notification datée', 'Le plus vite possible'],
    ['E1', 'Établir la liste des travailleurs susceptibles d\'être exposés, avec substances et, si connus, nature, durée et degré', 'R. 4412-93-1', 'Liste nominative datée', 'Exigible depuis le 5 juillet 2024 ; aucune fréquence fixée'],
    ['E2', 'Donner à chaque travailleur ses informations ; tenir une version anonyme pour le CSE', 'R. 4412-93-2', 'Extrait individuel, version anonyme', 'Permanent'],
    ['E3', 'Communiquer la liste et chaque actualisation au service de santé au travail', 'R. 4412-93-3', 'Preuve d\'envoi datée', 'À chaque actualisation'],
    ['E4', 'Pour un intérimaire, transmettre à l\'agence d\'intérim', 'R. 4412-93-4', 'Extrait individuel', 'À la mise à disposition'],
    ['F1', 'Suivi individuel renforcé pour tout travailleur exposé aux CMR, à l\'amiante ou au plomb', 'R. 4624-23, R. 4624-24', 'Avis d\'aptitude', 'Avant l\'affectation'],
    ['F2', 'Renouveler l\'examen', 'R. 4624-28', 'Avis renouvelé', 'Au plus tous les 4 ans, visite intermédiaire à 2 ans'],
    ['F3', 'Motiver par écrit les postes à risque ajoutés par l\'employeur', 'R. 4624-23', 'Liste motivée des postes', 'Chaque année'],
    ['F4', 'Signaler au service de santé la fin d\'exposition, le départ ou la retraite', 'R. 4624-28-2', 'Notification datée, avis au travailleur', 'Sans délai'],
    ['F5', 'Après une maladie professionnelle, faire examiner les travailleurs exposés de façon comparable', 'R. 4412-52', 'Liste des personnes concernées', 'À chaque cas'],
    ['G1', 'Ne pas affecter une femme enceinte ou allaitante à un poste exposant aux reprotoxiques', 'D. 4152-10', 'Contrôle d\'affectation (sans enregistrer l\'état de grossesse)', 'Dès la déclaration'],
    ['G2', 'Ne pas affecter un jeune de moins de 18 ans, sauf dérogation pour la formation', 'D. 4153-17', 'Déclaration de dérogation', 'Dérogation valable 3 ans'],
    ['G3', 'Ne pas employer de CDD ni d\'intérimaire aux 27 travaux listés', 'D. 4154-1', 'Contrôle d\'affectation', 'Avant l\'affectation'],
    ['H1', 'Plan de prévention écrit pour toute entreprise extérieure exposée à des CMR', 'R. 4512-7', 'Plan de prévention signé', 'Avant les travaux'],
    ['H2', 'Gérer les déchets et émettre les bordereaux', 'R. 4412-70', 'Procédure, bordereaux', 'À chaque enlèvement'],
    ['H3', 'Présenter au CSE un rapport annuel sur l\'exposition', 'L. 2312-27', 'Rapport annuel', 'Chaque année']
  ].map(function (o) { return { id: o[0], bloc: o[0].charAt(0), obligation: o[1], articles: o[2], piece: o[3], frequence: o[4] }; });
  function articleLabel(o) { return 'Art. ' + o.articles.replace(/, /g, ' et '); }

  // Où en est chaque obligation : « outil » (pièce produite ici), « manuel » (pièce déclarée par l'employeur),
  // « partiel », « manquant » ou « sans objet ». L'outil n'écrit jamais « conforme ».
  function coverage(ctx) {
    var S = ctx.S || { products: [] }, P = ctx.P, ags = ctx.agents || [], cmr = ags.filter(function (a) { return a.regime === 'cmr'; });
    var rows = ctx.listeRows || [], lastV = lastVersion(P), lastRev = P.revisions.length ? P.revisions[P.revisions.length - 1] : null;
    var auto = {};
    function set(id, statut, detail, date) { auto[id] = { statut: statut, detail: detail, date: date || '' }; }
    var maxDate = function (arr) { return arr.filter(Boolean).sort().pop() || ''; };

    if (!S.products.length) set('A1', 'manquant', 'Aucun produit ni procédé inventorié dans l\'évaluation');
    else if (ags.every(function (a) { return a.confirme; })) set('A1', 'outil', 'Registre des agents : ' + ags.length + ' agent(s), dont ' + cmr.length + ' relevant du régime CMR', maxDate(ags.map(function (a) { return a.confirme; })));
    else set('A1', 'partiel', ags.filter(function (a) { return !a.confirme; }).length + ' agent(s) dont le régime reste à confirmer');

    if (!S.products.length) set('A2', 'manquant', 'Évaluation non commencée');
    else if (lastRev) set('A2', 'outil', 'Évaluation de ' + S.products.length + ' produit(s) ou procédé(s)', lastRev.date);
    else set('A2', 'partiel', 'Évaluation présente mais non datée : enregistrez une révision');
    if (lastRev) set('A3', 'outil', P.revisions.length + ' révision(s) datée(s)', lastRev.date); else set('A3', 'manquant', 'Aucune révision datée');
    if (lastRev && S.exported) set('A4', 'outil', 'Dossier DUERP risque chimique téléchargé', lastRev.date);
    else set('A4', S.products.length ? 'partiel' : 'manquant', 'Téléchargez le dossier DUERP et joignez-le au document unique');
    set('A7', 'sans-objet', 'Le portail national prévu par la loi n\'a jamais été mis en service');

    var states = cmr.map(function (a) { return substState(P, a.key); });
    function bloc(id, test, okTxt, koTxt) {
      if (!cmr.length) { set(id, 'sans-objet', 'Aucun agent relevant du régime CMR'); return; }
      var n = states.filter(test).length;
      if (n === cmr.length) set(id, 'outil', okTxt, maxDate(states.map(function (x) { return x.s.date || x.s.mesuresDate; })));
      else set(id, n ? 'partiel' : 'manquant', (cmr.length - n) + ' agent(s) sur ' + cmr.length + ' : ' + koTxt);
    }
    bloc('B1', function (x) { return x.b1; }, 'Étude de substitution consignée pour chaque agent', 'étude de substitution à consigner');
    bloc('B2', function (x) { return x.b2; }, 'Système clos étudié et justifié', 'système clos à étudier ou justifier');
    bloc('B3', function (x) { return x.b3; }, 'Mesures de réduction et niveau résiduel décrits', 'mesures de réduction à décrire');
    bloc('B4', function (x) { return x.b4; }, 'Grille des treize mesures renseignée', 'grille des treize mesures à compléter');
    if (!ags.some(function (a) { return a.particuliers.length; })) set('B10', 'sans-objet', 'Aucun plomb ni amiante repéré dans l\'inventaire');

    if (!cmr.length) { ['E1', 'E2', 'E3', 'E4'].forEach(function (id) { set(id, 'sans-objet', 'Aucun agent relevant du régime CMR'); }); }
    else {
      if (lastV && !changedSince(P, rows)) set('E1', 'outil', 'Liste version ' + lastV.n + ' : ' + lastV.rows.length + ' ligne(s)', lastV.date);
      else set('E1', lastV ? 'partiel' : 'manquant', lastV ? 'La liste a changé depuis la version ' + lastV.n + ' : arrêtez une nouvelle version' : 'Aucune version datée de la liste');
      if (lastV && lastV.rows.length) set('E2', 'outil', 'Extraits individuels et version anonyme disponibles', lastV.date); else set('E2', 'manquant', 'Arrêtez une version de la liste');
      var spst = lastV ? P.envois.filter(function (e) { return e.dest === 'spst' && e.version === lastV.n; }) : [];
      if (spst.length) set('E3', 'outil', 'Version ' + lastV.n + ' transmise au service de santé au travail', spst[spst.length - 1].date);
      else set('E3', 'manquant', lastV ? 'Transmission de la version ' + lastV.n + ' non enregistrée' : 'Aucune liste à transmettre');
      var it = interimaires(P).filter(function (s) { return rows.some(function (r) { return r.sal === s.id; }); });
      if (!it.length) set('E4', 'sans-objet', 'Aucun intérimaire exposé sur la liste');
      else {
        var sent = it.filter(function (s) { return P.envois.some(function (e) { return e.dest === 'agence' && e.sal === s.id; }); });
        set('E4', sent.length === it.length ? 'outil' : sent.length ? 'partiel' : 'manquant', sent.length + ' extrait(s) transmis sur ' + it.length + ' intérimaire(s) exposé(s)', maxDate(P.envois.filter(function (e) { return e.dest === 'agence'; }).map(function (e) { return e.date; })));
      }
    }

    return OBLIGATIONS.map(function (o) {
      var a = auto[o.id], m = P.pieces[o.id] || {};
      if (a && (a.statut === 'outil' || a.statut === 'sans-objet')) return { o: o, statut: a.statut, detail: a.detail, date: a.date, source: 'outil' };
      if (m.ok) return { o: o, statut: 'manuel', detail: m.lieu ? 'Pièce rangée : ' + m.lieu : 'Pièce déclarée disponible', date: m.date || '', source: 'employeur' };
      if (a) return { o: o, statut: a.statut, detail: a.detail, date: a.date, source: 'outil' };
      return { o: o, statut: 'manquant', detail: 'Pièce non renseignée', date: '', source: '' };
    });
  }
  // Mention de bas de page : ce que la pièce est, jamais un jugement de conformité
  function mention(o, date) {
    var a = o.articles.split(', ');
    return 'Pièce prévue par ' + (a.length > 1 ? 'les articles ' + a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1] : 'l\'article ' + a[0]) + ' du code du travail' + (date ? ', renseignée le ' + frDate(date) : '') + '.';
  }
  function frDate(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : (iso || ''); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  // ------------------------------------------------------------------ fichier de projet
  function packProject(S, P) { return { format: 'vbs-dossier-cmr', version: 1, exporte_le: new Date().toISOString(), evaluation: S, preuve: P }; }
  function unpackProject(j) {
    if (j && j.format === 'vbs-dossier-cmr' && j.evaluation && Array.isArray(j.evaluation.products)) return { S: j.evaluation, P: normalize(j.preuve) };
    if (j && j.format === 'vbs-eval' && j.data && Array.isArray(j.data.products)) return { S: j.data, P: null };
    return null;
  }

  return {
    REFERENTIEL: REFERENTIEL, LISTE_EXIGIBLE: LISTE_EXIGIBLE, REGIMES: REGIMES, PARTICULIERS: PARTICULIERS, MESURES_13: MESURES_13, CONCLUSIONS: CONCLUSIONS,
    CONTRATS: CONTRATS, VOIES: VOIES, DUREES: DUREES, DEGRES: DEGRES, CHAMPS_SALARIE: CHAMPS_SALARIE, CHAMPS_EXPO: CHAMPS_EXPO, BLOCS: BLOCS, OBLIGATIONS: OBLIGATIONS,
    regimeOf: regimeOf, particuliersOf: particuliersOf, agents: agents, agentsCmr: agentsCmr, substState: substState,
    blank: blank, normalize: normalize, fullName: fullName, inPeriod: inPeriod, listeRows: listeRows, fingerprint: fingerprint, freezeVersion: freezeVersion,
    lastVersion: lastVersion, changedSince: changedSince, extraitIndividuel: extraitIndividuel, anonyme: anonyme, interimaires: interimaires,
    suggestions: suggestions, exposFromEval: exposFromEval, revisionSummary: revisionSummary, coverage: coverage, articleLabel: articleLabel, mention: mention,
    frDate: frDate, today: today, packProject: packProject, unpackProject: unpackProject
  };
});
