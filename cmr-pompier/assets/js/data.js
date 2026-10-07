// Couche de données de l'espace connecté.
// En ligne : lit et écrit via l'API (le serveur applique les droits de chaque rôle).
// Hors ligne (aperçu sans serveur) : jeu de données fictif gardé dans le navigateur,
// filtré avec les mêmes règles que le serveur.
(function (w) {
  var DAY = 86400000;
  var COLS = ['users', 'activites', 'operations', 'interventions', 'participations', 'rendez_vous', 'signalements', 'prelevements', 'documents', 'referentiel', 'reglementation', 'rappels', 'tenues', 'mouvements_epi', 'ref_motifs', 'parametres'];

  // Indicateur conventionnel en équivalents-feu (référentiel VB Safety v1.0, voir referentiel.js)
  function indice(it, p) { return VBSRef.calcul(it || {}, p || {}).ef; }
  var SEUIL = 30; // seuil d'alerte par défaut (feux depuis la mise en service), réglable par le service habillement

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
    jobs.users = list('users', { sort: 'name', fields: 'id,name,matricule,role,grade,centre,statut_sp,cis,groupement,renfort' });
    // Paramètres réglés par l'administrateur (lus par tous, modifiables par l'administrateur seul)
    jobs.parametres = list('parametres').catch(function () { return []; });
    if (role === 'admin') {
      var k0 = Object.keys(jobs), v0 = await Promise.all(k0.map(function (k) { return jobs[k]; }));
      var raw0 = {}; COLS.forEach(function (c) { raw0[c] = []; }); k0.forEach(function (k, i) { raw0[k] = v0[i]; });
      return normalise(raw0, s.id);
    }
    if (role !== 'habillement') jobs.interventions = list('interventions', { sort: '-date' });
    // Activités exposantes hors intervention (formations, nettoyage du matériel)
    if (role !== 'habillement' && role !== 'commandement') jobs.activites = list('activites', { sort: '-date' }).catch(function () { return []; });
    if (role !== 'agent' && role !== 'habillement') jobs.operations = list('operations', { sort: '-date' });
    if (role === 'sssm') jobs.documents = list('documents', { sort: '-created' });
    if (role !== 'commandement' && role !== 'habillement') { jobs.participations = list('participations', { sort: '-created' }); jobs.rendez_vous = list('rendez_vous', { sort: 'date' }); }
    if (role === 'cos' || role === 'sssm') jobs.signalements = list('signalements', { sort: '-created' });
    if (role === 'sssm') jobs.prelevements = list('prelevements', { sort: '-date' });
    if (role === 'sssm' || role === 'commandement') jobs.reglementation = list('reglementation', { sort: '-date' });
    if (role === 'cos' || role === 'commandement') jobs.rappels = list('rappels', { sort: '-created' });
    // Module EPI : réservé au référent EPI de la caserne
    if (role === 'habillement') { jobs.tenues = list('tenues', { sort: 'numero' }); jobs.mouvements_epi = list('mouvements_epi', { sort: '-created' }); }
    // Référentiel validé par le SSSM, motif par motif (sans lui, les valeurs VB Safety s'appliquent)
    if (role !== 'habillement') jobs.ref_motifs = list('ref_motifs', { sort: 'motif' }).catch(function () { return []; });
    var keys = Object.keys(jobs), vals = await Promise.all(keys.map(function (k) { return jobs[k]; }));
    var raw = {}; COLS.forEach(function (c) { raw[c] = []; }); keys.forEach(function (k, i) { raw[k] = vals[i]; });
    return normalise(raw, s.id);
  }

  // ---------------------------------------------------------------- hors ligne
  var OFF_KEY = 'vbs-offline-db-v11', offline = null;
  function saveOffline() { try { sessionStorage.setItem(OFF_KEY, JSON.stringify(offline)); } catch (e) {} }
  function loadOffline() { try { return JSON.parse(sessionStorage.getItem(OFF_KEY) || 'null'); } catch (e) { return null; } }
  var idn = 0;
  function newId() { idn++; return ('o' + Date.now().toString(36) + idn.toString(36) + 'xxxxxxxxxxxxxxx').slice(0, 15); }

  function generateRaw() {
    var seed = 20260930;
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    function pick(a) { return a[Math.floor(rnd() * a.length)]; }
    function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
    var n = 0; function id() { n++; return 'x' + String(n).padStart(14, '0'); }
    var now = Date.now(), centre = 'centre000000001', users = [];
    function user(m, name, r, grade, st) { var u = { id: id(), matricule: m, name: name, role: r, grade: grade, centre: centre, statut_sp: st || 'SPP' }; users.push(u); return u; }
    var agentDemo = user('SP-0142', 'J. Leroy', 'agent', 'Sapeur', 'SPV'), cosDemo = user('CA-0107', 'T. Bernard', 'cos', 'Adjudant');
    var ci = user('CI-0021', 'M. Garnier', 'commandement', 'Capitaine'), med = user('MED-0003', 'C. Roche', 'sssm', 'Médecin');
    var hab = user('HAB-0005', 'L. Perrin', 'habillement', 'Adjudant-chef');
    var adm = user('ADM-0001', 'S. Durand', 'admin', 'Commandant');
    var otherCos = [user('CA-0112', 'S. Moreau', 'cos', 'Sergent-chef', 'SPV'), user('CA-0119', 'D. Fabre', 'cos', 'Adjudant-chef', 'SPP')];
    var names = [['A. Martin', 'Sergent'], ['L. Dubois', 'Caporal-chef'], ['N. Petit', 'Caporal'], ['C. Faure', 'Sapeur'], ['E. Lambert', 'Sapeur'], ['H. Girard', 'Caporal'], ['I. Bonnet', 'Sapeur'], ['K. Mercier', 'Caporal-chef'], ['O. Blanc', 'Sapeur'], ['R. Guerin', 'Sergent'], ['V. Muller', 'Sapeur'], ['Y. Henry', 'Caporal'], ['P. Rousseau', 'Sapeur'], ['F. Vincent', 'Caporal'], ['G. Morel', 'Sapeur'], ['B. Andre', 'Caporal-chef'], ['M. Laurent', 'Sapeur'], ['S. Simon', 'Sapeur'], ['T. Michel', 'Caporal']];
    // Casernes fictives, réparties dans les cinq groupements
    var CIS = [['CIS Démo-sur-Marne', 'Nord'], ['CIS Val-Fictif', 'Nord'], ['CIS Bois-Exemple', 'Sud'], ['CIS Saint-Exemple', 'Sud'], ['CIS Mont-Fictif', 'Est'], ['CIS Rive-Exemple', 'Est'], ['CIS Pont-Exemple', 'Ouest'], ['CIS Ville-Démo', 'Centre'], ['CIS Plaine-Fictive', 'Centre']];
    var agents = [agentDemo].concat(names.map(function (x, k) { return user('SP-0' + (150 + k), x[0], 'agent', x[1], k % 10 < 7 ? 'SPV' : 'SPP'); }));
    users.forEach(function (u, k) { var c = u === agentDemo || u === cosDemo || u.role !== 'agent' && u.role !== 'cos' ? CIS[0] : CIS[k % CIS.length]; u.cis = c[0]; u.groupement = c[1]; });
    var T = {
      habitation: { c: ['Démo-sur-Marne', 'Val-Fictif', 'Saint-Exemple'], p: ['Pavillon, feu de cuisine', 'Appartement R+2', 'Feu de chambre'], e: ['FPT', 'EPA'], d: [60, 150] },
      vehicule: { c: ['Démo-sur-Marne', "Zone d'activités Fictive"], p: ['VL sur voie publique', 'Utilitaire', 'VL électrique'], e: ['FPT', 'VL'], d: [30, 75] },
      industriel: { c: ["Zone d'activités Fictive"], p: ['Entrepôt de stockage', 'Atelier mécanique'], e: ['FPT', 'FPTL'], d: [120, 300] },
      clos: { c: ['Démo-sur-Marne', 'Saint-Exemple'], p: ['Feu de cave', 'VL en parking souterrain', 'Local technique en sous-sol'], e: ['FPT', 'VL'], d: [60, 150] },
      cheminee: { c: ['Val-Fictif', 'Bois-Exemple'], p: ['Feu de conduit de cheminée'], e: ['FPT', 'EPA'], d: [45, 90] },
      vegetation: { c: ['Val-Fictif', 'Bois-Exemple'], p: ['Feu de broussailles', 'Feu de champ'], e: ['CCF', 'CCF'], d: [180, 600] },
      conteneur: { c: ['Démo-sur-Marne'], p: ['Conteneur à ordures', 'Benne de chantier'], e: ['FPT', 'VL'], d: [20, 45] },
      chimique: { c: ["Zone d'activités Fictive"], p: ['Fuite de produit en entrepôt'], e: ['FPT', 'VL'], d: [60, 180] }
    };
    var bag = ['habitation', 'habitation', 'habitation', 'vehicule', 'vehicule', 'industriel', 'clos', 'cheminee', 'vegetation', 'vegetation', 'conteneur', 'conteneur', 'chimique'];
    var CREW = ['conducteur', 'binome_attaque', 'binome_attaque', 'binome_alimentation', 'binome_alimentation', 'soutien'];
    var FCT = { chef_agres: ['commandement'], binome_attaque: ['attaque', 'deblai'], binome_alimentation: ['alimentation'], conducteur: ['conduite'], soutien: ['nettoyage'] };
    var DECS = ['DEC_LING_DOUCHE', 'DEC_LING_DOUCHE', 'DEC_LING_DOUCHE', 'DEC_LING_1H', 'DEC_LING_1H', 'DEC_DOUCHE_2H', 'DEC_DOUCHE_2H', 'DEC_LING_TARD', 'DEC_DOUCHE_TARD', 'DEC_AUCUNE'];
    var CIRCS = { industriel: ['AMIANTE', 'CRVI', 'NI'], habitation: ['PB', 'AMIANTE', 'VCM'], clos: ['VCM', 'SILICE'], vehicule: ['PB', 'CD'] };
    // Remplit la participation d'un agent selon le référentiel
    function fill(it, base, role, k) {
      var pos = VBSRef.defaultPosition(it, role), atk = role === 'binome_attaque';
      var zone = VBSRef.positions(it)[pos].zone; if (atk && rnd() < 0.2) zone = 'moyenne'; if (!atk && role !== 'chef_agres' && rnd() < 0.15) zone = 'moyenne';
      var dec = it.ambiance === 'aucun_feu' ? 'DEC_AUCUNE' : pick(DECS);
      var p = Object.assign(base, { position: pos, tactique: pos === 'POS_ATT' ? (rnd() < 0.4 ? 'TAC_TRANS' : 'TAC_INT') : '', duree_min: it.duree_min, contamination: zone,
        fonctions: FCT[role] || [], ari_porte: atk || (role === 'binome_alimentation' && rnd() < 0.4), ari_min: atk ? pick([15, 30, 45, 60]) : 0, ari_retire_deb: atk && rnd() < 0.15,
        tenue_complete: rnd() < 0.92, ffp3: role === 'soutien' || rnd() < 0.3, decon_type: dec, decon_validee: dec !== 'DEC_AUCUNE',
        lingettes: /LING/.test(dec), douche: /DOUCHE/.test(dec), tenue_changee: rnd() < 0.8, decon_ref: '', decon_heure: '' });
      if (dec !== 'DEC_AUCUNE' && rnd() < 0.6) { p.decon_ref = 'DS-' + ('000' + ri(1, 9999)).slice(-4); var fin = new Date(new Date(it.date.replace(' ', 'T')).getTime() + ((+it.duree_min || 60) + ri(10, 50)) * 60000); p.decon_heure = ('0' + fin.getHours()).slice(-2) + ':' + ('0' + fin.getMinutes()).slice(-2); }
      p.indice = indice(it, p);
      return p;
    }
    var interventions = [], participations = [];
    for (var i = 0; i < 64; i++) {
      var daysAgo = i === 0 ? 0 : Math.floor(i / 64 * 360) + ri(0, 5);
      var d = i === 0 ? new Date(now - 5 * 3600000) : new Date(now - daysAgo * DAY); if (i) d.setHours(ri(0, 23), ri(0, 59), 0, 0);
      var type = i === 0 ? 'vehicule' : pick(bag), t = T[type], cos = i % 3 === 2 ? pick(otherCos) : cosDemo;
      var statut = 'controle_sssm';
      if (daysAgo <= 1) statut = 'brouillon'; else if (daysAgo <= 10) statut = rnd() < 0.5 ? 'transmis' : 'controle_sssm';
      if (i === 6 || i === 9) statut = 'brouillon';
      var cc = CIRCS[type] && rnd() < 0.3 ? [pick(CIRCS[type])] : [];
      if (type === 'vegetation' && rnd() < 0.2) cc.push('bascule');
      var it = { id: id(), numero: 'INT-' + d.getFullYear() + '-' + String(4200 - i).padStart(5, '0'), date: d.toISOString(), type_feu: type, precision: i === 0 ? 'VL sur voie publique' : pick(t.p), commune: pick(t.c), centre: centre, cos: cos.id,
        zone_deshabillage: rnd() < 0.7 && statut !== 'brouillon', epi_ensaches: rnd() < 0.75 && statut !== 'brouillon', suspicion_amiante: statut !== 'brouillon' && cc.indexOf('AMIANTE') !== -1, statut: statut, ambiance: type === 'conteneur' && rnd() < 0.3 ? 'fumees_faibles' : type === 'chimique' ? 'aucun_feu' : 'feu_fumee',
        motorisation: type === 'vehicule' ? (rnd() < 0.2 ? 'lithium_ion' : 'thermique') : '', exposition_globale: statut !== 'brouillon' && cc.indexOf('PB') !== -1 && type === 'vehicule' ? 'Présence de batteries au plomb' : '', circonstances: statut === 'brouillon' ? [] : cc, duree_min: ri(t.d[0], t.d[1]) };
      interventions.push(it);
      var crew = [], pool = agents.slice();
      if (i % 2 === 0) crew.push(pool.splice(0, 1)[0]); else pool.splice(0, 1);
      var size = ri(3, 5); while (crew.length < size) crew.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
      if (crew[0] === agentDemo) { var at = ri(0, crew.length - 1); crew.splice(0, 1); crew.splice(at, 0, agentDemo); }
      [{ u: cos, r: 'chef_agres' }].concat(crew.map(function (u, k) { return { u: u, r: CREW[k % CREW.length] }; })).forEach(function (m, k) {
        var base = { id: id(), intervention: it.id, agent: m.u.id, role_tenu: m.r, engin: t.e[m.r === 'soutien' ? 1 : 0], created: it.date };
        // Rapport pas encore rempli : aucune donnée d'exposition
        if (statut === 'brouillon' && (i === 0 || rnd() < 0.5)) { participations.push(Object.assign(base, { contamination: 'nulle', indice: 0, fonctions: [], position: '', decon_type: '', duree_min: 0 })); return; }
        participations.push(fill(it, base, m.r, k));
      });
    }
    // Opérations à plusieurs agrès
    var operations = [], documents = [], opPrel = [], used = {};
    function crewFor(k) { var out = [], pool = agents.filter(function (a) { return !used[a.id]; }); while (out.length < k && pool.length) { var a = pool.splice(Math.floor(rnd() * pool.length), 1)[0]; used[a.id] = 1; out.push(a); } return out; }
    function mkOp(num, ago, type, prec, commune, cos) { var d = new Date(now - ago * DAY); d.setHours(ri(10, 20), ri(0, 59), 0, 0); var o = { id: id(), numero: 'OP-' + d.getFullYear() + '-' + num, date: d.toISOString(), type_feu: type, precision: prec, commune: commune, centre: centre, cos: cos.id }; operations.push(o); return o; }
    function mkReport(o, ca, engin, statut, withDemo) {
      var it = { id: id(), numero: o.numero.replace('OP', 'INT') + '-' + engin, date: o.date, type_feu: o.type_feu, precision: o.precision, commune: o.commune, centre: centre, cos: ca.id, operation: o.id, ambiance: 'feu_fumee', zone_deshabillage: true, epi_ensaches: true, suspicion_amiante: false, statut: statut, motorisation: '', exposition_globale: '', circonstances: o.type_feu === 'industriel' ? ['AMIANTE'] : [], duree_min: o.type_feu === 'industriel' ? 210 : 120 };
      interventions.push(it);
      var crew = crewFor(3); if (withDemo) crew[0] = agentDemo;
      return [{ u: ca, r: 'chef_agres' }].concat(crew.map(function (u, k) { return { u: u, r: CREW[k % CREW.length] }; })).map(function (m, k) {
        var base = { id: id(), intervention: it.id, agent: m.u.id, role_tenu: m.r, engin: engin, created: it.date };
        if (statut === 'brouillon') { participations.push(Object.assign(base, { contamination: 'nulle', indice: 0, fonctions: [], position: '', decon_type: '', duree_min: 0 })); return base; }
        var p = fill(it, base, m.r, k); participations.push(p); return p;
      });
    }
    var moreau = otherCos[0], fabre = otherCos[1];
    used[agentDemo.id] = 1;
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
    var signalements = participations.filter(function (p) { return p.contamination === 'forte' && p.position && byIt[p.intervention].cos === cosDemo.id; }).slice(0, 3).map(function (p, k) {
      return { id: id(), intervention: p.intervention, agents: [p.agent], auteur: cosDemo.id, niveau: k === 0 ? 'critique' : 'eleve', statut: ['ouvert', 'pris_en_charge', 'clos'][k], created: new Date(now - (k * 15 + 2) * DAY).toISOString(),
        motif: k === 0 ? 'Engagement prolongé en déblai, ARI retiré, fumées très denses, suie visible au niveau du cou.' : 'Exposition forte au déblai, décontamination sur place incomplète.' };
    });
    var prelevements = participations.filter(function (p) { return p.contamination === 'forte' && p.position; }).slice(0, 6).map(function (p, k) { return { id: id(), participation: p.id, type: 'hbco', valeur: Math.round((1.5 + rnd() * 6) * 10) / 10, unite: '%', date: new Date(now - (k * 20 + 2) * DAY).toISOString(), auteur: med.id }; });
    var late = interventions.filter(function (x) { return x.statut === 'brouillon' && x.cos === cosDemo.id && now - new Date(x.date) > 3 * DAY; })[0];
    var rappels = late ? [{ id: id(), intervention: late.id, de: ci.id, a: cosDemo.id, message: 'Merci de compléter ce rapport de contamination au plus vite.', created: new Date(now - DAY).toISOString() }] : [];
    var reglementation = [
      { id: id(), titre: "Fiche d'exposition après intervention à risque", resume: "Proposition de loi sur le suivi de l'exposition des sapeurs-pompiers aux agents CMR. Adoptée par le Sénat en mars 2025, examen en cours. Exemple de démonstration : statut à vérifier.", date: new Date(now - 20 * DAY).toISOString(), impact: 'a_suivre', source: 'Sénat · proposition de loi (2025)', lien: 'https://www.senat.fr/leg/tas24-084.html' },
      { id: id(), titre: 'Référentiel VB Safety v1.0 : validation médicale', resume: "Nouvelle méthode de calcul en équivalents-feu (position, tactique, type de sinistre, durée, décontamination). Les coefficients conventionnels doivent être validés par un médecin de sapeurs-pompiers avant mise en production.", date: new Date(now - 3 * DAY).toISOString(), impact: 'action_requise', source: 'Référentiel VB Safety v1.0', lien: '#referentiel' },
      { id: id(), titre: 'Tableaux de maladies professionnelles 16 bis et 30', resume: "Le décret n° 2025-1349 intègre les activités de lutte contre l'incendie (y compris formations, déblai et nettoyage du matériel) pour les sapeurs-pompiers professionnels et volontaires.", date: new Date(now - 60 * DAY).toISOString(), impact: 'info', source: 'Décret n° 2025-1349', lien: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053176919' },
      { id: id(), titre: 'Activité de sapeur-pompier classée cancérogène (groupe 1)', resume: 'Classement par le CIRC en 2022.', date: new Date(now - 400 * DAY).toISOString(), impact: 'info', source: 'CIRC · Monographie 132', lien: 'https://www.ncbi.nlm.nih.gov/books/NBK597253/' }
    ];
    // Tenues de feu : une veste, un surpantalon et une cagoule par agent, plus un stock au centre
    var tenues = [], mouv = [], num = 1000;
    var TT = { veste: 'V', surpantalon: 'P', cagoule: 'C' };
    function tenue(type, agent, statut, feux, depuis) { num++; var t = { id: id(), numero: TT[type] + '-' + num, type: type, agent: agent ? agent.id : '', centre: centre, statut: statut, nb_feux: feux, feux_depuis_lavage: depuis, nb_lavages: Math.floor(feux / 2), ef_cumul: Math.round(feux * (0.2 + rnd() * 0.3) * 100) / 100, seuil_feux: SEUIL, created: new Date(now - ri(200, 900) * DAY).toISOString() }; tenues.push(t); return t; }
    agents.concat([cosDemo], otherCos).forEach(function (u, k) {
      Object.keys(TT).forEach(function (ty) {
        var feux = ri(3, 26), dirty = u === agentDemo && ty !== 'surpantalon';
        if (u.matricule === 'SP-0157' && ty === 'veste') feux = 31;
        tenue(ty, u, dirty ? 'contaminee' : 'en_service', feux + (dirty ? 1 : 0), dirty ? 1 : 0);
      });
    });
    Object.keys(TT).forEach(function (ty) { for (var q = 0; q < 4; q++) tenue(ty, null, 'en_stock', ri(0, 12), 0); tenue(ty, null, 'au_lavage', ri(4, 20), 1); });
    // Tenues rendues après le feu de massif, déposées au centre en attente d'enlèvement
    [['veste', 'INT-' + new Date(now).getFullYear() + '-0802-R2-CCF1'], ['surpantalon', 'INT-' + new Date(now).getFullYear() + '-0802-R2-CCF1'], ['veste', 'INT-' + new Date(now).getFullYear() + '-0802-R2-CCF2'], ['cagoule', 'INT-' + new Date(now).getFullYear() + '-0802-R1-CCF3']].forEach(function (x) { var t = tenue(x[0], null, 'contaminee', ri(8, 22), ri(1, 3)); t.derniere_it = x[1]; });
    var kM = agents.filter(function (a) { return a.matricule === 'SP-0157'; })[0], lD = agents.filter(function (a) { return a.matricule === 'SP-0151'; })[0];
    mouv.push({ id: id(), type: 'demande', agent: kM.id, centre: centre, types: ['veste'], statut: 'envoyee', auto: true, motif: 'Seuil d\'alerte atteint : 31 feux depuis la mise en service (seuil 30).', created: new Date(now - DAY).toISOString() });
    mouv.push({ id: id(), type: 'changement', agent: lD.id, centre: centre, types: ['veste', 'surpantalon'], statut: 'traitee', auto: false, numeros: { veste: 'V-0987', surpantalon: 'P-0988' }, traite_par: hab.id, motif: 'Changement après intervention', created: new Date(now - 3 * DAY).toISOString() });
    mouv.push({ id: id(), type: 'changement', agent: agentDemo.id, centre: centre, types: ['cagoule'], statut: 'traitee', numeros: { cagoule: 'C-0998' }, traite_par: hab.id, motif: 'Changement après intervention', created: new Date(now - 9 * DAY).toISOString() });
    var ref_motifs = [
      { id: id(), motif: 'habitation', coef: 1, substances: ['HAP', 'BENZ', 'FORM', 'BUTA', 'DIOX', 'SUIE', 'CO'], circonstances: ['PB', 'AMIANTE'], statut: 'valide', valide_par: med.id, valide_le: new Date(now - 10 * DAY).toISOString(), commentaire: '' },
      { id: id(), motif: 'vehicule', coef: 0.6, substances: ['HAP', 'BENZ', 'FORM', 'BUTA', 'DIOX', 'SUIE', 'CO'], circonstances: ['PB', 'CD'], statut: 'valide', valide_par: med.id, valide_le: new Date(now - 10 * DAY).toISOString(), commentaire: '' }
    ];
    // ---------- Opération d'ampleur : feu de massif sur trois jours, avec relèves et colonne de renfort ----------
    var EXT = 'centre000000099';
    function extUser(m, name, r, grade) { var u = user(m, name, r, grade, 'SPV'); u.centre = EXT; u.renfort = 'Colonne de renfort · SDIS voisin (fictif)'; return u; }
    var extCa = [extUser('EXT-201', 'P. Arnaud', 'cos', 'Lieutenant'), extUser('EXT-202', 'G. Roux', 'cos', 'Adjudant')];
    var extAg = [['A. Colin', 'Caporal'], ['J. Masson', 'Sapeur'], ['L. Renard', 'Sapeur'], ['M. Picard', 'Caporal-chef'], ['N. Gauthier', 'Sapeur'], ['Q. Lemaire', 'Sapeur']].map(function (x, k) { return extUser('EXT-2' + (10 + k), x[0], 'agent', x[1]); });
    var t0 = new Date(now - 6 * DAY); t0.setHours(13, 40, 0, 0);
    var H = 3600000;
    var opF = { id: id(), numero: 'OP-' + t0.getFullYear() + '-0802', date: t0.toISOString(), date_fin: new Date(t0.getTime() + 53 * H + 20 * 60000).toISOString(), type_feu: 'vegetation', precision: 'Feu de massif forestier, environ 600 ha', commune: 'Bois-Exemple', centre: centre, cos: ci.id, ampleur: true, secteurs: ['Secteur Nord', 'Secteur Est', 'Secteur Sud'] };
    operations.push(opF);
    var cA = [agentDemo, agents[1], agents[2]], cB = [agents[3], agents[4], agents[5]], cC = [agents[6], agents[7], agents[8]], cD = [agents[9], agents[10], agents[11]];
    var e1 = extAg.slice(0, 3), e2 = extAg.slice(3);
    var CIS = 'CIS Démo-sur-Marne', CIS2 = 'CIS Val-Fictif', COL = 'Colonne de renfort · SDIS voisin (fictif)';
    // [relève, début (h après l'alerte), durée (h), engin, CA, équipage, origine, secteur, statut]
    var ENG = [
      [1, 0.33, 9.6, 'CCF 1', cosDemo, cA, CIS, 'Secteur Nord', 'controle_sssm'],
      [1, 0.58, 9, 'CCF 2', moreau, cB, CIS, 'Secteur Est', 'controle_sssm'],
      [1, 1.17, 8.5, 'CCF 3', fabre, cC, CIS2, 'Secteur Sud', 'controle_sssm'],
      [1, 4, 10, 'CCF R1', extCa[0], e1, COL, 'Secteur Est', 'transmis'],
      [2, 17.33, 11, 'CCF 1', cosDemo, cA, CIS, 'Secteur Nord', 'transmis'],
      [2, 17.5, 10.5, 'CCF 2', moreau, cD, CIS, 'Secteur Est', 'transmis'],
      [2, 18, 12, 'CCF R2', extCa[1], e2, COL, 'Secteur Sud', 'transmis'],
      [3, 42.33, 9, 'CCF 3', fabre, cC, CIS2, 'Secteur Sud', 'transmis'],
      [3, 42.5, 10, 'CCF 1', cosDemo, cB, CIS, 'Secteur Nord', 'brouillon'],
      [3, 43, 8, 'CCF R1', extCa[0], e1, COL, 'Secteur Est', 'transmis']
    ];
    var VEG_ROLES = ['conducteur', 'binome_attaque', 'binome_attaque'];
    ENG.forEach(function (g, k) {
      var start = new Date(t0.getTime() + g[1] * H), dur = Math.round(g[2] * 60);
      var it = { id: id(), numero: 'INT-' + t0.getFullYear() + '-0802-R' + g[0] + '-' + g[3].replace(/\s+/g, ''), date: start.toISOString(), type_feu: 'vegetation', precision: opF.precision + ' · ' + g[7], commune: opF.commune, centre: g[4].centre, cos: g[4].id, operation: opF.id,
        ambiance: 'feu_fumee', zone_deshabillage: g[0] > 1, epi_ensaches: g[0] > 1, suspicion_amiante: false, statut: g[8], motorisation: '', exposition_globale: '', circonstances: k === 2 ? ['bascule'] : [], duree_min: dur,
        releve: g[0], secteur: g[7], origine: g[6], engin: g[3] };
      if (g[8] === 'controle_sssm') { it.valide_le = new Date(start.getTime() + 2 * DAY).toISOString(); it.valide_par = med.id; }
      interventions.push(it);
      [{ u: g[4], r: 'chef_agres' }].concat(g[5].map(function (u, j) { return { u: u, r: VEG_ROLES[j % 3] }; })).forEach(function (m, j) {
        var base = { id: id(), intervention: it.id, agent: m.u.id, role_tenu: m.r, engin: g[3], created: it.date };
        if (g[8] === 'brouillon') { participations.push(Object.assign(base, { contamination: 'nulle', indice: 0, fonctions: [], position: '', decon_type: '', duree_min: 0 })); return; }
        var p = fill(it, base, m.r, j);
        // Feu de végétation : pas d'ARI, décontamination souvent différée au retour
        p.ari_porte = false; p.ari_min = 0; p.ari_retire_deb = false; p.ffp3 = rnd() < 0.35;
        p.decon_type = g[0] === 1 ? pick(['DEC_LING_TARD', 'DEC_DOUCHE_TARD', 'DEC_LING_TARD', 'DEC_AUCUNE']) : pick(['DEC_LING_1H', 'DEC_LING_DOUCHE', 'DEC_LING_TARD']);
        p.decon_validee = p.decon_type !== 'DEC_AUCUNE'; p.lingettes = /LING/.test(p.decon_type); p.douche = /DOUCHE/.test(p.decon_type); p.decon_ref = ''; p.decon_heure = '';
        p.indice = indice(it, p);
        participations.push(p);
      });
    });

    // ---------- Activités exposantes hors intervention : formations, entretien du matériel ----------
    var activites = [];
    function session(type, ago, hour, dur, intitule, lieu, people, opt) {
      var d = new Date(now - ago * DAY); d.setHours(hour, 0, 0, 0);
      var a = Object.assign({ id: id(), type: type, date: d.toISOString(), duree_min: dur, intitule: intitule, lieu: lieu, agents: people.map(function (u) { return u.id; }), auteur: cosDemo.id, centre: centre, ari: false, decon_type: 'DEC_LING_DOUCHE', pfas: false }, opt || {});
      activites.push(a); return a;
    }
    session('caisson', 300, 9, 240, "FMPA · caisson d'observation des phénomènes thermiques", 'Plateau technique fictif', [agentDemo, agents[1], agents[2], agents[3], agents[4], cosDemo], { ari: true });
    session('brulage', 205, 10, 360, 'Brûlage dirigé de prévention (débroussaillement)', 'Bois-Exemple', [agentDemo, agents[5], agents[6], agents[9], moreau], { decon_type: 'DEC_LING_TARD' });
    session('nettoyage', 178, 14, 120, 'Reconditionnement des tuyaux et des ARI après le feu d\'entrepôt', CIS, [agentDemo, agents[7], agents[8]], { decon_type: 'DEC_LING_1H' });
    session('feu_reel', 122, 8, 300, 'Formation feu réel en conteneur (FDF 1)', 'Plateau technique fictif', [agentDemo, agents[1], agents[10], agents[11], agents[12], cosDemo, fabre], { ari: true });
    session('mousse', 88, 9, 150, 'Manœuvre mousse · émulseur fluoré (ancien stock, avant remplacement)', CIS2, [agents[2], agents[3], agents[13], agents[14], moreau], { pfas: true, decon_type: 'DEC_DOUCHE_2H' });
    session('caisson', 34, 9, 240, "FMPA · caisson d'observation des phénomènes thermiques", 'Plateau technique fictif', [cosDemo, agents[4], agents[5], agents[15], agents[16]], { ari: true });
    session('nettoyage', 2, 9, 150, 'Nettoyage des CCF et du matériel après le feu de massif', CIS, [agentDemo, agents[1], agents[2]], { decon_type: 'DEC_LING_DOUCHE' });
    session('feu_reel', 420, 8, 300, 'Formation feu réel en conteneur (FDF 1)', 'Plateau technique fictif', [agentDemo, agents[3], agents[6]], { ari: true });

    return { ref_motifs: ref_motifs, users: users, activites: activites, operations: operations, documents: documents, interventions: interventions, participations: participations, rendez_vous: rdv, signalements: signalements, prelevements: prelevements.concat(opPrel), referentiel: [], reglementation: reglementation, rappels: rappels, tenues: tenues, mouvements_epi: mouv, parametres: [],
      demo: { agent: agentDemo.id, cos: cosDemo.id, commandement: ci.id, sssm: med.id, habillement: hab.id, admin: adm.id } };
  }

  // Mêmes règles de lecture que le serveur
  function filterFor(all, role, meId) {
    var me = all.users.find(function (u) { return u.id === meId; });
    // Copies : la normalisation ajoute des liens (it, user, crew) qui ne doivent pas polluer l'état stocké
    var all0 = all; all = {}; COLS.forEach(function (c) { all[c] = all0[c].map(function (r) { return Object.assign({}, r); }); });
    var v = {}; COLS.forEach(function (c) { v[c] = all[c].slice(); });
    if (role === 'admin') {
      // Administrateur : réglages et annuaire du centre, aucune donnée opérationnelle ni d'exposition
      COLS.forEach(function (c) { if (c !== 'users' && c !== 'parametres') v[c] = []; });
      v.users = all.users.filter(function (u) { return u.centre === me.centre; });
    } else if (role === 'agent') {
      v.participations = all.participations.filter(function (p) { return p.agent === meId; });
      var ids = v.participations.map(function (p) { return p.intervention; });
      v.interventions = all.interventions.filter(function (x) { return ids.indexOf(x.id) !== -1; });
      v.rendez_vous = all.rendez_vous.filter(function (r) { return r.agent === meId; }); v.users = [me];
      v.signalements = []; v.prelevements = []; v.reglementation = []; v.rappels = []; v.operations = []; v.documents = [];
      v.tenues = []; v.mouvements_epi = [];
      v.activites = all.activites.filter(function (a) { return (a.agents || []).indexOf(meId) !== -1; });
    } else if (role === 'cos') {
      var myOps = all.operations.filter(function (o) { return o.cos === meId; }).map(function (o) { return o.id; });
      v.interventions = all.interventions.filter(function (x) { return x.cos === meId || myOps.indexOf(x.operation) !== -1; });
      v.documents = [];
      var its = all.interventions.filter(function (x) { return x.cos === meId; }).map(function (x) { return x.id; });
      v.participations = all.participations.filter(function (p) { return its.indexOf(p.intervention) !== -1; });
      v.rendez_vous = all.rendez_vous.filter(function (r) { return r.agent === meId; });
      v.signalements = all.signalements.filter(function (s) { return s.auteur === meId; });
      v.users = all.users.filter(function (u) { return u.centre === me.centre || u.renfort; });
      v.activites = all.activites.filter(function (a) { return a.auteur === meId || (a.agents || []).indexOf(meId) !== -1; });
      v.prelevements = []; v.reglementation = []; v.rappels = all.rappels.filter(function (r) { return r.a === meId || r.de === meId; });
      v.tenues = []; v.mouvements_epi = [];
    } else if (role === 'habillement') {
      ['interventions', 'participations', 'rendez_vous', 'signalements', 'prelevements', 'documents', 'reglementation', 'rappels', 'operations', 'referentiel', 'ref_motifs', 'activites'].forEach(function (c) { v[c] = []; });
      v.users = all.users.filter(function (u) { return u.centre === me.centre; });
      v.tenues = all.tenues.filter(function (t) { return t.centre === me.centre; }); v.mouvements_epi = all.mouvements_epi.filter(function (m) { return m.centre === me.centre; });
    } else if (role === 'commandement') {
      v.tenues = []; v.mouvements_epi = [];
      v.participations = []; v.rendez_vous = []; v.signalements = []; v.prelevements = []; v.documents = []; v.activites = [];
      v.users = all.users.filter(function (u) { return u.centre === me.centre || u.renfort; });
      v.rappels = all.rappels.filter(function (r) { return r.a === meId || r.de === meId; });
    } else {
      v.rappels = []; v.mouvements_epi = []; v.tenues = [];
    }
    v.interventions.sort(function (a, b) { return parseD(b.date) - parseD(a.date); });
    return v;
  }
  function offlineView(s) {
    if (!offline) offline = loadOffline() || generateRaw();
    COLS.forEach(function (c) { if (!offline[c]) offline[c] = []; });
    var meId = offline.demo[s.role];
    return normalise(filterFor(offline, s.role, meId), meId);
  }

  // ---------------------------------------------------------------- commun
  function parseD(v) { return v ? new Date(String(v).replace(' ', 'T')) : null; }
  function normalise(db, meId) {
    var byId = {};
    db.users.forEach(function (u) { byId[u.id] = u; });
    var ops = {};
    db.operations.forEach(function (o) { o.dateObj = parseD(o.date); o.finObj = o.date_fin ? parseD(o.date_fin) : null; o.cosUser = byId[o.cos]; o.reports = []; ops[o.id] = o; });
    var inter = {};
    db.interventions.forEach(function (x) { x.dateObj = parseD(x.date); x.finObj = new Date(x.dateObj.getTime() + (+x.duree_min || 0) * 60000); inter[x.id] = x; x.cosUser = byId[x.cos]; x.crew = []; x.op = x.operation ? ops[x.operation] || null : null; if (x.op) x.op.reports.push(x); });
    db.participations.forEach(function (p) { p.it = inter[p.intervention]; p.user = byId[p.agent]; if (p.it) p.it.crew.push(p); });
    db.rendez_vous.forEach(function (r) { r.dateObj = parseD(r.date); r.user = byId[r.agent]; });
    db.signalements.forEach(function (s) { s.it = inter[s.intervention]; s.createdObj = parseD(s.created); });
    db.rappels.forEach(function (r) { r.it = inter[r.intervention]; r.createdObj = parseD(r.created); });
    db.rdv = db.rendez_vous;
    db.documents.forEach(function (d) { d.createdObj = parseD(d.created); d.op = ops[d.operation] || null; });
    (db.tenues || []).forEach(function (t) { t.user = byId[t.agent] || null; });
    (db.mouvements_epi || []).forEach(function (m) { m.user = byId[m.agent] || null; m.createdObj = parseD(m.created); });
    db.activites = (db.activites || []).map(function (a) { a.dateObj = parseD(a.date); return a; }).sort(function (a, b) { return b.dateObj - a.dateObj; });
    db.ref_motifs = db.ref_motifs || [];
    db.parametres = db.parametres || [];
    db.configRec = db.parametres.filter(function (r) { return r.cle === 'config'; })[0] || null;
    db.config = w.VBSParam ? VBSParam.merge(db.configRec && db.configRec.valeur) : null;
    if (VBSRef.setMotifs) VBSRef.setMotifs(db.ref_motifs, byId);
    db.ops = ops; db.byId = byId; db.inter = inter; db.meId = meId; db.me = byId[meId] || null;
    db.mine = db.participations.filter(function (p) { return p.agent === meId && p.it; }).sort(function (a, b) { return b.it.dateObj - a.it.dateObj; });
    return db;
  }

  function reportState(it) {
    if (it.statut === 'controle_sssm') return 'controle';
    if (it.statut === 'transmis') return 'transmis';
    return (Date.now() - it.dateObj) > 72 * 3600000 ? 'retard' : 'attente';
  }

  // ---------------------------------------------------------------- règles EPI (mêmes règles que le serveur, pb_hooks/epi.js)
  // Après la transmission d'un rapport sur feu, les tenues des agents engagés sont considérées comme contaminées.
  function epiContaminer(all, it) {
    if (!it || it.ambiance === 'aucun_feu') return;
    all.participations.filter(function (p) { return p.intervention === it.id && p.position; }).forEach(function (p) {
      all.tenues.filter(function (t) { return t.agent === p.agent && (t.statut === 'en_service' || t.statut === 'contaminee'); }).forEach(function (t) {
        t.statut = 'contaminee'; t.derniere_it = it.numero; t.nb_feux = (+t.nb_feux || 0) + 1; t.feux_depuis_lavage = (+t.feux_depuis_lavage || 0) + 1; t.ef_cumul = Math.round(((+t.ef_cumul || 0) + (+p.indice || 0)) * 100) / 100;
        var seuil = +t.seuil_feux || SEUIL;
        var open = all.mouvements_epi.some(function (m) { return m.agent === p.agent && m.type === 'demande' && m.statut === 'envoyee' && (m.types || []).indexOf(t.type) !== -1; });
        if (t.nb_feux >= seuil && !open) all.mouvements_epi.push({ id: newId(), created: new Date().toISOString(), type: 'demande', agent: p.agent, centre: t.centre, types: [t.type], statut: 'envoyee', auto: true, motif: "Seuil d'alerte atteint : " + t.nb_feux + ' feux depuis la mise en service (seuil ' + seuil + ').' });
      });
    });
  }
  // Changement de tenue déclaré par l'agent : l'ancienne part au lavage, la nouvelle lui est attribuée.
  function epiChangement(all, m) {
    if (m.type !== 'changement') return;
    (m.types || []).forEach(function (ty) {
      var old = all.tenues.filter(function (t) { return t.agent === m.agent && t.type === ty && t.statut !== 'reformee'; })[0];
      if (old) { old.agent = ''; old.statut = 'contaminee'; }
      var numero = String((m.numeros || {})[ty] || '').trim().toUpperCase(); if (!numero) return;
      var nt = all.tenues.filter(function (t) { return t.numero.toUpperCase() === numero && t.centre === m.centre; })[0];
      if (!nt) { nt = { id: newId(), created: new Date().toISOString(), numero: numero, type: ty, centre: m.centre, nb_feux: 0, feux_depuis_lavage: 0, nb_lavages: 0, ef_cumul: 0, seuil_feux: SEUIL }; all.tenues.push(nt); }
      nt.agent = m.agent; nt.statut = 'en_service';
    });
    m.statut = 'traitee';
  }

  // ---------------------------------------------------------------- écritures
  function clean(data) {
    var o = {}; Object.keys(data).forEach(function (k) { var v = data[k]; if (v !== undefined && typeof v !== 'function' && ['it', 'user', 'crew', 'dateObj', 'cosUser', 'op', 'reports', 'createdObj', 'finObj'].indexOf(k) === -1) o[k] = v; }); return o;
  }
  async function create(s, col, data) {
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      if (!s.offline) return VBS.upload('/api/collections/' + col + '/records', data);
      var o = {}; data.forEach(function (v, k) { o[k] = (typeof File !== 'undefined' && v instanceof File) ? v.name : v; }); data = o;
    }
    data = clean(data);
    if (!s.offline) return VBS.request('/api/collections/' + col + '/records', { method: 'POST', body: data });
    var rec = Object.assign({ id: newId(), created: new Date().toISOString() }, data);
    offline[col].push(rec);
    if (col === 'mouvements_epi') epiChangement(offline, rec);
    saveOffline(); return rec;
  }
  async function update(s, col, id, data) {
    data = clean(data);
    if (!s.offline) return VBS.request('/api/collections/' + col + '/records/' + id, { method: 'PATCH', body: data });
    var rec = offline[col].find(function (r) { return r.id === id; });
    if (!rec) throw new Error('Enregistrement introuvable');
    var before = rec.statut;
    Object.assign(rec, data);
    if (col === 'interventions' && before === 'brouillon' && rec.statut && rec.statut !== 'brouillon') epiContaminer(offline, rec);
    saveOffline(); return rec;
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
    reportState: reportState, DAY: DAY, SEUIL: SEUIL
  };
})(window);
