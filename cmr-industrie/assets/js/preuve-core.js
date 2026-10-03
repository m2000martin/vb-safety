// VB Safety · Dossier de preuve CMR : règles et calculs, sans interface.
// Utilisé par outil/ (navigateur) et par les tests automatiques (_tests/, Node).
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

  function blank() { return { v: 1, entreprise: {}, agents: {}, revisions: [], subst: {}, salaries: [], expos: [], versions: [], envois: [], pieces: {}, fiches: {}, next: 1 }; }
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

  // Pour chaque obligation : explication courte, et où la faire avec VB Safety.
  // vue : écran du dossier de preuve ; lien : autre page de l'outil ; rien : accompagnement VB Safety (demande de devis).
  var AIDE = {
    A1: ['Lister chaque substance, mélange ou procédé présent dans l\'entreprise et dire s\'il relève du régime CMR (catégories 1A ou 1B, ou procédé listé : bois, silice, diesel, HAP, huiles usagées). Les CMR de catégorie 2 restent au régime général des agents chimiques dangereux.', { vue: 'agents' }],
    A2: ['Pour chaque activité exposant à un CMR, évaluer la nature, le degré et la durée de l\'exposition, par inhalation et par contact cutané. Cette évaluation est faite avant toute activité nouvelle.', { ecran: 'A2' }],
    A3: ['Renouveler l\'évaluation régulièrement et à chaque changement : nouveau produit, nouvelle fiche de sécurité, nouveau procédé, résultat de mesurage. Le texte ne fixe pas de délai : l\'employeur choisit sa périodicité et la justifie.', { vue: 'revisions' }],
    A4: ['Les résultats de l\'évaluation figurent dans le document unique (DUERP), avec les éléments qui ont servi à l\'établir : fiches de sécurité, inventaires, mesures.', { ecran: 'A4' }],
    A5: ['Mettre à jour le DUERP au moins une fois par an à partir de 11 salariés, conserver chaque version 40 ans et le transmettre au service de prévention et de santé au travail. Depuis le 27 juin 2026, l\'absence de DUERP expose à une amende administrative pouvant atteindre 4 000 € par travailleur.', { ecran: 'A5' }],
    A6: ['Définir les actions de prévention issues de l\'évaluation. À partir de 50 salariés, elles forment un programme annuel (PAPRIPACT) avec indicateurs, coût et calendrier.', { ecran: 'A6' }],
    A7: ['La loi de 2021 prévoyait un dépôt du DUERP sur un portail national. Ce portail n\'a jamais été mis en service : il n\'y a rien à faire à ce jour.', null],
    B1: ['Remplacer chaque agent CMR par un produit ou un procédé moins dangereux quand c\'est techniquement possible, et consigner le résultat de la recherche dans le DUERP, y compris quand elle échoue.', { vue: 'substitution' }],
    B2: ['Si la substitution est impossible, travailler en système clos. Si le système clos est lui aussi impossible, le justifier par écrit.', { vue: 'substitution' }],
    B3: ['À défaut de système clos, réduire l\'exposition au niveau le plus bas techniquement possible et décrire le niveau résiduel.', { vue: 'substitution' }],
    B4: ['Appliquer dans tous les cas les treize mesures de l\'article R. 4412-70 : quantités, nombre d\'exposés, captage, détection précoce, protections, nettoyage, information, zonage, urgence, récipients étiquetés, déchets…', { vue: 'substitution' }],
    B5: ['Interdire de manger, boire et fumer dans les zones exposées, fournir et entretenir les vêtements de travail et les équipements de protection, et informer par écrit le prestataire qui les nettoie.', null],
    B6: ['Délimiter les zones où l\'on peut être exposé, les signaler et en réserver l\'accès aux personnes autorisées.', null],
    B7: ['Pour les opérations d\'entretien ou de maintenance qui augmentent l\'exposition, rédiger une procédure par type d\'opération, après avis du médecin du travail et du CSE.', null],
    B8: ['Vérifier régulièrement que la ventilation, le captage et les autres protections collectives fonctionnent, et tenir un registre de ces vérifications.', null],
    B9: ['Prévoir par écrit ce qui se passe en cas d\'accident ou d\'incident : alarme, évacuation, premiers gestes, personnes à prévenir.', null],
    B10: ['Le plomb et l\'amiante ont des règles propres. Pour le plomb : deux vestiaires, douches, repas en tenue de ville, et suivi renforcé pour tout poste exposé depuis le décret du 8 avril 2026. L\'amiante relève d\'une section dédiée.', { vue: 'agents' }],
    C1: ['Mesurer régulièrement la concentration des agents CMR dans l\'air des lieux de travail.', null],
    C2: ['Quand une valeur limite existe, faire contrôler son respect par un organisme accrédité au moins une fois par an, et à chaque changement susceptible d\'augmenter l\'exposition. C\'est la seule fréquence chiffrée de toute la réglementation CMR.', null],
    C3: ['Communiquer chaque résultat de mesurage et chaque rapport de contrôle au médecin du travail et au CSE, et les tenir à disposition de l\'inspection du travail et de la Carsat.', null],
    C4: ['En cas de dépassement d\'une valeur limite contraignante, arrêter le travail aux postes concernés jusqu\'à la mise en place de mesures correctives, puis refaire une mesure.', null],
    C5: ['Quand le médecin du travail signale un dépassement d\'une valeur biologique (sous forme non nominative), réévaluer le risque, renforcer les mesures et refaire un contrôle.', null],
    C6: ['Appliquer la table des valeurs limites en vigueur à la date considérée. Plusieurs valeurs ont changé en 2024 et en 2026 (plomb, diesel) et d\'autres changeront jusqu\'en 2029.', null],
    D1: ['Rédiger une notice pour chaque poste exposé : risques, règles d\'hygiène, consignes, équipements à porter.', null],
    D2: ['Tenir un dossier d\'information CMR en sept rubriques (activités, quantités, nombre d\'exposés, mesures, équipements, exposition, substitution) à disposition des travailleurs, du CSE, du médecin du travail et de l\'inspection.', null],
    D3: ['Former et informer les travailleurs exposés, avec le CSE et le médecin du travail, et répéter cette formation régulièrement. Garder le programme et les feuilles de présence.', null],
    D4: ['Informer sur les effets des agents sur la fertilité, l\'embryon et l\'allaitement, et inciter à déclarer tôt une grossesse.', null],
    D5: ['Signaler la présence des agents CMR et étiqueter les récipients, y compris les récipients annexes.', null],
    D6: ['Permettre aux travailleurs et au CSE de vérifier que les règles sont appliquées, en leur donnant accès aux pièces du dossier.', null],
    D7: ['Informer au plus vite les travailleurs, le CSE et le médecin du travail de toute exposition anormale, de ses causes et des mesures prises, et limiter l\'accès à la zone.', null],
    E1: ['Tenir la liste des travailleurs susceptibles d\'être exposés aux agents CMR, avec pour chacun les substances et, s\'ils sont connus, la nature, la durée et le degré de l\'exposition. Exigible depuis le 5 juillet 2024 ; la forme est libre.', { vue: 'salaries' }],
    E2: ['Donner à chaque travailleur accès aux informations qui le concernent, et tenir une version anonyme de la liste à disposition des travailleurs et du CSE.', { vue: 'liste' }],
    E3: ['Communiquer la liste, et chacune de ses actualisations, au service de prévention et de santé au travail, qui la verse au dossier médical. Le texte ne fixe ni format ni canal : gardez la preuve de chaque envoi.', { vue: 'liste' }],
    E4: ['Pour un travailleur intérimaire, transmettre ses informations à l\'entreprise de travail temporaire, qui les communique à son propre service de santé au travail.', { vue: 'liste' }],
    F1: ['Tout travailleur exposé aux CMR, à l\'amiante ou au plomb bénéficie d\'un suivi individuel renforcé, avec un examen d\'aptitude par le médecin du travail avant l\'affectation au poste.', null],
    F2: ['Le suivi renforcé est renouvelé au plus tous les 4 ans, avec une visite intermédiaire au plus tard 2 ans après.', null],
    F3: ['Si l\'employeur ajoute des postes à risque à la liste réglementaire, il motive cet ajout par écrit et l\'actualise chaque année.', null],
    F4: ['Informer sans délai le service de santé au travail de la fin d\'exposition, du départ ou de la retraite d\'un travailleur suivi, et en aviser le travailleur.', null],
    F5: ['Après une maladie professionnelle liée à un CMR, faire examiner tous les travailleurs qui ont subi une exposition comparable.', null],
    G1: ['Ne pas affecter ni maintenir une femme enceinte ou allaitante à un poste exposant à des agents reprotoxiques de catégorie 1A ou 1B. L\'outil ne demande jamais l\'état de grossesse : il vous aide à repérer les postes concernés.', null],
    G2: ['Ne pas affecter un jeune de moins de 18 ans à des travaux exposant à des agents chimiques dangereux, sauf dérogation encadrée pour la formation professionnelle, valable 3 ans.', null],
    G3: ['Ne pas employer de salarié en CDD ni d\'intérimaire aux travaux dangereux listés par le code du travail, sauf dérogation de la DREETS.', null],
    H1: ['Établir un plan de prévention écrit, quelle que soit la durée, pour toute intervention d\'une entreprise extérieure qui expose ses salariés à des CMR.', null],
    H2: ['Collecter, stocker et évacuer les déchets contenant des CMR en sécurité, et émettre les bordereaux de suivi des déchets dangereux.', null],
    H3: ['Présenter chaque année au CSE un rapport qui traite de l\'exposition aux facteurs de risques, dont les agents chimiques dangereux, et du programme de prévention.', null]
  };
  var MINUTES = { A1: 5, A2: 10, A3: 3, A4: 5, A5: 5, A6: 10, A7: 0, B1: 15, B2: 5, B3: 5, B4: 15, B5: 10, B6: 10, B7: 15, B8: 5, B9: 15, B10: 10,
    C1: 5, C2: 5, C3: 5, C4: 10, C5: 10, C6: 5, D1: 20, D2: 20, D3: 10, D4: 10, D5: 10, D6: 5, D7: 10, E1: 15, E2: 3, E3: 3, E4: 3,
    F1: 10, F2: 10, F3: 5, F4: 5, F5: 10, G1: 10, G2: 5, G3: 5, H1: 10, H2: 10, H3: 10 };
  OBLIGATIONS.forEach(function (o) { o.aide = AIDE[o.id][0]; o.faire = AIDE[o.id][1]; o.minutes = MINUTES[o.id]; });
  function articleLabel(o) { return 'Art. ' + o.articles.replace(/, /g, ' et '); }


  // ------------------------------------------------------------------ outils par obligation (formulaires et registres)
  // Chaque fiche produit un justificatif téléchargeable. Types : t texte, d date, x texte long, s liste, tab tableau (colonnes).
  // Références : démarche INRS (citée et liée, jamais recopiée) et articles du code du travail.
  var INRS = { nom: 'INRS · agents CMR', url: 'https://www.inrs.fr/risques/cmr-agents-chimiques/ce-qu-il-faut-retenir.html' };
  var SEIRICH = { nom: 'Seirich (INRS), logiciel gratuit d\'évaluation du risque chimique', url: 'https://www.seirich.fr' };
  function T(cols) { return { k: 'lignes', type: 'tab', cols: cols }; }
  var FICHES = {
    A2: { doc: 'Évaluation de l\'exposition par activité', ref: SEIRICH, eval: 'expo', champs: [{ k: 'date', type: 'd', l: 'Évaluation réalisée le' }, { k: 'par', type: 't', l: 'Réalisée par' }, { k: 'complement', type: 'x', l: 'Compléments : contact cutané, activités ponctuelles, maintenance, nettoyage' }] },
    A4: { doc: 'Chapitre risque chimique et CMR du DUERP', eval: 'chapitre', champs: [{ k: 'integre', type: 'd', l: 'Intégré au document unique le' }, { k: 'version', type: 't', l: 'Version du DUERP concernée' }, { k: 'emplacement', type: 't', l: 'Où se trouve le DUERP (classeur, logiciel, intranet)' }] },
    A5: { doc: 'Registre des versions du DUERP', ref: SEIRICH, champs: [T(['Version', 'Date', 'Motif de la mise à jour', 'Transmis au SPST le', 'Moyen de transmission'])] },
    A6: { doc: 'Programme d\'actions de prévention', champs: [{ k: 'cadre', type: 's', l: 'Cadre', o: ['Liste d\'actions consignée dans le DUERP (moins de 50 salariés)', 'Programme annuel de prévention, PAPRIPACT (50 salariés et plus)'] }, T(['Action', 'Responsable', 'Échéance', 'Coût estimé', 'Indicateur de suivi'])] },
    B5: { doc: 'Registre d\'hygiène, vêtements et équipements', champs: [{ k: 'consignes', type: 'x', l: 'Consignes affichées (interdiction de manger, boire et fumer en zone, vestiaires)' }, { k: 'prestataire', type: 't', l: 'Prestataire de nettoyage des vêtements' }, { k: 'infoPresta', type: 'd', l: 'Information écrite du prestataire le' }, T(['Date', 'Équipement ou vêtement', 'Opération (fourniture, nettoyage, vérification)', 'Fait par'])] },
    B6: { doc: 'Registre des zones à risque', champs: [T(['Zone', 'Agents CMR présents', 'Signalisation en place', 'Personnes autorisées'])] },
    B7: { doc: 'Procédures de maintenance à exposition accrue', champs: [T(['Opération', 'Mesures de protection', 'Avis du médecin du travail le', 'Avis du CSE le', 'Procédure écrite (référence)'])] },
    B8: { doc: 'Registre de vérification des protections collectives', champs: [T(['Date', 'Installation (captage, ventilation…)', 'Résultat', 'Vérifié par', 'Prochaine vérification'])] },
    B9: { doc: 'Consignes en cas d\'accident ou d\'incident', champs: [{ k: 'alarme', type: 'x', l: 'Alarme et alerte' }, { k: 'evacuation', type: 'x', l: 'Évacuation et mise en sécurité de la zone' }, { k: 'secours', type: 'x', l: 'Premiers secours et décontamination' }, { k: 'contacts', type: 'x', l: 'Personnes et services à prévenir' }, { k: 'affiche', type: 'd', l: 'Consignes affichées le' }] },
    B10: { doc: 'Mesures propres au plomb', champs: [{ k: 'vestiaires', type: 'x', l: 'Vestiaires séparés, douches, repas en tenue de ville' }, { k: 'postes', type: 'x', l: 'Postes exposés au plomb (suivi renforcé depuis le décret du 8 avril 2026)' }] },
    C1: { doc: 'Registre des mesurages de l\'exposition', ref: INRS, champs: [T(['Date', 'Poste ou groupe d\'exposition', 'Agent', 'Résultat', 'Laboratoire', 'Rapport n°'])] },
    C2: { doc: 'Échéancier des contrôles des valeurs limites', ref: INRS, champs: [{ k: 'prochain', type: 'd', l: 'Prochain contrôle annuel prévu le' }, T(['Date du contrôle', 'Organisme accrédité', 'Groupe d\'exposition', 'Agent', 'Résultat / valeur limite', 'Rapport n°'])] },
    C3: { doc: 'Registre de communication des résultats', champs: [T(['Rapport ou mesurage du', 'Transmis au médecin du travail le', 'Transmis au CSE le', 'Moyen'])] },
    C4: { doc: 'Fiches de dépassement de valeur limite', champs: [T(['Date', 'Poste', 'Valeur mesurée / valeur limite', 'Arrêt du travail le', 'Mesures correctives', 'Nouvelle mesure le'])] },
    C5: { doc: 'Traitement des alertes du médecin du travail', champs: [T(['Alerte reçue le', 'Objet (forme non nominative)', 'Réévaluation du risque', 'Mesures prises', 'Contrôle refait le'])] },
    C6: { doc: 'Table des valeurs limites appliquée', champs: [{ k: 'version', type: 't', l: 'Version de la table appliquée (date de mise à jour)' }, { k: 'verifie', type: 'd', l: 'Vérifiée le' }, { k: 'evolutions', type: 'x', l: 'Évolutions à venir suivies (bascules 2026-2029)' }] },
    D1: { doc: 'Notices de poste', ref: INRS, champs: [T(['Poste', 'Risques', 'Règles d\'hygiène', 'Consignes', 'Équipements de protection', 'Mise à jour le'])] },
    D2: { doc: 'Dossier d\'information CMR (sept rubriques)', champs: [{ k: 'r1', type: 'x', l: '1. Activités et procédés, raisons de l\'emploi des agents CMR' }, { k: 'r2', type: 'x', l: '2. Quantités fabriquées ou utilisées' }, { k: 'r3', type: 'x', l: '3. Nombre de travailleurs exposés' }, { k: 'r4', type: 'x', l: '4. Mesures de prévention prises' }, { k: 'r5', type: 'x', l: '5. Équipements de protection utilisés' }, { k: 'r6', type: 'x', l: '6. Nature, degré et durée de l\'exposition' }, { k: 'r7', type: 'x', l: '7. Cas de substitution' }] },
    D3: { doc: 'Registre de formation et d\'information', ref: INRS, champs: [{ k: 'programme', type: 'x', l: 'Programme (risques, précautions, hygiène, équipements, incidents)' }, T(['Date', 'Intitulé', 'Formateur', 'Participants', 'Recyclage prévu le'])] },
    D4: { doc: 'Information fertilité, grossesse, allaitement', champs: [{ k: 'contenu', type: 'x', l: 'Contenu de l\'information délivrée' }, { k: 'date', type: 'd', l: 'Délivrée le' }, { k: 'public', type: 't', l: 'Travailleurs concernés (postes)' }] },
    D5: { doc: 'Registre de signalisation et d\'étiquetage', champs: [T(['Zone ou récipient', 'Signalisation ou étiquetage', 'Contrôlé le', 'Par'])] },
    D6: { doc: 'Modalités d\'accès aux pièces du dossier', champs: [{ k: 'modalites', type: 'x', l: 'Où et comment les travailleurs et le CSE consultent les pièces' }, { k: 'affiche', type: 'd', l: 'Modalités affichées le' }] },
    D7: { doc: 'Registre des expositions anormales', champs: [T(['Date', 'Zone', 'Cause', 'Mesures prises', 'Travailleurs, CSE et médecin informés le'])] },
    F1: { doc: 'Postes relevant du suivi individuel renforcé', champs: [T(['Poste', 'Agent CMR, plomb ou amiante', 'Nombre de salariés', 'Visite avant affectation organisée'])] },
    F2: { doc: 'Échéancier des visites de suivi renforcé', champs: [T(['Poste ou salarié', 'Dernière visite le', 'Visite intermédiaire (2 ans) le', 'Renouvellement (4 ans) le'])] },
    F3: { doc: 'Liste motivée des postes à risque ajoutés', champs: [T(['Poste ajouté', 'Motif', 'Transmis au SPST le'])] },
    F4: { doc: 'Notifications de fin d\'exposition', champs: [T(['Salarié', 'Motif (fin d\'exposition, départ, retraite)', 'Date', 'SPST informé le', 'Salarié avisé le'])] },
    F5: { doc: 'Examen des travailleurs exposés de façon comparable', champs: [T(['Maladie professionnelle reconnue le', 'Poste', 'Personnes à faire examiner', 'Liste transmise au médecin le'])] },
    G1: { doc: 'Contrôle d\'affectation aux postes reprotoxiques', champs: [{ k: 'postes', type: 'x', l: 'Postes exposant à des reprotoxiques de catégorie 1A ou 1B, au benzène ou à certains dérivés aromatiques' }, { k: 'procedure', type: 'x', l: 'Procédure de changement temporaire de poste dès la déclaration (sans enregistrer l\'état de grossesse)' }] },
    G2: { doc: 'Dérogations pour les jeunes en formation', champs: [T(['Déclaration de dérogation le', 'Formation', 'Travaux concernés', 'Encadrement', 'Échéance (3 ans)'])] },
    G3: { doc: 'Contrôle d\'affectation des CDD et intérimaires', champs: [T(['Travaux', 'Liste des 27 travaux interdits vérifiée le', 'Dérogation DREETS (référence)', 'Contrôlé par'])] },
    H1: { doc: 'Registre des plans de prévention', champs: [T(['Entreprise extérieure', 'Travaux', 'Agents CMR', 'Inspection commune le', 'Plan signé le'])] },
    H2: { doc: 'Registre des déchets CMR', champs: [{ k: 'procedure', type: 'x', l: 'Procédure de collecte, de stockage et d\'évacuation' }, T(['Enlèvement le', 'Déchet', 'Quantité', 'Collecteur', 'Bordereau n°'])] },
    H3: { doc: 'Rapport annuel au CSE sur l\'exposition', champs: [{ k: 'presente', type: 'd', l: 'Présenté au CSE le' }, { k: 'contenu', type: 'x', l: 'Contenu : expositions, mesures, programme de prévention' }] }
  };
  // Documents déjà produits par les écrans de l'outil
  var DOCS_OUTIL = { A1: ['registre'], A3: ['revisions'], B1: ['subst'], B2: ['subst'], B3: ['subst'], B4: ['subst'], E1: ['liste'], E2: ['anonyme', 'extrait'], E3: ['bordereau'], E4: ['agence'] };
  function ficheRemplie(P, id) {
    var f = P && P.fiches && P.fiches[id]; if (!f) return false;
    return Object.keys(f).some(function (k) { var v = f[k]; return k !== 'maj' && (Array.isArray(v) ? v.some(function (r) { return r.some(function (c) { return String(c || '').trim(); }); }) : String(v || '').trim()); });
  }
  // SIREN : 9 chiffres, clé de Luhn
  function sirenValide(v) {
    var d = String(v || '').replace(/\s/g, ''); if (!/^\d{9}$/.test(d)) return false;
    var sum = 0; for (var i = 0; i < 9; i++) { var n = +d[8 - i]; if (i % 2) { n *= 2; if (n > 9) n -= 9; } sum += n; }
    return sum % 10 === 0;
  }
  function articleUrl(a) { return 'https://code.travail.gouv.fr/code-du-travail/' + a.toLowerCase().replace(/[.\s]/g, ''); }
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
    if (lastRev && S.exported) set('A4', 'outil', 'DUERP téléchargé', lastRev.date);
    else set('A4', S.products.length ? 'partiel' : 'manquant', 'Téléchargez le dossier DUERP et joignez-le au document unique');
    set('A7', 'sans-objet', 'Le portail national prévu par la loi n\'a jamais été mis en service');

    var states = cmr.map(function (a) { return substState(P, a.key); });
    function bloc(id, test, okTxt, koTxt) {
      if (!S.products.length) { set(id, 'manquant', 'Inventoriez d\'abord vos produits et procédés'); return; }
      if (!cmr.length) { set(id, 'sans-objet', 'Aucun agent relevant du régime CMR'); return; }
      var n = states.filter(test).length;
      if (n === cmr.length) set(id, 'outil', okTxt, maxDate(states.map(function (x) { return x.s.date || x.s.mesuresDate; })));
      else set(id, n ? 'partiel' : 'manquant', (cmr.length - n) + ' agent(s) sur ' + cmr.length + ' : ' + koTxt);
    }
    bloc('B1', function (x) { return x.b1; }, 'Étude de substitution consignée pour chaque agent', 'étude de substitution à consigner');
    bloc('B2', function (x) { return x.b2; }, 'Système clos étudié et justifié', 'système clos à étudier ou justifier');
    bloc('B3', function (x) { return x.b3; }, 'Mesures de réduction et niveau résiduel décrits', 'mesures de réduction à décrire');
    bloc('B4', function (x) { return x.b4; }, 'Grille des treize mesures renseignée', 'grille des treize mesures à compléter');
    if (S.products.length && !ags.some(function (a) { return a.particuliers.length; })) set('B10', 'sans-objet', 'Aucun plomb ni amiante repéré dans l\'inventaire');

    if (!S.products.length) { ['E1', 'E2', 'E3', 'E4'].forEach(function (id) { set(id, 'manquant', 'Inventoriez d\'abord vos produits et procédés'); }); }
    else if (!cmr.length) { ['E1', 'E2', 'E3', 'E4'].forEach(function (id) { set(id, 'sans-objet', 'Aucun agent relevant du régime CMR'); }); }
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
      if ((!a || (a.statut !== 'outil' && a.statut !== 'sans-objet')) && ficheRemplie(P, o.id)) a = { statut: 'outil', detail: 'Renseigné dans l\'outil : ' + FICHES[o.id].doc, date: (P.fiches[o.id].maj || '') };
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
    FICHES: FICHES, DOCS_OUTIL: DOCS_OUTIL, ficheRemplie: ficheRemplie, sirenValide: sirenValide, articleUrl: articleUrl,
    suggestions: suggestions, exposFromEval: exposFromEval, revisionSummary: revisionSummary, coverage: coverage, articleLabel: articleLabel, mention: mention,
    frDate: frDate, today: today, packProject: packProject, unpackProject: unpackProject
  };
});
