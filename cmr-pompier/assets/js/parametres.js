// Paramètres de l'espace, réglés par l'administrateur du SDIS :
//   - pages visibles par rôle,
//   - actions autorisées par rôle,
//   - indicateurs et graphiques ajoutés aux tableaux de bord (choisis dans un catalogue fermé).
//
// Principe : l'administrateur peut RESTREINDRE ce que chaque rôle voit ou fait,
// jamais l'ÉLARGIR. Les données d'exposition individuelles restent réservées à l'agent
// concerné et au SSSM (secret médical) : aucun réglage ne les ouvre à un autre rôle.
// Les indicateurs du catalogue ne sont proposés qu'aux rôles qui ont déjà accès à leurs données.
(function (w) {
  var ROLES = ['agent', 'cos', 'commandement', 'sssm', 'habillement'];

  // Actions que l'administrateur peut retirer. « sel » : éléments masqués quand l'action est retirée.
  var ACTIONS = [
    { id: 'rapport_rediger', roles: ['cos'], label: 'Rédiger et transmettre les rapports de contamination', sel: '#cisu-in, #new-op, a[href="#rapport/nouveau"]' },
    { id: 'relance', roles: ['commandement', 'cos'], label: 'Relancer un CA ou un COS pour un rapport en attente', sel: '[data-remind]' },
    { id: 'rapport_corriger', roles: ['sssm'], label: 'Corriger un rapport transmis', sel: '' },
    { id: 'rapport_valider', roles: ['sssm'], label: 'Valider et verrouiller les rapports', sel: '[data-validate-it], #ed-validate' },
    { id: 'mesures', roles: ['sssm'], label: 'Importer des mesures et saisir des prélèvements', sel: '[data-import], [data-prel]' },
    { id: 'referentiel', roles: ['sssm'], label: 'Modifier et valider le référentiel CMR', sel: '[data-mval], [data-medit], #ref-all' },
    { id: 'operation_releve', roles: ['commandement', 'cos'], label: 'Ajouter une relève sur une grande opération', sel: '#add-releve' },
    { id: 'releves_viser', roles: ['sssm'], label: 'Contrôler et viser les relevés annuels', sel: '[data-rctl]' },
    { id: 'activites', roles: ['cos'], label: 'Déclarer une formation ou un entretien du matériel', sel: '#act-new' },
    { id: 'tenues', roles: ['habillement'], label: 'Enregistrer les changements et mouvements de tenues', sel: '[data-tact], [data-chg], #lv-out, #lv-in' }
  ];

  // Ce qui ne peut jamais être ouvert, affiché à l'administrateur pour qu'il le sache.
  var LOCKED = {
    agent: ["Données d'exposition des autres agents"],
    cos: ["Indicateur d'exposition en équivalents-feu (réservé au médecin du SSSM)", "Dossiers d'exposition des agents hors de ses rapports"],
    commandement: ["Données d'exposition individuelles des agents (secret médical)", "Indicateur d'exposition en équivalents-feu"],
    sssm: [],
    habillement: ["Rapports et données d'exposition"]
  };

  // Catalogue d'indicateurs (kpi) et de graphiques (graph). « roles » : rôles qui voient déjà ces données.
  var WIDGETS = [
    { id: 'k_attente', type: 'kpi', label: 'Rapports non transmis', desc: 'Rapports encore en brouillon.', roles: ['cos', 'commandement', 'sssm'] },
    { id: 'k_retard', type: 'kpi', label: 'Rapports en retard', desc: 'Brouillons de plus de 72 heures.', roles: ['cos', 'commandement', 'sssm'] },
    { id: 'k_a_valider', type: 'kpi', label: 'Rapports à valider', desc: 'Transmis, en attente du contrôle SSSM.', roles: ['commandement', 'sssm'] },
    { id: 'k_feux30', type: 'kpi', label: 'Interventions avec fumées (30 jours)', desc: "Nombre d'interventions sur feu ou avec fumées.", roles: ['agent', 'cos', 'commandement', 'sssm'] },
    { id: 'k_decon', type: 'kpi', label: 'Décontamination effectuée', desc: 'Part des engagements sur feu avec décontamination, sur 12 mois.', roles: ['agent', 'cos', 'sssm'] },
    { id: 'k_exclusion', type: 'kpi', label: "Engagements en zone d'exclusion", desc: 'Sur 12 mois.', roles: ['agent', 'cos', 'sssm'] },
    { id: 'k_sans_ari', type: 'kpi', label: 'Attaques sans ARI', desc: 'Sur 12 mois.', roles: ['cos', 'sssm'] },
    { id: 'k_rdv', type: 'kpi', label: 'Rendez-vous SSSM à venir', desc: 'Dans les 30 prochains jours.', roles: ['agent', 'cos', 'sssm'] },
    { id: 'k_tenues_cont', type: 'kpi', label: 'Tenues contaminées', desc: 'À changer ou à laver.', roles: ['habillement'] },
    { id: 'k_tenues_seuil', type: 'kpi', label: "Tenues au seuil d'alerte", desc: 'Nombre de feux atteint depuis la mise en service.', roles: ['habillement'] },
    { id: 'g_mois', type: 'graph', label: 'Interventions avec fumées par mois', desc: 'Courbe sur 12 mois.', roles: ['agent', 'cos', 'commandement', 'sssm'] },
    { id: 'g_types', type: 'graph', label: 'Répartition par type de feu', desc: 'Barres, sur 12 mois.', roles: ['agent', 'cos', 'commandement', 'sssm'] },
    { id: 'g_statuts', type: 'graph', label: 'Rapports par statut', desc: 'En attente, en retard, transmis, validés.', roles: ['cos', 'commandement', 'sssm'] },
    { id: 'g_decon_mois', type: 'graph', label: 'Décontamination effectuée par mois', desc: 'Courbe en pourcentage, sur 12 mois.', roles: ['cos', 'sssm'] },
    { id: 'g_zones', type: 'graph', label: 'Engagements par zone', desc: "Soutien, contrôlée, exclusion, sur 12 mois.", roles: ['agent', 'cos', 'sssm'] },
    { id: 'g_tenues', type: 'graph', label: 'Tenues par état', desc: 'En service, contaminées, au lavage, en stock.', roles: ['habillement'] }
  ];
  var MAX_WIDGETS = 6;

  function blank() {
    var c = { pages: {}, actions: {}, widgets: {} };
    ROLES.forEach(function (r) { c.pages[r] = {}; c.actions[r] = {}; c.widgets[r] = []; });
    return c;
  }
  // Fusionne une configuration enregistrée avec les valeurs par défaut, en écartant tout ce qui
  // sortirait du cadre (action ou indicateur non prévu pour le rôle).
  function merge(saved) {
    var c = blank();
    if (typeof saved === 'string') { try { saved = JSON.parse(saved); } catch (e) { saved = null; } }
    if (!saved || typeof saved !== 'object') return c;
    ROLES.forEach(function (r) {
      var p = (saved.pages || {})[r] || {};
      Object.keys(p).forEach(function (k) { if (k !== 'tableau-de-bord' && p[k] === false) c.pages[r][k] = false; });
      var a = (saved.actions || {})[r] || {};
      ACTIONS.forEach(function (x) { if (x.roles.indexOf(r) !== -1 && a[x.id] === false) c.actions[r][x.id] = false; });
      var wl = ((saved.widgets || {})[r] || []).filter(function (id, i, arr) { var d = widget(id); return d && d.roles.indexOf(r) !== -1 && arr.indexOf(id) === i; });
      c.widgets[r] = wl.slice(0, MAX_WIDGETS);
    });
    c.maj = saved.maj || ''; c.par = saved.par || '';
    return c;
  }
  function widget(id) { return WIDGETS.filter(function (x) { return x.id === id; })[0] || null; }
  function pageVisible(cfg, role, page) { return page === 'tableau-de-bord' || !cfg || !cfg.pages[role] || cfg.pages[role][page] !== false; }
  function can(cfg, role, action) {
    var a = ACTIONS.filter(function (x) { return x.id === action; })[0];
    if (!a || a.roles.indexOf(role) === -1) return true; // action non réglable pour ce rôle : comportement d'origine
    return !cfg || !cfg.actions[role] || cfg.actions[role][action] !== false;
  }
  function deniedSelector(cfg, role) {
    return ACTIONS.filter(function (x) { return x.sel && x.roles.indexOf(role) !== -1 && !can(cfg, role, x.id); }).map(function (x) { return x.sel; }).join(', ');
  }

  w.VBSParam = { ROLES: ROLES, ACTIONS: ACTIONS, LOCKED: LOCKED, WIDGETS: WIDGETS, MAX_WIDGETS: MAX_WIDGETS, blank: blank, merge: merge, widget: widget, pageVisible: pageVisible, can: can, deniedSelector: deniedSelector };
})(window);
