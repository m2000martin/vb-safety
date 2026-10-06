// Messages au format national CISU (Cadre d'interopérabilité des services d'urgence),
// tels qu'échangés entre le 15 et le 18 via le Hub Santé de l'ANS :
//   RC-EDA  « createCase »         création d'affaire (nature, lieu)
//   RC-RI   « resourcesInfoCisu »  moyens engagés (engins, statuts horodatés)
// Modèles publics : https://github.com/ansforge/SAMU-Hub-Modeles (Apache-2.0).
//
// Ce module sait :
//   - générer des messages fictifs conformes (démonstration) ;
//   - lire un message reçu et en déduire l'intervention du Carnet :
//     nature → type de feu (référentiel CMR), commune, début, durée sur les lieux, engins.
// L'équipage nominatif n'existe pas dans ces messages : il reste à saisir par le CA
// (ou à importer depuis le CRSS).
(function (root) {
  // ------------------------------------------------------------------ nomenclature (extrait, v2.3)
  // Natures de faits utilisées par la démo. Codes et libellés de la nomenclature CISU.
  var NATURES = {
    'C04.02.00': "Incendie d'un bâtiment",
    'C04.02.01': "Incendie - Bâtiment d'habitation",
    'C04.02.05': "Incendie d'ERP avec locaux à sommeil",
    'C04.02.06': "Incendie d'ERP sans locaux à sommeil",
    'C04.01.01': 'Véhicule léger, fourgon',
    'C04.01.12': 'Incendie engin de chantier ou agricole',
    'C01.06.01': 'Accident routier véhicule léger / fourgon, suivi de feu',
    'C04.05.03': 'Feu de broussailles',
    'C04.05.04': 'Feu de forêt',
    'C04.10.01': 'Feu de cheminée',
    'C04.07.01': 'Feu de produits de classe A',
    'C04.07.02': 'Feu de produits de classe B',
    'C04.11.00': 'Fumée suspecte / levée de doute',
    'C11.01.01': 'Alarme incendie',
    'C02.07.04': 'Personne exposée à produits chimiques ou toxiques / NRBC'
  };

  // ------------------------------------------------------------------ nature CISU → type du Carnet
  // Renvoie { type, ambiance, regle } ; type null = intervention sans exposition aux fumées.
  function typeFor(code, lieu) {
    code = String(code || ''); lieu = String(lieu || '');
    var pro = /^L0[36]\./.test(lieu); // local d'activité professionnelle, site industriel ou énergétique
    if (code === 'C02.07.04') return { type: 'chimique', ambiance: 'aucun_feu', regle: 'Risque chimique ou NRBC' };
    if (code === 'C04.10.01') return { type: 'cheminee', ambiance: 'feu_fumee', regle: 'Feu de cheminée' };
    if (/^C04\.05\./.test(code) || (code === 'C04.07.00' && /^L05\./.test(lieu))) return { type: 'vegetation', ambiance: 'feu_fumee', regle: 'Feu de végétation' };
    if (/^C04\.01\./.test(code) || /^C01\.06\./.test(code)) return { type: 'vehicule', ambiance: 'feu_fumee', regle: 'Incendie de véhicule ou de moyen de transport' };
    if (/^C04\.02\./.test(code)) return pro ? { type: 'industriel', ambiance: 'feu_fumee', regle: "Incendie de bâtiment sur un lieu d'activité professionnelle" } : { type: 'habitation', ambiance: 'feu_fumee', regle: 'Incendie de bâtiment' };
    if (code === 'C04.07.01' || lieu === 'L01.02.13') return { type: 'conteneur', ambiance: 'feu_fumee', regle: 'Feu de produits de classe A, poubelle ou conteneur' };
    if (/^C04\.07\.0[234]$/.test(code)) return { type: 'industriel', ambiance: 'feu_fumee', regle: 'Feu de liquides, de gaz ou de métaux' };
    if (code === 'C04.11.00') return { type: 'autre', ambiance: 'fumees_faibles', regle: 'Fumée suspecte, levée de doute' };
    if (code === 'C04.09.00' || code === 'C11.01.01') return { type: null, ambiance: 'aucun_feu', regle: "Alarme incendie sans feu : pas de rapport de contamination (le CA en crée un s'il a constaté des fumées)" };
    if (/^C04\./.test(code)) return pro ? { type: 'industriel', ambiance: 'feu_fumee', regle: "Incendie sur un lieu d'activité professionnelle" } : { type: 'habitation', ambiance: 'feu_fumee', regle: 'Incendie (autre)' };
    return { type: null, ambiance: 'aucun_feu', regle: 'Hors incendie : pas de rapport de contamination' };
  }

  // ------------------------------------------------------------------ outils
  function d2(n) { return String(n).padStart(2, '0'); }
  // Date ISO 8601 avec décalage horaire, format exigé par les schémas (sans millisecondes)
  function iso(d) {
    var off = -d.getTimezoneOffset(), s = off >= 0 ? '+' : '-', a = Math.abs(off);
    return d.getFullYear() + '-' + d2(d.getMonth() + 1) + '-' + d2(d.getDate()) + 'T' + d2(d.getHours()) + ':' + d2(d.getMinutes()) + ':' + d2(d.getSeconds()) + s + d2(Math.floor(a / 60)) + ':' + d2(a % 60);
  }
  function uuid() {
    var h = '0123456789abcdef', o = '';
    for (var i = 0; i < 32; i++) o += h[Math.floor(Math.random() * 16)];
    return o.slice(0, 8) + '-' + o.slice(8, 12) + '-4' + o.slice(13, 16) + '-a' + o.slice(17, 20) + '-' + o.slice(20);
  }
  function envelope(sender, recipient, sentAt, kind, payloadKey, payload) {
    var id = sender + '_' + uuid();
    var msg = { messageId: id, sender: { name: sender.split('.').pop(), URI: 'hubex:' + sender }, sentAt: sentAt, kind: kind, status: 'Actual', recipient: [{ name: recipient.split('.').pop(), URI: 'hubex:' + recipient }] };
    msg[payloadKey] = payload;
    return {
      distributionID: id, senderID: sender, dateTimeSent: sentAt, dateTimeExpires: iso(new Date(Date.parse(sentAt) + 365 * 864e5)),
      distributionStatus: 'Actual', distributionKind: kind,
      descriptor: { language: 'fr-FR', explicitAddress: { explicitAddressScheme: 'hubex', explicitAddressValue: recipient } },
      content: [{ jsonContent: { embeddedJsonContent: { message: msg } } }]
    };
  }

  // ------------------------------------------------------------------ scénarios de démonstration (fictifs)
  var SCENARIOS = {
    habitation: { nature: 'C04.02.01', lieu: ['L01.01.01', "Maison particulière, pavillon, à l'intérieur"], risques: [], commune: ['Démo-sur-Marne', '77991'], rue: 'rue des Lilas', num: '12', engins: ['FPT 1', 'EPA 1'], surPlace: [70, 140], label: "Feu de pavillon" },
    erp: { nature: 'C04.02.05', lieu: null, risques: [['R23', 'Second risque']], commune: ['Val-Fictif', '77992'], rue: 'avenue de la Gare', num: '4', engins: ['FPT 1', 'EPA 1', 'VSAV 1'], surPlace: [90, 180], label: "Incendie d'un hôtel" },
    vehicule: { nature: 'C04.01.01', lieu: null, risques: [], commune: ["Zone d'activités Fictive", '77993'], rue: 'route départementale 99', num: '', engins: ['FPT 1'], surPlace: [30, 60], label: 'Feu de véhicule léger' },
    entrepot: { nature: 'C04.02.00', lieu: ['L03.05.00', "Autre local d'activité professionnelle"], risques: [], commune: ["Zone d'activités Fictive", '77993'], rue: 'allée des Entrepôts', num: '7', engins: ['FPT 1', 'FPTL 1', 'EPA 1'], surPlace: [150, 300], label: "Feu d'entrepôt" },
    agricole: { nature: 'C04.01.12', lieu: ['L03.02.02', 'Hangar agricole'], risques: [], commune: ['Bois-Exemple', '77994'], rue: 'chemin de la Ferme', num: '', engins: ['FPT 1', 'CCF 1'], surPlace: [60, 150], label: "Feu d'engin agricole sous hangar" },
    vegetation: { nature: 'C04.05.03', lieu: ['L05.01.01', 'Champ / prairie'], risques: [], commune: ['Bois-Exemple', '77994'], rue: 'lieu-dit les Friches', num: '', engins: ['CCF 1', 'CCF 2'], surPlace: [120, 360], label: 'Feu de broussailles' },
    cheminee: { nature: 'C04.10.01', lieu: null, risques: [], commune: ['Val-Fictif', '77992'], rue: 'impasse du Moulin', num: '3', engins: ['FPT 1', 'EPA 1'], surPlace: [45, 90], label: 'Feu de cheminée' },
    poubelle: { nature: 'C04.07.01', lieu: ['L01.02.13', "Local poubelle / vide ordure de l'immeuble"], risques: [], commune: ['Démo-sur-Marne', '77991'], rue: 'rue Pasteur', num: '18', engins: ['FPT 1'], surPlace: [20, 45], label: 'Feu de local poubelle' },
    alarme: { nature: 'C11.01.01', lieu: null, risques: [], commune: ['Saint-Exemple', '77995'], rue: 'boulevard du Centre', num: '25', engins: ['FPT 1'], surPlace: [15, 30], label: 'Alarme incendie (levée de doute)' }
  };
  var SCENARIO_LABELS = {}; Object.keys(SCENARIOS).forEach(function (k) { SCENARIO_LABELS[k] = SCENARIOS[k].label; });

  // Génère un échange fictif complet : création d'affaire + moyens engagés
  function generate(key, opts) {
    opts = opts || {};
    var sc = SCENARIOS[key] || SCENARIOS.habitation;
    var now = opts.now ? new Date(opts.now) : new Date();
    var ri = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
    var surPlace = ri(sc.surPlace[0], sc.surPlace[1]);
    var tAlerte = new Date(now.getTime() - (surPlace + ri(40, 90)) * 60000); tAlerte.setSeconds(0, 0);
    var org = 'fr.fire.sis-demo', hub = 'fr.health.samu-demo';
    var num = String(ri(10000, 99999));
    var caseId = org + '.case.D' + tAlerte.getFullYear() + num;
    var addr = (sc.num ? sc.num + ' ' : '') + sc.rue;
    var qualification = { whatsHappen: { code: sc.nature, label: NATURES[sc.nature] } };
    if (sc.lieu) qualification.locationKind = { code: sc.lieu[0], label: sc.lieu[1] };
    if (sc.risques.length) qualification.riskThreat = sc.risques.map(function (r) { return { code: r[0], label: r[1] }; });
    var createCase = {
      caseId: caseId, senderCaseId: 'D' + tAlerte.getFullYear() + num, creation: iso(tAlerte), referenceVersion: '1.3',
      qualification: qualification,
      location: {
        locID: uuid(), locLabel: addr + ' - ' + sc.commune[1] + ' ' + sc.commune[0],
        detailedAddress: { complete: addr },
        city: { name: sc.commune[0], inseeCode: sc.commune[1] },
        geometry: { datetime: iso(tAlerte), point: { coord: { lat: 48.6 + Math.random() * 0.2, lon: 2.6 + Math.random() * 0.4, precision: 'ADRESSE' } } },
        country: 'FR'
      },
      freetext: ['Données fictives générées pour la démonstration VB Safety']
    };
    // Un message RC-RI par changement de statut, comme dans les échanges réels :
    // chaque message donne l'état courant de tous les engins engagés.
    var plan = sc.engins.map(function (name, k) {
      var dec = new Date(tAlerte.getTime() + (1 + k * 3) * 60000);
      var dep = new Date(dec.getTime() + ri(1, 3) * 60000);
      var arr = new Date(dep.getTime() + ri(6, 15) * 60000);
      var fin = new Date(arr.getTime() + (k === 0 ? surPlace : Math.max(15, surPlace - ri(5, 30))) * 60000);
      var ret = new Date(fin.getTime() + ri(8, 20) * 60000);
      var abbr = name.split(' ')[0];
      return { name: name, abbr: abbr, k: k, steps: [['DECLENCHE', dec], ['DEPART', dep], ['ARRIVEE', arr], ['RETOUR', fin], ['RET-BASE', ret]] };
    });
    var instants = [];
    plan.forEach(function (e) { e.steps.forEach(function (st) { instants.push(st[1].getTime()); }); });
    instants = instants.filter(function (t, i, a) { return a.indexOf(t) === i; }).sort(function (a, b) { return a - b; });
    var out = [envelope(org, hub, iso(tAlerte), 'Report', 'createCase', createCase)];
    instants.forEach(function (t) {
      var resource = plan.filter(function (e) { return e.steps[0][1].getTime() <= t; }).map(function (e) {
        var cur = e.steps.filter(function (st) { return st[1].getTime() <= t; }).pop();
        var r = { datetime: iso(e.steps[0][1]), resourceId: org + '.resource.' + e.abbr + '-' + (e.k + 1), orgId: org, centerName: 'CIS Démo-sur-Marne', centerCity: '77991',
          vehicleType: 'SIS', name: e.name + ' CIS Démo-sur-Marne', team: { name: 'Équipage ' + e.name },
          state: { datetime: iso(cur[1]), status: cur[0] } };
        if (cur[0] === 'RET-BASE') r.state.availability = true;
        return r;
      });
      out.push(envelope(org, hub, iso(new Date(t)), 'Report', 'resourcesInfoCisu', { caseId: caseId, resource: resource }));
    });
    return out;
  }

  // ------------------------------------------------------------------ lecture d'un message reçu
  // Accepte : enveloppe EDXL-DE, message seul, tableau de messages, ou contenu direct.
  function collect(o, out) {
    if (!o || typeof o !== 'object') return out;
    if (Array.isArray(o)) { o.forEach(function (x) { collect(x, out); }); return out; }
    if (o.createCase) out.cases.push(o.createCase);
    if (o.resourcesInfoCisu) out.res.push(o.resourcesInfoCisu);
    if (o.caseId && o.qualification && o.location && !o.createCase) out.cases.push(o);
    if (o.caseId && Array.isArray(o.resource) && !o.resourcesInfoCisu) out.res.push(o);
    Object.keys(o).forEach(function (k) { if (k !== 'createCase' && k !== 'resourcesInfoCisu' && typeof o[k] === 'object') collect(o[k], out); });
    return out;
  }
  var DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[-+]\d{2}:\d{2}$/;
  var ENGIN_RE = /\b(FPTL|FPTSR|FPT|FMOGP|EPAN|EPA|EPC|CCFM|CCGC|CCF|VSAV|VSR|VTU|VLHR|VL|BEA|CEMOY)\b/;

  function parse(input) {
    var data = input;
    if (typeof input === 'string') {
      try { data = JSON.parse(input); } catch (e) { throw new Error("Le fichier n'est pas un JSON valide."); }
    }
    var found = collect(data, { cases: [], res: [] });
    if (!found.cases.length) throw new Error("Aucun message de création d'affaire (RC-EDA, « createCase ») trouvé.");
    var c = found.cases[0], errs = [], warn = [];
    // Contrôles des champs obligatoires du schéma RC-EDA
    if (!c.caseId) errs.push('caseId manquant');
    if (!c.creation || !DATE_RE.test(c.creation)) errs.push('creation absente ou mal formée');
    var wh = c.qualification && c.qualification.whatsHappen;
    if (!wh || !/^C\d{2}(\.\d{2}){2}$/.test(wh.code || '')) errs.push('qualification.whatsHappen.code absent ou mal formé');
    if (!c.location || !c.location.locID || !c.location.country) errs.push('location.locID ou location.country manquant');
    if (errs.length) throw new Error('Message RC-EDA non conforme : ' + errs.join(', ') + '.');

    var lieu = c.qualification.locationKind || null;
    var map = typeFor(wh.code, lieu && lieu.code);
    var city = (c.location.city && c.location.city.name) || '';
    var addr = (c.location.detailedAddress && c.location.detailedAddress.complete) || c.location.locLabel || '';

    // Moyens engagés pour cette affaire : l'historique des statuts se reconstitue
    // à partir de la suite des messages RC-RI (un état courant par message).
    var byRes = {}, order = [], other = 0;
    found.res.forEach(function (r) {
      if (r.caseId !== c.caseId) { other++; return; }
      (r.resource || []).forEach(function (x) {
        var key = x.resourceId || x.name;
        if (!byRes[key]) { byRes[key] = { r: x, states: [] }; order.push(key); }
        byRes[key].r = Object.assign({}, byRes[key].r, x);
        [].concat(x.state || []).forEach(function (st) {
          if (!st || !DATE_RE.test(st.datetime || '')) return;
          if (!byRes[key].states.some(function (y) { return y.status === st.status && y.datetime === st.datetime; })) byRes[key].states.push(st);
        });
      });
    });
    if (other && !order.length) warn.push('Les moyens engagés reçus concernent une autre affaire : ils sont ignorés.');
    var engins = order.map(function (key) {
      var r = byRes[key].r;
      var st = byRes[key].states.map(function (s) { return { status: s.status, t: new Date(Date.parse(s.datetime)) }; }).sort(function (a, b) { return a.t - b.t; });
      var at = function (codes, after) { var s = st.filter(function (x) { return codes.indexOf(x.status) !== -1 && (!after || x.t >= after); }); return s.length ? s[0].t : null; };
      var depart = at(['DEPART']), arr = at(['ARRIVEE']);
      var fin = at(['RETOUR', 'FINPEC'], arr) || at(['RET-BASE', 'REN-BASE'], arr), base = at(['RET-BASE', 'REN-BASE'], arr);
      var m = ENGIN_RE.exec(String(r.name || '') + ' ' + String(r.resourceId || ''));
      return { nom: r.name || r.resourceId, code: m ? m[1] : '', type: r.vehicleType, centre: r.centerName || '', depart: depart, arrivee: arr, finLieux: fin, retourBase: base,
        statuts: st.map(function (x) { return x.status; }), surPlace: arr && fin ? Math.round((fin - arr) / 60000) : null };
    });
    if (!engins.length) warn.push('Aucun moyen engagé (RC-RI) : la durée et les engins seront à saisir.');
    var sis = engins.filter(function (e) { return e.type !== 'VECTEUR_SANTE'; });
    var main = sis.filter(function (e) { return e.code; })[0] || sis[0] || null;
    // Intervention du Carnet : du premier départ d'engin à la dernière fin sur les lieux
    var deps = sis.map(function (e) { return e.depart || e.arrivee; }).filter(Boolean);
    var fins = sis.map(function (e) { return e.finLieux; }).filter(Boolean);
    var debut = deps.length ? new Date(Math.min.apply(null, deps)) : new Date(Date.parse(c.creation));
    var finInt = fins.length ? new Date(Math.max.apply(null, fins)) : null;
    var duree = finInt && finInt > debut ? Math.round((finInt - debut) / 60000) : 0;
    return {
      caseId: c.caseId, creation: new Date(Date.parse(c.creation)),
      nature: { code: wh.code, label: wh.label || NATURES[wh.code] || '' },
      lieu: lieu ? { code: lieu.code, label: lieu.label } : null,
      risques: (c.qualification.riskThreat || []).map(function (r) { return { code: r.code, label: r.label }; }),
      commune: city, adresse: addr,
      type: map.type, ambiance: map.ambiance, regle: map.regle,
      engins: engins, enginPrincipal: main ? (main.code || 'FPT') : 'FPT',
      debut: debut, fin: finInt, duree_min: duree,
      warnings: warn
    };
  }

  var API = { generate: generate, parse: parse, typeFor: typeFor, SCENARIOS: SCENARIO_LABELS, NATURES: NATURES };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.VBSCisu = API;
})(typeof window !== 'undefined' ? window : this);
