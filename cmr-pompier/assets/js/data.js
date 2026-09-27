// Couche de données de l'espace connecté.
// En ligne : lit l'API (chaque rôle ne lit que les collections auxquelles il a droit).
// Hors ligne (aperçu sans serveur) : génère localement un jeu de données fictif équivalent.
(function (w) {
  var DAY = 86400000;

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
    if (role !== 'commandement') jobs.participations = list('participations', { sort: '-created' });
    if (role !== 'commandement') jobs.rdv = list('rendez_vous', { sort: 'date' });
    if (role === 'cos' || role === 'sssm') jobs.signalements = list('signalements', { sort: '-created' });
    if (role === 'sssm') jobs.prelevements = list('prelevements', { sort: '-date' });
    if (role === 'sssm' || role === 'commandement') jobs.reglementation = list('reglementation', { sort: '-date' });
    jobs.referentiel = list('referentiel', { sort: 'type_feu,phase,protection' });
    var keys = Object.keys(jobs), vals = await Promise.all(keys.map(function (k) { return jobs[k]; }));
    var db = {}; keys.forEach(function (k, i) { db[k] = vals[i]; });
    ['participations', 'rdv', 'signalements', 'prelevements', 'reglementation'].forEach(function (k) { db[k] = db[k] || []; });
    return normalise(db, s.id);
  }

  // ---------------------------------------------------------------- hors ligne
  function generate(role) {
    var seed = 20260927;
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    function pick(a) { return a[Math.floor(rnd() * a.length)]; }
    function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
    var n = 0; function id() { n++; return 'x' + String(n).padStart(14, '0'); }
    var now = Date.now(), centre = 'centre1';
    var users = [];
    function user(m, name, r, grade) { var u = { id: id(), matricule: m, name: name, role: r, grade: grade, centre: centre }; users.push(u); return u; }
    var agentDemo = user('SP-0142', 'J. Leroy', 'agent', 'Sapeur'), cosDemo = user('CA-0107', 'T. Bernard', 'cos', 'Adjudant');
    var ci = user('CI-0021', 'M. Garnier', 'commandement', 'Capitaine'), med = user('MED-0003', 'C. Roche', 'sssm', 'Médecin');
    var otherCos = [user('CA-0112', 'S. Moreau', 'cos', 'Sergent-chef'), user('CA-0119', 'D. Fabre', 'cos', 'Adjudant-chef')];
    var names = ['A. Martin', 'L. Dubois', 'N. Petit', 'C. Faure', 'E. Lambert', 'H. Girard', 'I. Bonnet', 'K. Mercier', 'O. Blanc', 'R. Guerin', 'V. Muller', 'Y. Henry', 'P. Rousseau', 'F. Vincent', 'G. Morel', 'B. Andre', 'M. Laurent', 'S. Simon', 'T. Michel'];
    var agents = [agentDemo].concat(names.map(function (nm, k) { return user('SP-0' + (150 + k), nm, 'agent', pick(['Sapeur', 'Caporal', 'Caporal-chef', 'Sergent'])); }));
    var T = {
      habitation: { w: 1, c: ['Démo-sur-Marne', 'Val-Fictif', 'Saint-Exemple'], p: ['Pavillon, feu de cuisine', 'Appartement R+2', 'Feu de chambre'], e: ['FPT', 'EPA'] },
      vehicule: { w: 1.2, c: ['Démo-sur-Marne', "Zone d'activités Fictive"], p: ['VL en parking souterrain', 'VL sur voie publique', 'Utilitaire'], e: ['FPT', 'VL'] },
      industriel: { w: 1.5, c: ["Zone d'activités Fictive"], p: ['Entrepôt de stockage', 'Atelier mécanique'], e: ['FPT', 'FPTL'] },
      vegetation: { w: 0.6, c: ['Val-Fictif', 'Bois-Exemple'], p: ['Feu de broussailles', 'Feu de champ'], e: ['CCF', 'CCF'] },
      conteneur: { w: 0.5, c: ['Démo-sur-Marne'], p: ['Conteneur à ordures', 'Benne de chantier'], e: ['FPT', 'VL'] },
      autre: { w: 0.8, c: ['Démo-sur-Marne'], p: ['Feu de cave'], e: ['FPT', 'VL'] }
    };
    var bag = ['habitation', 'habitation', 'habitation', 'vehicule', 'vehicule', 'vehicule', 'industriel', 'vegetation', 'vegetation', 'conteneur', 'conteneur', 'autre'];
    var CREW = ['binome_attaque', 'binome_attaque', 'binome_alimentation', 'binome_alimentation', 'conducteur', 'soutien'];
    var FCT = { chef_agres: ['commandement'], binome_attaque: ['attaque', 'deblai'], binome_alimentation: ['alimentation'], conducteur: ['conduite'], soutien: ['nettoyage'] };
    var interventions = [], participations = [];
    for (var i = 0; i < 60; i++) {
      var daysAgo = Math.floor(i / 60 * 360) + ri(0, 5);
      var d = new Date(now - daysAgo * DAY); d.setHours(ri(0, 23), ri(0, 59), 0, 0);
      var type = pick(bag), t = T[type], cos = i % 3 === 2 ? pick(otherCos) : cosDemo;
      var statut = 'controle_sssm';
      if (daysAgo <= 1) statut = 'brouillon'; else if (daysAgo <= 10) statut = rnd() < 0.5 ? 'transmis' : 'controle_sssm';
      if (i === 6 || i === 9) statut = 'brouillon';
      var it = { id: id(), numero: 'INT-' + d.getFullYear() + '-' + String(4200 - i).padStart(5, '0'), date: d.toISOString(), type_feu: type, precision: pick(t.p), commune: pick(t.c), centre: centre, cos: cos.id,
        zone_deshabillage: rnd() < 0.7, epi_ensaches: rnd() < 0.75, suspicion_amiante: type === 'industriel' && rnd() < 0.4, statut: statut, ambiance: 'feu_fumee', motorisation: type === 'vehicule' ? 'thermique' : '' };
      interventions.push(it);
      var crew = [], pool = agents.slice();
      if (i % 2 === 0) crew.push(pool.splice(0, 1)[0]); else pool.splice(0, 1);
      var size = ri(3, 5); while (crew.length < size) crew.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
      [{ u: cos, r: 'chef_agres' }].concat(crew.map(function (u, k) { return { u: u, r: CREW[k % CREW.length] }; })).forEach(function (m) {
        var atk = m.r === 'binome_attaque', ari = atk ? ri(20, 60) : m.r === 'binome_alimentation' ? ri(0, 30) : 0;
        var sans = type === 'vegetation' ? ri(30, 120) : atk ? ri(5, 40) : ri(0, 30), raw = t.w * (ari * 0.3 + sans);
        var pending = statut === 'brouillon', dch = !pending || rnd() < 0.5, ten = rnd() < 0.8, lin = rnd() < 0.7;
        participations.push({ id: id(), intervention: it.id, agent: m.u.id, role_tenu: m.r, ari_min: ari, sans_ari_min: sans,
          contamination: raw < 8 ? 'nulle' : raw < 20 ? 'faible' : raw < 45 ? 'moyenne' : 'forte', tenue_complete: rnd() < 0.9,
          douche: dch, tenue_changee: ten, lingettes: lin, decon_validee: pending ? rnd() < 0.4 : true,
          indice: Math.round(raw * Math.max(0.55, 1 - 0.15 * [dch, ten, lin].filter(Boolean).length)),
          engin: t.e[m.r === 'soutien' ? 1 : 0], fonctions: FCT[m.r] || [], ffp3: rnd() < 0.3, created: it.date });
      });
    }
    // L'intervention la plus récente a eu lieu il y a 5 heures (rapport en cours de rédaction)
    var recent = interventions[0]; recent.date = new Date(now - 5 * 3600000).toISOString(); recent.statut = 'brouillon';
    var rdv = [];
    function addRdv(u, off, st, motif) { var dd = new Date(now + off * DAY); dd.setHours(10, 0, 0, 0); rdv.push({ id: id(), agent: u.id, date: dd.toISOString(), statut: st, motif: motif, lieu: 'SSSM · Groupement fictif Nord' }); }
    addRdv(agentDemo, 12, 'prevu', 'Visite de suivi des expositions'); addRdv(agentDemo, -170, 'realise', "Visite médicale d'aptitude");
    addRdv(cosDemo, 5, 'prevu', 'Suivi post-exposition (feu industriel)'); addRdv(cosDemo, -200, 'realise', "Visite médicale d'aptitude");
    agents.slice(1).forEach(function (u, k) { addRdv(u, -ri(30, 360), 'realise', "Visite médicale d'aptitude"); if (k % 3 === 0) addRdv(u, ri(3, 40), 'prevu', 'Visite de suivi des expositions'); });
    var signalements = participations.filter(function (p) { var it = interventions.find(function (x) { return x.id === p.intervention; }); return p.contamination === 'forte' && it.cos === cosDemo.id; }).slice(0, 3).map(function (p, k) {
      return { id: id(), intervention: p.intervention, agents: [p.agent], auteur: cosDemo.id, niveau: k === 0 ? 'critique' : 'eleve', statut: ['ouvert', 'pris_en_charge', 'clos'][k], created: new Date(now - (k * 15 + 2) * DAY).toISOString(),
        motif: k === 0 ? 'Engagement prolongé en déblai sans ARI, fumées très denses, suie visible au niveau du cou.' : 'Exposition forte au déblai, décontamination sur place incomplète.' };
    });
    var prelevements = participations.filter(function (p) { return p.contamination === 'forte'; }).slice(0, 6).map(function (p, k) { return { id: id(), participation: p.id, type: 'hbco', valeur: Math.round((1.5 + rnd() * 6) * 10) / 10, unite: '%', date: new Date(now - (k * 20 + 2) * DAY).toISOString() }; });
    var reglementation = [
      { id: id(), titre: "Fiche d'exposition après intervention à risque", resume: "Proposition de loi sur le suivi de l'exposition des sapeurs-pompiers aux agents CMR. Adoptée par le Sénat en mars 2025, examen en cours. Exemple de démonstration : statut à vérifier.", date: new Date(now - 20 * DAY).toISOString(), impact: 'a_suivre', source: 'Sénat · proposition de loi (2025)' },
      { id: id(), titre: 'Mise à jour du référentiel : feux de véhicules électriques', resume: 'Nouvelle suggestion IA pour les feux de batteries lithium-ion. Validation du SSSM requise.', date: new Date(now - 3 * DAY).toISOString(), impact: 'action_requise', source: 'Référentiel VB Safety (démo)' },
      { id: id(), titre: 'Activité de sapeur-pompier classée cancérogène (groupe 1)', resume: "Classement par le CIRC en 2022.", date: new Date(now - 400 * DAY).toISOString(), impact: 'info', source: 'CIRC · Monographie 132' }
    ];
    var SUB = { habitation: 'HAP, benzène, formaldéhyde, particules fines', vehicule: 'HAP, benzène, métaux lourds, particules fines', industriel: 'HAP, dioxines et furanes, COV, métaux lourds', vegetation: 'Particules fines, formaldéhyde, acroléine', conteneur: 'HAP, dioxines, particules fines', autre: 'À préciser selon le local' };
    var BASE = { habitation: 2, vehicule: 2, industriel: 3, vegetation: 1, conteneur: 1, autre: 1 }, referentiel = [];
    Object.keys(SUB).forEach(function (tf, ti) { ['attaque', 'deblai', 'soutien'].forEach(function (ph) { ['ari', 'epi_sans_ari', 'sans_epi'].forEach(function (pr) {
      var s = Math.max(1, Math.min(3, BASE[tf] + (ph === 'deblai' ? 1 : ph === 'soutien' ? -1 : 0) + (pr === 'ari' ? -1 : pr === 'sans_epi' ? 1 : 0)));
      var sug = (ti + (ph === 'deblai' ? 1 : 0)) % 3 === 0 && pr !== 'ari';
      referentiel.push({ id: id(), type_feu: tf, phase: ph, protection: pr, agents_cmr: SUB[tf], niveau: ['faible', 'moyen', 'eleve'][s - 1], statut: sug ? 'suggestion_ia' : 'valide', source: sug ? 'Suggestion IA à partir de la littérature (à valider)' : 'Validé par le SSSM (démo)' });
    }); }); });

    // Filtre identique aux règles du serveur
    var me = { agent: agentDemo, cos: cosDemo, commandement: ci, sssm: med }[role];
    var db = { users: users, interventions: interventions, participations: participations, rdv: rdv, signalements: signalements, prelevements: prelevements, reglementation: reglementation, referentiel: referentiel };
    if (role === 'agent') {
      db.participations = participations.filter(function (p) { return p.agent === me.id; });
      var ids = db.participations.map(function (p) { return p.intervention; });
      db.interventions = interventions.filter(function (x) { return ids.indexOf(x.id) !== -1; });
      db.rdv = rdv.filter(function (r) { return r.agent === me.id; }); db.users = [me];
      db.signalements = []; db.prelevements = []; db.reglementation = [];
    } else if (role === 'cos') {
      db.interventions = interventions.filter(function (x) { return x.cos === me.id; });
      var its = db.interventions.map(function (x) { return x.id; });
      db.participations = participations.filter(function (p) { return its.indexOf(p.intervention) !== -1; });
      db.rdv = rdv.filter(function (r) { return r.agent === me.id; }); db.prelevements = []; db.reglementation = [];
    } else if (role === 'commandement') {
      db.participations = []; db.rdv = []; db.signalements = []; db.prelevements = [];
    }
    db.interventions.sort(function (a, b) { return b.date.localeCompare(a.date); });
    return normalise(db, me.id);
  }

  // ---------------------------------------------------------------- commun
  function normalise(db, meId) {
    var byId = {};
    db.users.forEach(function (u) { byId[u.id] = u; });
    var inter = {};
    db.interventions.forEach(function (x) { x.dateObj = new Date(String(x.date).replace(' ', 'T')); inter[x.id] = x; x.cosUser = byId[x.cos]; x.crew = []; });
    db.participations.forEach(function (p) {
      p.it = inter[p.intervention]; p.user = byId[p.agent];
      if (p.it) p.it.crew.push(p);
    });
    db.rdv.forEach(function (r) { r.dateObj = new Date(String(r.date).replace(' ', 'T')); r.user = byId[r.agent]; });
    db.signalements.forEach(function (s) { s.it = inter[s.intervention]; });
    db.byId = byId; db.inter = inter; db.meId = meId; db.me = byId[meId] || null;
    db.mine = db.participations.filter(function (p) { return p.agent === meId && p.it; }).sort(function (a, b) { return b.it.dateObj - a.it.dateObj; });
    return db;
  }

  // Statut vu par le commandement : à jour, en attente (< 72 h), en retard, transmis, contrôlé
  function reportState(it) {
    if (it.statut === 'controle_sssm') return 'controle';
    if (it.statut === 'transmis') return 'transmis';
    return (Date.now() - it.dateObj) > 72 * 3600000 ? 'retard' : 'attente';
  }

  w.VBSData = {
    load: function (s) { return s.offline ? Promise.resolve(generate(s.role)) : loadOnline(s); },
    reportState: reportState, DAY: DAY
  };
})(window);
