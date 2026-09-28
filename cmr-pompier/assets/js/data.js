// Couche de données de l'espace connecté.
// En ligne : lit et écrit via l'API (le serveur applique les droits de chaque rôle).
// Hors ligne (aperçu sans serveur) : jeu de données fictif gardé dans le navigateur,
// filtré avec les mêmes règles que le serveur.
(function (w) {
  var DAY = 86400000;
  var COLS = ['users', 'operations', 'interventions', 'participations', 'rendez_vous', 'signalements', 'prelevements', 'documents', 'referentiel', 'reglementation', 'rappels'];
  var W = { habitation: 1.0, vehicule: 1.2, industriel: 1.5, vegetation: 0.6, conteneur: 0.5, chimique: 1.4, autre: 0.8 };

  // Indice d'exposition indicatif (même formule partout)
  function indice(typeFeu, p) {
    var raw = (W[typeFeu] || 1) * ((+p.ari_min || 0) * 0.3 + (+p.sans_ari_min || 0));
    var gestes = [p.douche, p.tenue_changee, p.lingettes].filter(Boolean).length;
    return Math.round(raw * Math.max(0.55, 1 - 0.15 * gestes));
  }

  // ---------------------------------------------------------------- en ligne
  async function list(col, params) {
    var q = new URLSearchParams(Object.assign({ perPage: 500 }, params || {}));
    var out = [], page = 1;
    while (true) {
      q.set('page', page);
      var d = await VBS.request('/api/collections/' + col + '/records?' + q.toString());
      out = out.concat(d.items || []);
      if (!d.totalPages || page >= d.totalPages) break;
      page++;
    }
    return out;
  }
  async function loadOnline(s) {
    var role = s.role, jobs = {};
    jobs.users = list('users', { sort: 'name', fields: 'id,name,matricule,role,grade,centre' });
    jobs.interventions = list('interventions', { sort: '-date' });
    if (role !== 'agent') jobs.operations = list('operations', { sort: '-date' });
    if (role === 'sssm') jobs.documents = list('documents', { sort: '-created' });
    if (role !== 'commandement') { jobs.participations = list('participations', { sort: '-created' }); jobs.rendez_vous = list('rendez_vous', { sort: 'date' }); }
    if (role === 'cos' || role === 'sssm') jobs.signalements = list('signalements', { sort: '-created' });
    if (role === 'sssm') jobs.prelevements = list('prelevements', { sort: '-date' });
    if (role === 'sssm' || role === 'commandement') jobs.reglementation = list('reglementation', { sort: '-date' });
    if (role === 'cos' || role === 'commandement') jobs.rappels = list('rappels', { sort: '-created' });
    jobs.referentiel = list('referentiel', { sort: 'type_feu,phase,protection' });
    var keys = Object.keys(jobs), vals = await Promise.all(keys.map(function (k) { return jobs[k]; }));
    var raw = {}; COLS.forEach(function (c) { raw[c] = []; }); keys.forEach(function (k, i) { raw[k] = vals[i]; });
    return normalise(raw, s.id);
  }

  // ---------------------------------------------------------------- hors ligne
  var OFF_KEY = 'vbs-offline-db-v4', offline = null;
  function saveOffline() { try { sessionStorage.setItem(OFF_KEY, JSON.stringify(offline)); } catch (e) {} }
  function loadOffline() { try { return JSON.parse(sessionStorage.getItem(OFF_KEY) || 'null'); } catch (e) { return null; } }
  var idn = 0;
  function newId() { idn++; return ('o' + Date.now().toString(36) + idn.toString(36) + 'xxxxxxxxxxxxxxx').slice(0, 15); }

  function generateRaw() {
    var seed = 20260927;
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    function pick(a) { return a[Math.floor(rnd() * a.length)]; }
    function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
    function d2(n) { return String(n).padStart(2, '0'); }
    var n = 0; function id() { n++; return 'x' + String(n).padStart(14, '0'); }
    var now = Date.now(), centre = 'centre000000001', users = [];
    function user(m, name, r, grade) { var u = { id: id(), matricule: m, name: name, role: r, grade: grade, centre: centre }; users.push(u); return u; }
    var agentDemo = user('SP-0142', 'J. Leroy', 'agent', 'Sapeur'), cosDemo = user('CA-0107', 'T. Bernard', 'cos', 'Adjudant');
    var ci = user('CI-0021', 'M. Garnier', 'commandement', 'Capitaine'), med = user('MED-0003', 'C. Roche', 'sssm', 'Médecin');
    var otherCos = [user('CA-0112', 'S. Moreau', 'cos', 'Sergent-chef'), user('CA-0119', 'D. Fabre', 'cos', 'Adjudant-chef')];
    var names = [['A. Martin', 'Sergent'], ['L. Dubois', 'Caporal-chef'], ['N. Petit', 'Caporal'], ['C. Faure', 'Sapeur'], ['E. Lambert', 'Sapeur'], ['H. Girard', 'Caporal'], ['I. Bonnet', 'Sapeur'], ['K. Mercier', 'Caporal-chef'], ['O. Blanc', 'Sapeur'], ['R. Guerin', 'Sergent'], ['V. Muller', 'Sapeur'], ['Y. Henry', 'Caporal'], ['P. Rousseau', 'Sapeur'], ['F. Vincent', 'Caporal'], ['G. Morel', 'Sapeur'], ['B. Andre', 'Caporal-chef'], ['M. Laurent', 'Sapeur'], ['S. Simon', 'Sapeur'], ['T. Michel', 'Caporal']];
    var agents = [agentDemo].concat(names.map(function (x, k) { return user('SP-0' + (150 + k), x[0], 'agent', x[1]); }));
    var T = {
      habitation: { c: ['Démo-sur-Marne', 'Val-Fictif', 'Saint-Exemple'], p: ['Pavillon, feu de cuisine', 'Appartement R+2', 'Feu de chambre'], e: ['FPT', 'EPA'] },
      vehicule: { c: ['Démo-sur-Marne', "Zone d'activités Fictive"], p: ['VL en parking souterrain', 'VL sur voie publique', 'Utilitaire'], e: ['FPT', 'VL'] },
      industriel: { c: ["Zone d'activités Fictive"], p: ['Entrepôt de stockage', 'Atelier mécanique'], e: ['FPT', 'FPTL'] },
      vegetation: { c: ['Val-Fictif', 'Bois-Exemple'], p: ['Feu de broussailles', 'Feu de champ'], e: ['CCF', 'CCF'] },
      conteneur: { c: ['Démo-sur-Marne'], p: ['Conteneur à ordures', 'Benne de chantier'], e: ['FPT', 'VL'] },
      chimique: { c: ["Zone d'activités Fictive"], p: ['Fuite de produit en entrepôt'], e: ['FPT', 'VL'] },
      autre: { c: ['Démo-sur-Marne'], p: ['Feu de cave'], e: ['FPT', 'VL'] }
    };
    var bag = ['habitation', 'habitation', 'habitation', 'vehicule', 'vehicule', 'vehicule', 'industriel', 'vegetation', 'vegetation', 'conteneur', 'conteneur', 'autre', 'chimique'];
    var CREW = ['binome_attaque', 'binome_attaque', 'binome_alimentation', 'binome_alimentation', 'conducteur', 'soutien'];
    var FCT = { chef_agres: ['commandement'], binome_attaque: ['attaque', 'deblai'], binome_alimentation: ['alimentation'], conducteur: ['conduite'], soutien: ['nettoyage'] };
    var interventions = [], participations = [];
    for (var i = 0; i < 60; i++) {
      var daysAgo = i === 0 ? 0 : Math.floor(i / 60 * 360) + ri(0, 5);
      var d = i === 0 ? new Date(now - 5 * 3600000) : new Date(now - daysAgo * DAY); if (i) d.setHours(ri(0, 23), ri(0, 59), 0, 0);
      var type = i === 0 ? 'vehicule' : pick(bag), t = T[type], cos = i % 3 === 2 ? pick(otherCos) : cosDemo;
      var statut = 'controle_sssm';
      if (daysAgo <= 1) statut = 'brouillon'; else if (daysAgo <= 10) statut = rnd() < 0.5 ? 'transmis' : 'controle_sssm';
      if (i === 6 || i === 9) statut = 'brouillon';
      var it = { id: id(), numero: 'INT-' + d.getFullYear() + '-' + String(4200 - i).padStart(5, '0'), date: d.toISOString(), type_feu: type, precision: i === 0 ? 'VL en parking souterrain' : pick(t.p), commune: pick(t.c), centre: centre, cos: cos.id,
        zone_deshabillage: rnd() < 0.7, epi_ensaches: rnd() < 0.75, suspicion_amiante: type === 'industriel' && rnd() < 0.4, statut: statut, ambiance: 'feu_fumee', motorisation: type === 'vehicule' ? 'thermique' : '', exposition_globale: '' };
      interventions.push(it);
      var crew = [], pool = agents.slice();
      if (i % 2 === 0) crew.push(pool.splice(0, 1)[0]); else pool.splice(0, 1);
      var size = ri(3, 5); while (crew.length < size) crew.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
      [{ u: cos, r: 'chef_agres' }].concat(crew.map(function (u, k) { return { u: u, r: CREW[k % CREW.length] }; })).forEach(function (m, k) {
        var base = { id: id(), intervention: it.id, agent: m.u.id, role_tenu: m.r, engin: t.e[m.r === 'soutien' ? 1 : 0], created: it.date };
        if (i === 0) { participations.push(Object.assign(base, { contamination: 'nulle', indice: 0, fonctions: [] })); return; }
        var atk = m.r === 'binome_attaque', ari = atk ? pick([15, 30, 45, 60]) : m.r === 'binome_alimentation' && rnd() < 0.5 ? pick([15, 30]) : 0;
        var sans = type === 'vegetation' ? ri(30, 120) : atk ? ri(5, 40) : ri(0, 30), rawv = (W[type] || 1) * (ari * 0.3 + sans);
        var pending = statut === 'brouillon', dch = !pending || rnd() < 0.5, ten = rnd() < 0.8, lin = rnd() < 0.7, dv = pending ? rnd() < 0.4 : true;
        var p = Object.assign(base, { ari_porte: ari > 0, ari_min: ari, sans_ari_min: sans, contamination: rawv < 8 ? 'nulle' : rawv < 20 ? 'faible' : rawv < 45 ? 'moyenne' : 'forte',
          tenue_complete: rnd() < 0.9, ffp3: rnd() < 0.3, douche: dch, tenue_changee: ten, lingettes: lin, decon_validee: dv, fonctions: FCT[m.r] || [],
          decon_ref: dv ? 'Mesure VB' + (124 + i) + '-' + (k + 1) : '', decon_heure: dv ? d2((d.getHours() + 1) % 24) + ':' + d2(ri(0, 59)) : '' });
        p.indice = indice(type, p);
        participations.push(p);
      });
    }
    // Opérations à plusieurs agrès (même logique que le serveur)
    var operations = [], documents = [], opPrel = [], used = {};
    function crewFor(k) { var out = [], pool = agents.filter(function (a) { return !used[a.id]; }); while (out.length < k && pool.length) { var a = pool.splice(Math.floor(rnd() * pool.length), 1)[0]; used[a.id] = 1; out.push(a); } return out; }
    function mkOp(num, ago, type, prec, commune, cos) { var d = new Date(now - ago * DAY); d.setHours(ri(10, 20), ri(0, 59), 0, 0); var o = { id: id(), numero: 'OP-' + d.getFullYear() + '-' + num, date: d.toISOString(), type_feu: type, precision: prec, commune: commune, centre: centre, cos: cos.id }; operations.push(o); return o; }
    function mkReport(o, ca, engin, statut, withDemo) {
      var d = new Date(o.date), it = { id: id(), numero: o.numero.replace('OP', 'INT') + '-' + engin, date: o.date, type_feu: o.type_feu, precision: o.precision, commune: o.commune, centre: centre, cos: ca.id, operation: o.id, ambiance: 'feu_fumee', zone_deshabillage: true, epi_ensaches: true, suspicion_amiante: false, statut: statut, motorisation: '', exposition_globale: '' };
      interventions.push(it);
      var crew = crewFor(3); if (withDemo) crew[0] = agentDemo;
      return [{ u: ca, r: 'chef_agres' }].concat(crew.map(function (u, k) { return { u: u, r: CREW[k % CREW.length] }; })).map(function (m, k) {
        var base = { id: id(), intervention: it.id, agent: m.u.id, role_tenu: m.r, engin: engin, created: it.date };
        if (statut === 'brouillon') { participations.push(Object.assign(base, { contamination: 'nulle', indice: 0, fonctions: [] })); return base; }
        var atk = m.r === 'binome_attaque', ari = atk ? pick([15, 30, 45, 60]) : 0, sans = atk ? ri(15, 45) : ri(5, 30), rv = (W[o.type_feu] || 1) * (ari * 0.3 + sans);
        var p = Object.assign(base, { fonctions: FCT[m.r] || [], ari_porte: ari > 0, ari_min: ari, sans_ari_min: sans, contamination: rv < 8 ? 'nulle' : rv < 20 ? 'faible' : rv < 45 ? 'moyenne' : 'forte', tenue_complete: true, ffp3: rnd() < 0.5, douche: true, tenue_changee: true, lingettes: true, decon_validee: true, decon_ref: 'Mesure VB' + ri(300, 399) + '-' + (k + 1), decon_heure: d2((d.getHours() + 2) % 24) + ':' + d2(ri(0, 59)) });
        p.indice = indice(o.type_feu, p); participations.push(p); return p;
      });
    }
    var moreau = otherCos[0], fabre = otherCos[1];
    var opA = mkOp('0781', 4, 'industriel', 'Entrepôt de stockage, 2 000 m²', "Zone d'activités Fictive", cosDemo);
    mkReport(opA, cosDemo, 'FPT', 'transmis'); mkReport(opA, moreau, 'EPA', 'transmis'); mkReport(opA, fabre, 'FPTL', 'brouillon');
    var opB = mkOp('0764', 9, 'habitation', "Immeuble R+4, feu d'appartement", 'Démo-sur-Marne', moreau);
    var bParts = [].concat(mkReport(opB, moreau, 'FPT', 'controle_sssm'), mkReport(opB, cosDemo, 'EPA', 'transmis', true), mkReport(opB, fabre, 'FPTL', 'controle_sssm'));
    var docB = { id: id(), titre: 'Résultats HbCO · ' + opB.numero + ' (démo)', operation: opB.id, type_mesure: 'hbco', nb_mesures: bParts.length, auteur: med.id, created: new Date(new Date(opB.date).getTime() + DAY).toISOString(), fichier: '' };
    documents.push(docB);
    bParts.forEach(function (p) { opPrel.push({ id: id(), participation: p.id, type: 'hbco', valeur: Math.round((0.8 + rnd() * 5) * 10) / 10, unite: '%', date: opB.date, heure: '', document: docB.id, auteur: med.id }); });
    var rdv = [];
    function addRdv(u, off, st, motif) { var dd = new Date(now + off * DAY); dd.setHours(10, 0, 0, 0); rdv.push({ id: id(), agent: u.id, date: dd.toISOString(), statut: st, motif: motif, lieu: 'SSSM · Groupement fictif Nord' }); }
    addRdv(agentDemo, 12, 'prevu', 'Visite de suivi des expositions'); addRdv(agentDemo, -170, 'realise', "Visite médicale d'aptitude");
    addRdv(cosDemo, 5, 'prevu', 'Suivi post-exposition (feu industriel)'); addRdv(cosDemo, -200, 'realise', "Visite médicale d'aptitude");
    agents.slice(1).concat(otherCos).forEach(function (u, k) { addRdv(u, -ri(30, 360), 'realise', "Visite médicale d'aptitude"); if (k % 3 === 0) addRdv(u, ri(3, 40), 'prevu', 'Visite de suivi des expositions'); });
    var byIt = {}; interventions.forEach(function (x) { byIt[x.id] = x; });
    var signalements = participations.filter(function (p) { return p.contamination === 'forte' && byIt[p.intervention].cos === cosDemo.id; }).slice(0, 3).map(function (p, k) {
      return { id: id(), intervention: p.intervention, agents: [p.agent], auteur: cosDemo.id, niveau: k === 0 ? 'critique' : 'eleve', statut: ['ouvert', 'pris_en_charge', 'clos'][k], created: new Date(now - (k * 15 + 2) * DAY).toISOString(),
        motif: k === 0 ? 'Engagement prolongé en déblai sans ARI, fumées très denses, suie visible au niveau du cou.' : 'Exposition forte au déblai, décontamination sur place incomplète.' };
    });
    var prelevements = participations.filter(function (p) { return p.contamination === 'forte'; }).slice(0, 6).map(function (p, k) { return { id: id(), participation: p.id, type: 'hbco', valeur: Math.round((1.5 + rnd() * 6) * 10) / 10, unite: '%', date: new Date(now - (k * 20 + 2) * DAY).toISOString(), auteur: med.id }; });
    var late = interventions.filter(function (x) { return x.statut === 'brouillon' && x.cos === cosDemo.id && now - new Date(x.date) > 3 * DAY; })[0];
    var rappels = late ? [{ id: id(), intervention: late.id, de: ci.id, a: cosDemo.id, message: 'Merci de compléter ce rapport de contamination au plus vite.', created: new Date(now - DAY).toISOString() }] : [];
    var reglementation = [
      { id: id(), titre: "Fiche d'exposition après intervention à risque", resume: "Proposition de loi sur le suivi de l'exposition des sapeurs-pompiers aux agents CMR. Adoptée par le Sénat en mars 2025, examen en cours. Exemple de démonstration : statut à vérifier.", date: new Date(now - 20 * DAY).toISOString(), impact: 'a_suivre', source: 'Sénat · proposition de loi (2025)' },
      { id: id(), titre: 'Mise à jour du référentiel : feux de véhicules électriques', resume: 'Nouvelle suggestion IA pour les feux de batteries lithium-ion. Validation du SSSM requise.', date: new Date(now - 3 * DAY).toISOString(), impact: 'action_requise', source: 'Référentiel VB Safety (démo)' },
      { id: id(), titre: 'Activité de sapeur-pompier classée cancérogène (groupe 1)', resume: 'Classement par le CIRC en 2022.', date: new Date(now - 400 * DAY).toISOString(), impact: 'info', source: 'CIRC · Monographie 132' }
    ];
    var SUB = { habitation: 'HAP, benzène, formaldéhyde, particules fines', vehicule: 'HAP, benzène, métaux lourds, particules fines', industriel: 'HAP, dioxines et furanes, COV, métaux lourds', vegetation: 'Particules fines, formaldéhyde, acroléine', conteneur: 'HAP, dioxines, particules fines', chimique: 'Selon le produit (fiche de données de sécurité)', autre: 'À préciser selon le local' };
    var BASE = { habitation: 2, vehicule: 2, industriel: 3, vegetation: 1, conteneur: 1, chimique: 3, autre: 1 }, referentiel = [];
    Object.keys(SUB).forEach(function (tf, ti) { ['attaque', 'deblai', 'soutien'].forEach(function (ph) { ['ari', 'epi_sans_ari', 'sans_epi'].forEach(function (pr) {
      var s = Math.max(1, Math.min(3, BASE[tf] + (ph === 'deblai' ? 1 : ph === 'soutien' ? -1 : 0) + (pr === 'ari' ? -1 : pr === 'sans_epi' ? 1 : 0)));
      var sug = (ti + (ph === 'deblai' ? 1 : 0)) % 3 === 0 && pr !== 'ari';
      referentiel.push({ id: id(), type_feu: tf, phase: ph, protection: pr, agents_cmr: SUB[tf], niveau: ['faible', 'moyen', 'eleve'][s - 1], statut: sug ? 'suggestion_ia' : 'valide', source: sug ? 'Suggestion IA à partir de la littérature (à valider)' : 'Validé par le SSSM (démo)' });
    }); }); });
    return { users: users, operations: operations, documents: documents, interventions: interventions, participations: participations, rendez_vous: rdv, signalements: signalements, prelevements: prelevements.concat(opPrel), referentiel: referentiel, reglementation: reglementation, rappels: rappels,
      demo: { agent: agentDemo.id, cos: cosDemo.id, commandement: ci.id, sssm: med.id } };
  }

  // Mêmes règles de lecture que le serveur
  function filterFor(all, role, meId) {
    var me = all.users.find(function (u) { return u.id === meId; });
    // Copies : la normalisation ajoute des liens (it, user, crew) qui ne doivent pas polluer l'état stocké
    var all0 = all; all = {}; COLS.forEach(function (c) { all[c] = all0[c].map(function (r) { return Object.assign({}, r); }); });
    var v = {}; COLS.forEach(function (c) { v[c] = all[c].slice(); });
    if (role === 'agent') {
      v.participations = all.participations.filter(function (p) { return p.agent === meId; });
      var ids = v.participations.map(function (p) { return p.intervention; });
      v.interventions = all.interventions.filter(function (x) { return ids.indexOf(x.id) !== -1; });
      v.rendez_vous = all.rendez_vous.filter(function (r) { return r.agent === meId; }); v.users = [me];
      v.signalements = []; v.prelevements = []; v.reglementation = []; v.rappels = []; v.operations = []; v.documents = [];
    } else if (role === 'cos') {
      var myOps = all.operations.filter(function (o) { return o.cos === meId; }).map(function (o) { return o.id; });
      v.interventions = all.interventions.filter(function (x) { return x.cos === meId || myOps.indexOf(x.operation) !== -1; });
      v.documents = [];
      var its = all.interventions.filter(function (x) { return x.cos === meId; }).map(function (x) { return x.id; });
      v.participations = all.participations.filter(function (p) { return its.indexOf(p.intervention) !== -1; });
      v.rendez_vous = all.rendez_vous.filter(function (r) { return r.agent === meId; });
      v.signalements = all.signalements.filter(function (s) { return s.auteur === meId; });
      v.users = all.users.filter(function (u) { return u.centre === me.centre; });
      v.prelevements = []; v.reglementation = []; v.rappels = all.rappels.filter(function (r) { return r.a === meId || r.de === meId; });
    } else if (role === 'commandement') {
      v.participations = []; v.rendez_vous = []; v.signalements = []; v.prelevements = []; v.documents = [];
      v.users = all.users.filter(function (u) { return u.centre === me.centre; });
      v.rappels = all.rappels.filter(function (r) { return r.a === meId || r.de === meId; });
    } else {
      v.rappels = [];
    }
    v.interventions.sort(function (a, b) { return parseD(b.date) - parseD(a.date); });
    return v;
  }
  function offlineView(s) {
    if (!offline) offline = loadOffline() || generateRaw();
    var meId = offline.demo[s.role];
    return normalise(filterFor(offline, s.role, meId), meId);
  }

  // ---------------------------------------------------------------- commun
  function parseD(v) { return v ? new Date(String(v).replace(' ', 'T')) : null; }
  function normalise(db, meId) {
    var byId = {};
    db.users.forEach(function (u) { byId[u.id] = u; });
    var ops = {};
    db.operations.forEach(function (o) { o.dateObj = parseD(o.date); o.cosUser = byId[o.cos]; o.reports = []; ops[o.id] = o; });
    var inter = {};
    db.interventions.forEach(function (x) { x.dateObj = parseD(x.date); inter[x.id] = x; x.cosUser = byId[x.cos]; x.crew = []; x.op = x.operation ? ops[x.operation] || null : null; if (x.op) x.op.reports.push(x); });
    db.participations.forEach(function (p) { p.it = inter[p.intervention]; p.user = byId[p.agent]; if (p.it) p.it.crew.push(p); });
    db.rendez_vous.forEach(function (r) { r.dateObj = parseD(r.date); r.user = byId[r.agent]; });
    db.signalements.forEach(function (s) { s.it = inter[s.intervention]; s.createdObj = parseD(s.created); });
    db.rappels.forEach(function (r) { r.it = inter[r.intervention]; r.createdObj = parseD(r.created); });
    db.rdv = db.rendez_vous;
    db.documents.forEach(function (d) { d.createdObj = parseD(d.created); d.op = ops[d.operation] || null; });
    db.ops = ops; db.byId = byId; db.inter = inter; db.meId = meId; db.me = byId[meId] || null;
    db.mine = db.participations.filter(function (p) { return p.agent === meId && p.it; }).sort(function (a, b) { return b.it.dateObj - a.it.dateObj; });
    return db;
  }

  function reportState(it) {
    if (it.statut === 'controle_sssm') return 'controle';
    if (it.statut === 'transmis') return 'transmis';
    return (Date.now() - it.dateObj) > 72 * 3600000 ? 'retard' : 'attente';
  }

  // ---------------------------------------------------------------- écritures
  function clean(data) {
    var o = {}; Object.keys(data).forEach(function (k) { var v = data[k]; if (v !== undefined && typeof v !== 'function' && ['it', 'user', 'crew', 'dateObj', 'cosUser', 'op', 'reports', 'createdObj'].indexOf(k) === -1) o[k] = v; }); return o;
  }
  async function create(s, col, data) {
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      if (!s.offline) return VBS.upload('/api/collections/' + col + '/records', data);
      var o = {}; data.forEach(function (v, k) { o[k] = (typeof File !== 'undefined' && v instanceof File) ? v.name : v; }); data = o;
    }
    data = clean(data);
    if (!s.offline) return VBS.request('/api/collections/' + col + '/records', { method: 'POST', body: data });
    var rec = Object.assign({ id: newId(), created: new Date().toISOString() }, data);
    offline[col].push(rec); saveOffline(); return rec;
  }
  async function update(s, col, id, data) {
    data = clean(data);
    if (!s.offline) return VBS.request('/api/collections/' + col + '/records/' + id, { method: 'PATCH', body: data });
    var rec = offline[col].find(function (r) { return r.id === id; });
    if (!rec) throw new Error('Enregistrement introuvable');
    Object.assign(rec, data); saveOffline(); return rec;
  }
  async function remove(s, col, id) {
    if (!s.offline) return VBS.request('/api/collections/' + col + '/records/' + id, { method: 'DELETE' });
    offline[col] = offline[col].filter(function (r) { return r.id !== id; }); saveOffline();
  }
  function toApiDate(d) { return d.toISOString().replace('T', ' '); }

  w.VBSData = {
    load: function (s) { return s.offline ? Promise.resolve(offlineView(s)) : loadOnline(s); },
    create: create, update: update, remove: remove, indice: indice, toApiDate: toApiDate,
    resetOffline: function () { offline = null; try { sessionStorage.removeItem(OFF_KEY); } catch (e) {} },
    reportState: reportState, DAY: DAY
  };
})(window);
