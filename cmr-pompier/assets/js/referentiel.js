// VB Safety · Référentiel d'évaluation de l'exposition aux CMR, version 1.0 (septembre 2026).
// Source : spécification interne « Référentiel d'évaluation de l'exposition aux CMR ».
// Aucun coefficient conventionnel ne doit être utilisé en production avant validation par un médecin de sapeurs-pompiers.
// Pour chaque motif de départ, le SSSM du service valide ou ajuste le coefficient, les substances retenues
// et les circonstances proposées au chef d'agrès (collection « ref_motifs ») ; sans validation, les valeurs ci-dessous s'appliquent.
(function (w) {
  var REG = 'reglementaire', DOC = 'documente', CONV = 'conventionnel';
  var R = {
    version: '1.0', date: '2026-09-12', validateur: '', // nom du médecin validateur, vide tant que la validation n'est pas faite
    STATUTS: { reglementaire: 'Réglementaire', documente: 'Documenté', conventionnel: 'Conventionnel' },

    // Nature : procédés cancérogènes (arrêté du 26 octobre 2020)
    PROCEDES: {
      PROC_HAP: { label: 'Travaux exposant aux HAP présents dans la suie, le goudron, la poix, la fumée ou les poussières de la houille', court: 'HAP (fumées, suies)', statut: REG },
      PROC_FORM: { label: 'Travaux exposant au formaldéhyde', court: 'Formaldéhyde (procédé)', statut: REG },
      PROC_SIL: { label: 'Travaux exposant à la poussière de silice cristalline alvéolaire issue de procédés de travail', court: 'Silice cristalline (procédé)', statut: REG }
    },
    // Substances présumées sur tout feu de structure, de véhicule ou industriel
    SOCLE: [
      { code: 'HAP', nom: 'HAP (marqueur benzo[a]pyrène)', cas: '50-32-8', cls: 'Carc. 1B, Muta. 1B, Repr. 1B, peau' },
      { code: 'BENZ', nom: 'Benzène', cas: '71-43-2', cls: 'Carc. 1A, Muta. 1B' },
      { code: 'FORM', nom: 'Formaldéhyde', cas: '50-00-0', cls: 'Carc. 1B, Muta. 2' },
      { code: 'BUTA', nom: '1,3-butadiène', cas: '106-99-0', cls: 'Carc. 1A, Muta. 1B' },
      { code: 'DIOX', nom: 'Dioxines et furannes (marqueur 2,3,7,8-TCDD)', cas: '1746-01-6', cls: 'Carc. 1B' },
      { code: 'SUIE', nom: 'Suies de combustion', cas: '', cls: 'Via le procédé HAP' },
      { code: 'CO', nom: 'Monoxyde de carbone', cas: '630-08-0', cls: 'Repr. 1A (H360D)' }
    ],
    // Profil végétation : substances retenues
    SOCLE_VEG: ['HAP', 'BENZ', 'FORM', 'CO'],
    // Substances circonstancielles : case cochée par le chef d'agrès
    CIRC: {
      AMIANTE: { nom: 'Amiante', cls: 'Carc. 1A', decl: 'Bâtiment antérieur à 1997, flocage, calorifugeage', mots: ['amiante', 'flocage', 'calorifug', 'fibrociment', 'eternit', '1997'] },
      SILICE: { nom: 'Silice cristalline alvéolaire', cls: 'Procédé listé', decl: 'Déblai, démolition, effondrement de maçonnerie', mots: ['effondr', 'demoli', 'maconn', 'beton', 'parpaing', 'pierre', 'platre'] },
      PB: { nom: 'Plomb et composés', cls: 'Repr. 1A', decl: 'Peintures anciennes, bâti ancien, batteries', mots: ['plomb', 'batterie', 'accumulateur', 'peinture ancienne', 'bati ancien', 'ancien'] },
      CRVI: { nom: 'Chrome VI', cls: 'Carc. 1A ou 1B selon le composé', decl: 'Structures et revêtements métalliques traités', mots: ['chrom', 'galva', 'metal traite', 'revetement metal'] },
      CD: { nom: 'Cadmium et composés', cls: 'Carc. 1B, Muta. 2, Repr. 2', decl: 'Batteries nickel-cadmium, revêtements, pigments', mots: ['cadmium', 'ni-cd', 'nicd', 'nickel-cadmium', 'pigment'] },
      NI: { nom: 'Composés du nickel', cls: 'Carc. 1A selon le composé', decl: 'Structures métalliques, aciers alliés', mots: ['nickel', 'acier', 'inox', 'structure metal', 'charpente metal'] },
      VCM: { nom: 'Chlorure de vinyle monomère', cls: 'Carc. 1A', decl: 'Présence importante de PVC', mots: ['pvc', 'vinyle', 'menuiserie plastique', 'canalisation', 'gaine'] },
      PFAS: { nom: 'PFOA et PFAS apparentés', cls: 'Carc. 1B, Repr. 1B', decl: 'Mousses extinctrices, textiles techniques', mots: ['mousse', 'emulseur', 'pfas', 'pfoa', 'textile technique'] }
    },

    // Degré : coefficients
    POS: {
      POS_ATT: { label: 'Attaque et recherche', coef: 0.45, statut: DOC, zone: 'forte' },
      POS_VENT: { label: 'Ventilation extérieure', coef: 0.14, statut: DOC, zone: 'moyenne' },
      POS_DEB: { label: 'Déblai seul, sans attaque', coef: 0.10, statut: DOC, zone: 'moyenne' },
      POS_SOUT: { label: 'Soutien au contact des agents contaminés', coef: 0.05, statut: CONV, zone: 'nulle' },
      POS_CDT: { label: 'Commandement, alimentation, conducteur', coef: 0.03, statut: DOC, zone: 'nulle' }
    },
    POS_VEG: {
      VEG_LISIERE: { label: 'Attaque directe à la lisière, dans les fumées', coef: 0.020, statut: CONV, zone: 'forte' },
      VEG_NOYAGE: { label: 'Noyage, extinction de lisière', coef: 0.012, statut: CONV, zone: 'moyenne' },
      VEG_SURV: { label: 'Surveillance, appui, lisière froide', coef: 0.005, statut: CONV, zone: 'nulle' },
      VEG_CDT: { label: 'Poste de commandement, logistique', coef: 0.002, statut: CONV, zone: 'nulle' }
    },
    TAC: {
      TAC_INT: { label: 'Attaque intérieure directe', coef: 1.00, statut: DOC },
      TAC_TRANS: { label: 'Attaque transitoire (abattage extérieur avant pénétration)', coef: 0.65, statut: DOC }
    },
    FEU: {
      FEU_INDUS: { label: 'Feu industriel ou entrepôt', coef: 1.30, statut: CONV },
      FEU_CLOS: { label: 'Feu en volume clos, sous-sol, parking', coef: 1.20, statut: CONV },
      FEU_HAB: { label: "Feu d'habitation, feu de structure", coef: 1.00, statut: CONV },
      FEU_VEH: { label: 'Feu de véhicule', coef: 0.60, statut: CONV },
      FEU_CHEM: { label: 'Feu de cheminée', coef: 0.40, statut: CONV },
      FEU_AUTRE: { label: 'Autre intervention avec fumées', coef: 0.05, statut: CONV }
    },
    // Fraction retirée par la décontamination (intervient sous la forme 1 − D)
    DEC: {
      DEC_LING_DOUCHE: { label: "Lingettes dans l'heure, puis douche", court: 'Lingettes + douche', d: 0.80, statut: CONV },
      DEC_LING_1H: { label: "Lingettes dans l'heure, sans douche rapide", court: "Lingettes dans l'heure", d: 0.50, statut: DOC },
      DEC_LING_TARD: { label: "Lingettes plus d'une heure après", court: 'Lingettes tardives', d: 0.35, statut: CONV },
      DEC_DOUCHE_2H: { label: 'Pas de lingettes, douche dans les 2 heures', court: 'Douche sous 2 h', d: 0.45, statut: CONV },
      DEC_DOUCHE_TARD: { label: 'Pas de lingettes, douche plus de 2 heures après', court: 'Douche tardive', d: 0.20, statut: CONV },
      DEC_AUCUNE: { label: 'Aucune décontamination', court: 'Aucune', d: 0, statut: CONV }
    },
    PLAFOND: 4,
    // Nature du sinistre (motif de départ) vers le coefficient de type
    TYPE_FEU: { habitation: 'FEU_HAB', industriel: 'FEU_INDUS', clos: 'FEU_CLOS', vehicule: 'FEU_VEH', cheminee: 'FEU_CHEM', conteneur: 'FEU_AUTRE', chimique: 'FEU_AUTRE', autre: 'FEU_AUTRE' },
    // Position proposée d'office selon le poste tenu dans l'engin
    POS_PAR_ROLE: { binome_attaque: 'POS_ATT', binome_alimentation: 'POS_CDT', conducteur: 'POS_CDT', chef_agres: 'POS_CDT', soutien: 'POS_SOUT', autre: 'POS_DEB' },
    VEG_PAR_ROLE: { binome_attaque: 'VEG_LISIERE', binome_alimentation: 'VEG_NOYAGE', conducteur: 'VEG_CDT', chef_agres: 'VEG_CDT', soutien: 'VEG_SURV', autre: 'VEG_SURV' },
    ZONES: { nulle: ['Zone de soutien', 'Exposition nulle : hors fumées'], moyenne: ['Zone contrôlée', 'Exposition moyenne : fumées diffuses, déblai'], forte: ["Zone d'exclusion", 'Exposition forte : milieu enfumé'] },
    MENTION: "Cet indicateur ne préjuge pas de l'état de santé et ne constitue pas une dose.",
    SOURCES: [
      'Fent KW et al., 2017. Contamination of firefighter PPE and skin and effectiveness of decontamination. J Occup Environ Hyg.',
      "Fent KW et al., 2019. Firefighters' absorption of PAHs and VOCs by job assignment and fire attack tactic. J Expo Sci Environ Epidemiol.",
      'Navarro KM et al., 2021. Exposure and absorption of PAHs in wildland firefighters. Ann Work Expo Health.',
      'Dahm MM et al., 2015. Retrospective job-exposure matrix, cohorte NIOSH. Occup Environ Med.',
      'CIRC, Monographie 132 (2022) : exposition professionnelle des sapeurs-pompiers, groupe 1.',
      'Directive 2004/37/CE modifiée (UE) 2022/431 ; règlement CLP n° 1272/2008, annexe VI.',
      'Arrêté du 26 octobre 2020 (procédés cancérogènes) ; décret n° 2024-307 (art. R. 4412-93-1 à R. 4412-93-4) ; décret n° 2025-1349 (tableaux 16 bis et 30).'
    ]
  };

  // Motifs de départ : valeurs VB Safety par défaut, surchargées par la validation du SSSM
  R.MOTIFS = { habitation: "Feu d'habitation, de structure", industriel: 'Feu industriel ou entrepôt', clos: 'Feu en volume clos (cave, sous-sol, parking)', vehicule: 'Feu de véhicule', cheminee: 'Feu de cheminée', vegetation: 'Feu de végétation', conteneur: 'Feu de conteneur, de poubelle', chimique: 'Matières dangereuses, chimique', autre: 'Autre intervention avec fumées' };
  R.CIRC_DEFAUT = { industriel: ['AMIANTE', 'CRVI', 'NI'], habitation: ['PB', 'AMIANTE'], clos: ['VCM'], vehicule: ['PB', 'CD'] };
  R.valid = {};
  R.defautMotif = function (m) {
    var veg = m === 'vegetation';
    return { motif: m, coef: veg ? null : R.FEU[R.TYPE_FEU[m] || 'FEU_HAB'].coef, substances: R.SOCLE.filter(function (s) { return !veg || R.SOCLE_VEG.indexOf(s.code) !== -1; }).map(function (s) { return s.code; }), circonstances: (R.CIRC_DEFAUT[m] || []).slice(), statut: 'a_valider' };
  };
  R.motif = function (m) { return R.valid[m] || R.defautMotif(m); };
  R.setMotifs = function (recs, users) {
    R.valid = {}; var last = null;
    (recs || []).forEach(function (r) {
      var d = R.defautMotif(r.motif), subs = Array.isArray(r.substances) ? r.substances : d.substances, circ = Array.isArray(r.circonstances) ? r.circonstances : d.circonstances;
      R.valid[r.motif] = { id: r.id, motif: r.motif, coef: r.motif === 'vegetation' ? null : (r.coef === '' || r.coef == null ? d.coef : +r.coef), substances: subs, circonstances: circ, statut: r.statut || 'a_valider', valide_par: r.valide_par, valide_le: r.valide_le, commentaire: r.commentaire || '', par: users && users[r.valide_par] ? users[r.valide_par].name : '' };
      if (r.statut === 'valide' && (!last || String(r.valide_le) > String(last.valide_le))) last = R.valid[r.motif];
    });
    var all = Object.keys(R.MOTIFS).every(function (m) { return R.valid[m] && R.valid[m].statut === 'valide'; });
    R.validateur = all && last ? last.par : '';
  };

  function isFire(it) { return it && it.ambiance !== 'aucun_feu'; }
  function circ(it) { return (it && it.circonstances) || []; }
  // Profil de calcul : végétation, sauf si des habitations ou des véhicules brûlent
  R.profil = function (it) { return it.type_feu === 'vegetation' && circ(it).indexOf('bascule') === -1 ? 'vegetation' : 'structure'; };
  R.feuCode = function (it) { return it.ambiance === 'fumees_faibles' ? 'FEU_AUTRE' : (R.TYPE_FEU[it.type_feu] || 'FEU_HAB'); };
  R.defaultPosition = function (it, role) { return R.profil(it) === 'vegetation' ? R.VEG_PAR_ROLE[role] || 'VEG_SURV' : R.POS_PAR_ROLE[role] || 'POS_DEB'; };
  R.positions = function (it) { return R.profil(it) === 'vegetation' ? R.POS_VEG : R.POS; };
  R.posLabel = function (code) { var x = R.POS[code] || R.POS_VEG[code]; return x ? x.label : '—'; };

  // Indicateur conventionnel en équivalents-feu (EF)
  // E = P(position) × T(tactique) × F(type de sinistre) × (durée / 30) × (1 − D)
  R.calcul = function (it, p) {
    var out = { ef: 0, detail: null, profil: R.profil(it) };
    if (!isFire(it) || !p.position) return out;
    var dur = +p.duree_min || 0; if (!dur) return out;
    var veg = out.profil === 'vegetation', pos = (veg ? R.POS_VEG : R.POS)[p.position] || (veg ? R.POS_VEG.VEG_SURV : R.POS.POS_DEB);
    var tac = !veg && p.position === 'POS_ATT' ? (R.TAC[p.tactique] || R.TAC.TAC_INT) : null;
    var feu = veg ? null : (it.ambiance === 'fumees_faibles' ? R.FEU.FEU_AUTRE : { coef: R.motif(it.type_feu).coef });
    var dec = R.DEC[p.decon_type] || R.DEC.DEC_AUCUNE;
    var e = pos.coef * (tac ? tac.coef : 1) * (feu ? feu.coef : 1) * (dur / 30) * (1 - dec.d);
    var cap = veg ? R.PLAFOND * Math.max(1, Math.ceil(dur / 720)) : R.PLAFOND;
    out.ef = Math.round(Math.min(e, cap) * 100) / 100;
    out.detail = { P: pos.coef, T: tac ? tac.coef : 1, F: feu ? feu.coef : 1, duree: dur, D: dec.d, plafonne: e > cap };
    return out;
  };

  // Nature de l'exposition : procédés, puis substances
  R.nature = function (it) {
    if (!isFire(it)) return { procedes: [], substances: [], circ: [] };
    var c = circ(it).filter(function (k) { return R.CIRC[k]; }), veg = R.profil(it) === 'vegetation';
    var procs = ['PROC_HAP', 'PROC_FORM']; if (c.indexOf('SILICE') !== -1) procs.push('PROC_SIL');
    // Végétation qui bascule (habitations ou véhicules touchés) : substances du feu de structure
    var codes = it.type_feu === 'vegetation' && !veg ? R.motif('habitation').substances : R.motif(it.type_feu).substances;
    var subs = R.SOCLE.filter(function (s) { return codes.indexOf(s.code) !== -1; });
    return { procedes: procs, substances: subs, circ: c };
  };
  R.natureTexte = function (it) {
    var n = R.nature(it); if (!n.procedes.length) return 'Aucun procédé cancérogène (pas de fumée)';
    return n.procedes.map(function (k) { return R.PROCEDES[k].court; }).concat(n.substances.filter(function (s) { return s.code !== 'SUIE' && s.code !== 'HAP'; }).map(function (s) { return s.nom.split(' (')[0]; })).concat(n.circ.map(function (k) { return R.CIRC[k].nom; })).join(', ');
  };

  // Suggestions de substances circonstancielles d'après le texte libre (mots-clés, à confirmer par le CA)
  function norm(v) { return String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  R.suggestions = function (txt, deja) {
    var t = norm(txt), out = []; if (!t.trim()) return out;
    Object.keys(R.CIRC).forEach(function (k) { if ((deja || []).indexOf(k) === -1 && R.CIRC[k].mots.some(function (m) { return t.indexOf(m) !== -1; })) out.push(k); });
    return out;
  };

  R.fmt = function (v) { return (Math.round((+v || 0) * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  R.bloc = function (ef) {
    var d = R.date.split('-').reverse().join('/');
    return 'Indicateur conventionnel d\'exposition cumulée · VB Safety, référentiel v' + R.version + ' du ' + d + ', ' + (R.validateur ? 'validé par ' + R.validateur : 'validation médicale en attente') + ' : ' + R.fmt(ef) + ' équivalent-feu. ' + R.MENTION;
  };

  w.VBSRef = R;
})(window);
