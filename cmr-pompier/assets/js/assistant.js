// Assistant de l'espace : une phrase en français → une action de l'application.
// Il ouvre, cherche, liste et explique. Il ne remplit, ne transmet et ne valide rien.
//
// Confidentialité : le serveur (pb_hooks/assistant.pb.js) ne reçoit que la phrase,
// le rôle et la page affichée. Les actions s'exécutent ici, sur les données que
// l'utilisateur voit déjà, avec ses propres droits. Aucune donnée d'exposition
// n'est envoyée au modèle de langage.
//
// Sans serveur (aperçu hors ligne) ou si le service ne répond pas, un analyseur
// local de mots-clés prend le relais pour les commandes courantes.
(function () {
  var A = window.VBSApp;
  if (!A) return;
  var S = A.session, ROLE = S.role, esc = A.esc, icon = A.icon, fmtD = A.fmtD;
  var ENDPOINT = VBS.API_BASE + '/api/assistant';
  var MAX = 400;
  var LANG = window.VBSi18n && VBSi18n.lang === 'en' ? 'en' : 'fr';
  var serverOk = !S.offline; // passe à false après un 404 : on n'insiste pas

  var PAGES = A.menu.map(function (m) { return { id: m.id, label: m.label }; });
  function refreshPages() { PAGES = A.menu.map(function (m) { return { id: m.id, label: m.label }; }); }
  var CAN_EDIT = ROLE === 'cos' || ROLE === 'sssm';

  // ------------------------------------------------------------------ suggestions par rôle
  var SUGG = {
    agent: ['Ouvre mon historique', 'Exporter mes données', 'Comment se décontaminer après un feu ?'],
    cos: ['Ouvre mon dernier rapport à compléter', 'Mes rapports en retard', 'Nouveau rapport', "C'est quoi la zone d'exclusion ?"],
    commandement: ['Rapports en retard', 'Rapports en attente cette semaine', 'Qui valide les rapports ?'],
    sssm: ['Ouvre le dernier rapport à contrôler', 'Rapports transmis cette semaine', 'Suivi individuel'],
    habillement: ['Tenues de feu', 'Changements de tenue', 'Tableau de bord'],
    admin: ["Droits d'accès", 'Tableaux de bord des profils']
  };

  // ------------------------------------------------------------------ aide intégrée (textes fixes, relus)
  var HELP = {
    remplir_rapport: "Le rapport de contamination est rédigé par le chef d'agrès ou le COS, pour lui et son équipage, en fin d'intervention : rôle tenu, port de l'ARI, degré de contamination et gestes de décontamination. L'agent n'a rien à saisir. Dans « Rapports d'interventions », choisissez l'intervention puis « Faire mon rapport ».",
    circuit_validation: "Le CA ou le COS rédige le rapport. Le commandement voit s'il est fait, en attente ou en retard, et peut relancer, sans accès aux données individuelles. Le SSSM contrôle, corrige si besoin, ajoute les mesures, puis valide et verrouille. Chaque agent retrouve ensuite ses expositions dans son dossier.",
    zones_contamination: "Trois niveaux sont proposés : zone de soutien (pas de contact direct avec les fumées), zone contrôlée (exposition intermédiaire) et zone d'exclusion (au contact du feu et des fumées, la plus exposée). Le choix revient au CA ou au COS ; le SSSM peut le corriger.",
    ari: "Indiquez si l'agent a porté l'appareil respiratoire isolant (ARI) et pendant combien de temps. Un retrait précoce de l'ARI (pendant le déblai par exemple) se signale aussi : c'est une situation d'exposition à part entière.",
    decontamination: "Les gestes de décontamination se font pendant l'intervention, à la sortie de la zone et après le retour. Le détail, d'après la doctrine de la DGSCGC, est sur l'affiche gratuite : /ressources/decontamination-sapeurs-pompiers/. Dans le rapport, le CA indique pour chaque agent ce qui a été fait ; ce qui manque reste visible avant la transmission.",
    donnees: "Seuls le SSSM et l'agent concerné voient les données d'exposition individuelles. Le commandement voit uniquement l'état des rapports. L'assistant ne transmet que votre phrase, jamais vos données d'exposition.",
    retard: "Un rapport non transmis 72 heures après l'intervention passe « en retard ». Le commandement peut alors relancer le CA ou le COS concerné."
  };
  var HELP_LINKS = { decontamination: ['/ressources/decontamination-sapeurs-pompiers/', "Ouvrir l'affiche"], autre: ['/cmr-pompier/sante-sapeurs-pompiers.html', 'Guide santé des sapeurs-pompiers'] };

  // ------------------------------------------------------------------ interface
  var root = document.createElement('div');
  root.className = 'asst';
  root.innerHTML =
    '<button class="asst-fab" type="button" id="asst-open" aria-expanded="false" aria-controls="asst-panel" title="Assistant (Ctrl+K)">' + icon('chat') + '<span>Assistant</span></button>' +
    '<section class="asst-panel" id="asst-panel" role="dialog" aria-label="Assistant" hidden>' +
      '<header class="asst-head"><div><b>Assistant</b><small>Il ouvre, cherche et explique. Il ne remplit ni ne valide rien à votre place.</small></div>' +
      '<button class="icon-btn" type="button" id="asst-close" aria-label="Fermer l\'assistant">' + icon('close') + '</button></header>' +
      '<div class="asst-log" id="asst-log" aria-live="polite"></div>' +
      '<div class="asst-sugg" id="asst-sugg"></div>' +
      '<form class="asst-form" id="asst-form" autocomplete="off">' +
        '<label class="sr-only" for="asst-input">Votre demande</label>' +
        '<input class="input" id="asst-input" maxlength="' + MAX + '" placeholder="Ex. : ouvre mon dernier rapport à compléter">' +
        '<button class="btn btn-primary" type="submit" aria-label="Envoyer">' + icon('send') + '</button>' +
      '</form>' +
    '</section>';
  document.body.appendChild(root);
  var $ = function (id) { return document.getElementById(id); };
  var panel = $('asst-panel'), log = $('asst-log'), input = $('asst-input'), fab = $('asst-open');

  function open() {
    panel.hidden = false; fab.setAttribute('aria-expanded', 'true'); root.classList.add('on');
    if (!log.children.length) say("Bonjour. Dites-moi ce que vous cherchez, par exemple « " + SUGG[ROLE][0] + " ».", 'bot');
    setTimeout(function () { input.focus(); }, 30);
  }
  function close() { panel.hidden = true; fab.setAttribute('aria-expanded', 'false'); root.classList.remove('on'); fab.focus(); }
  fab.onclick = function () { panel.hidden ? open() : close(); };
  $('asst-close').onclick = close;
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); panel.hidden ? open() : input.focus(); }
    else if (e.key === 'Escape' && !panel.hidden) { e.stopPropagation(); close(); }
  }, true);

  $('asst-sugg').innerHTML = (SUGG[ROLE] || []).map(function (s) { return '<button type="button" class="asst-chip">' + esc(s) + '</button>'; }).join('');
  $('asst-sugg').onclick = function (e) { var b = e.target.closest('.asst-chip'); if (b) ask(b.textContent); };
  $('asst-form').onsubmit = function (e) { e.preventDefault(); var q = input.value.trim(); if (q) ask(q); };

  function say(html, who, raw) {
    var d = document.createElement('div');
    d.className = 'asst-msg ' + who;
    d.innerHTML = raw ? html : esc(html);
    log.appendChild(d); log.scrollTop = log.scrollHeight;
    return d;
  }

  // ------------------------------------------------------------------ boucle
  var busy = false;
  async function ask(q) {
    if (busy) return;
    q = q.slice(0, MAX);
    refreshPages();
    busy = true; input.value = ''; say(q, 'me');
    var wait = say('…', 'bot wait');
    var res = null;
    if (serverOk) {
      try { res = await callServer(q); }
      catch (err) {
        if (err.status === 429) { wait.remove(); say('Trop de demandes en peu de temps. Réessayez dans une minute.', 'bot'); busy = false; return; }
        if (err.status === 401 || err.status === 403) { wait.remove(); say('Votre session a expiré. Reconnectez-vous pour utiliser l\'assistant.', 'bot'); busy = false; return; }
        if (err.status === 404) serverOk = false;
        res = null;
      }
    }
    if (!res) res = local(q);
    wait.remove();
    run(res);
    busy = false;
  }

  async function callServer(q) {
    var r = await VBS.request('/api/assistant', {
      method: 'POST',
      body: { message: q, lang: LANG, today: iso(0), page: A.page(), pages: PAGES.map(function (p) { return p.id; }) }
    });
    if (r && (r.action || r.text)) return r;
    return null;
  }

  // ------------------------------------------------------------------ exécution des actions
  function run(res) {
    var a = res.action;
    if (!a) { say(res.text || "Je n'ai pas compris. Essayez une des suggestions ci-dessous.", 'bot'); return; }
    var inp = a.input || {};
    switch (a.name) {
      case 'ouvrir_page': return openPage(inp.page);
      case 'ouvrir_rapport': return openReport(inp.quel, inp.date);
      case 'lister_rapports': return listReports(inp.statut, inp.jours);
      case 'aide': return help(inp.sujet, res.text);
      default: say("Je n'ai pas compris. Essayez une des suggestions ci-dessous.", 'bot');
    }
  }

  function openPage(id) {
    var p = PAGES.find(function (x) { return x.id === id; });
    if (!p) { say("Cette page n'existe pas dans votre espace " + A.roleLabel + ". Pages disponibles : " + PAGES.map(function (x) { return x.label; }).join(', ') + '.', 'bot'); return; }
    A.go(p.id); say('J\'ouvre « ' + p.label + ' ».', 'bot');
  }

  function db() { return A.getDb(); }
  function scope() {
    var d = db(); if (!d) return null;
    if (ROLE === 'cos') return d.interventions.filter(function (x) { return x.cos === d.meId; });
    if (ROLE === 'commandement' || ROLE === 'sssm') return d.interventions.slice();
    return null;
  }
  function byDateDesc(a, b) { return b.dateObj - a.dateObj; }
  function label(x) { return (A.types[x.type_feu] || 'Intervention') + ' du ' + fmtD(x.dateObj) + (x.commune ? ' · ' + x.commune : ''); }
  function sameDay(d, iso) { var t = new Date(iso + 'T12:00:00'); return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate(); }

  function openReport(quel, date) {
    if (!db()) { say('Les données sont encore en cours de chargement. Réessayez dans un instant.', 'bot'); return; }
    if (ROLE === 'admin') { say("Le profil administrateur n'a pas accès aux rapports ni aux données d'exposition.", 'bot'); return; }
    if (ROLE === 'agent') { A.go('dossier'); say("Les rapports sont rédigés par votre chef d'agrès ou votre COS. J'ouvre votre dossier, où se trouvent toutes vos expositions.", 'bot'); return; }
    if (ROLE === 'habillement') { A.go('tenues'); say("Votre espace ne contient pas de rapports. J'ouvre les tenues de feu.", 'bot'); return; }
    if (quel === 'nouveau') {
      if (ROLE !== 'cos') { say("Seuls le CA ou le COS créent un rapport.", 'bot'); return; }
      A.go('rapport/nouveau'); say('J\'ouvre un nouveau rapport. Vous le remplissez et le transmettez vous-même.', 'bot'); return;
    }
    var its = scope().sort(byDateDesc), found;
    if (quel === 'date' && date) {
      var day = its.filter(function (x) { return sameDay(x.dateObj, date); });
      if (!day.length) { say('Aucun rapport le ' + fmtD(new Date(date + 'T12:00:00')) + '.', 'bot'); return; }
      if (day.length > 1) { showList(day, day.length + ' rapports ce jour-là :'); return; }
      found = day[0];
    } else if (quel === 'a_completer') {
      // CA/COS : brouillons à rédiger · SSSM : rapports transmis à contrôler
      var st = ROLE === 'sssm' ? 'transmis' : 'brouillon';
      found = its.filter(function (x) { return x.statut === st; })[0];
      if (!found) { say(ROLE === 'sssm' ? 'Aucun rapport en attente de contrôle.' : 'Tous vos rapports sont faits.', 'bot'); return; }
    } else {
      found = its[0];
      if (!found) { say('Aucun rapport pour le moment.', 'bot'); return; }
    }
    if (!CAN_EDIT) { A.go('gestion'); say('Dernier rapport concerné : ' + label(found) + '. Le détail individuel est réservé au CA et au SSSM ; j\'ouvre la gestion globale.', 'bot'); return; }
    A.go('rapport/' + found.id);
    say('J\'ouvre ' + label(found) + '.', 'bot');
  }

  var STATUT = {
    a_completer: { t: 'à compléter', f: function (x) { return x.statut === 'brouillon'; } },
    en_retard: { t: 'en retard', f: function (x) { return VBSData.reportState(x) === 'retard'; } },
    transmis: { t: 'transmis, à contrôler', f: function (x) { return x.statut === 'transmis'; } },
    valides: { t: 'validés par le SSSM', f: function (x) { return x.statut === 'controle_sssm'; } },
    tous: { t: '', f: function () { return true; } }
  };
  function listReports(statut, jours) {
    if (!db()) { say('Les données sont encore en cours de chargement. Réessayez dans un instant.', 'bot'); return; }
    var its = scope();
    if (!its) { openReport('dernier'); return; }
    var s = STATUT[statut] || STATUT.tous;
    var list = its.filter(s.f);
    if (jours) list = list.filter(function (x) { return Date.now() - x.dateObj <= jours * 864e5; });
    list.sort(byDateDesc);
    var period = jours ? (jours === 1 ? ' sur les dernières 24 h' : jours === 7 ? ' cette semaine' : ' sur ' + jours + ' jours') : '';
    var title = list.length + ' rapport' + (list.length > 1 ? 's' : '') + (s.t ? ' ' + s.t : '') + period + (list.length ? ' :' : '.');
    if (!list.length) { say(title, 'bot'); return; }
    showList(list, title);
  }
  function showList(list, title) {
    var max = 8;
    var html = '<p>' + esc(title) + '</p><ul class="asst-list">' + list.slice(0, max).map(function (x) {
      return CAN_EDIT ? '<li><a href="#rapport/' + esc(x.id) + '">' + esc(label(x)) + '</a></li>' : '<li>' + esc(label(x)) + '</li>';
    }).join('') + '</ul>' + (list.length > max ? '<p class="asst-more">… et ' + (list.length - max) + ' autres.</p>' : '');
    if (ROLE === 'commandement') html += '<p><a href="#gestion">Ouvrir la gestion globale</a></p>';
    say(html, 'bot', true);
  }

  function help(sujet, text) {
    var t = HELP[sujet] || text || "Je réponds aux questions sur l'utilisation du Carnet Expo CMR. Pour la réglementation et la santé, voyez le guide.";
    var link = HELP_LINKS[sujet] || (!HELP[sujet] ? HELP_LINKS.autre : null);
    say('<p>' + esc(t) + '</p>' + (link ? '<p><a href="' + link[0] + '" target="_blank" rel="noopener">' + esc(link[1]) + '</a></p>' : ''), 'bot', true);
  }

  // ------------------------------------------------------------------ analyseur local (sans serveur)
  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, ' '); }
  function local(q) {
    var t = norm(q);
    var has = function (re) { return re.test(t); };
    var jours = has(/24 ?h|aujourd hui|ce jour|today/) ? 1 : has(/semaine|7 jours|week|7 days/) ? 7 : has(/mois|30 jours|month|30 days/) ? 30 : null;
    var date = has(/hier|yesterday/) ? iso(-1) : has(/aujourd hui|today/) && has(/rapport|report/) && has(/ouvr|affich|montr|voir|open|show|see/) ? iso(0) : null;

    if (has(/decontamin|douche|lingette|deshabill|shower|wipe|undress/)) return act('aide', { sujet: 'decontamination' });
    if (has(/zone|exclusion|controlee|soutien|controlled/) && has(/quoi|c est|signifie|explique|comment|difference|what|mean|explain|\bhow\b/)) return act('aide', { sujet: 'zones_contamination' });
    if (has(/\bari\b|appareil respiratoire|\bba\b|breathing apparatus/) && has(/quoi|comment|explique|remplir|what|\bhow\b|explain|fill/)) return act('aide', { sujet: 'ari' });
    if (has(/qui (valide|voit|controle)|circuit|validation|who (approves|validates|sees|reviews|checks)|workflow|approval process/)) return act('aide', { sujet: 'circuit_validation' });
    if (has(/confidential|qui voit mes|donnees personnelles|rgpd|who sees my|who can see my|personal data|gdpr|privacy/)) return act('aide', { sujet: 'donnees' });
    if (has(/comment|\bhow\b/) && has(/rapport|remplir|rediger|report|fill|write/)) return act('aide', { sujet: 'remplir_rapport' });
    if (has(/pourquoi.*retard|c est quoi.*retard|why.*(overdue|\blate\b)|what.*overdue|72/)) return act('aide', { sujet: 'retard' });

    if (has(/nouveau rapport|creer.*rapport|rediger un rapport|nouvelle intervention|new report|create.*report|write a report|new call-out/)) return act('ouvrir_rapport', { quel: 'nouveau' });
    var wantsOpen = has(/ouvr|affich|montr|voir|va |aller|lance|reprend|open|show|display|see|view|go to|resume/);
    if (has(/rapport|report/) && wantsOpen && date) return act('ouvrir_rapport', { quel: 'date', date: date });
    if (has(/rapport|report/) && wantsOpen && has(/dernier|derniere|recent|latest|last/)) return act('ouvrir_rapport', { quel: has(/complet|faire|attente|brouillon|controler|valider|en cours|to do|pending|draft|review|approve|check|in progress/) ? 'a_completer' : 'dernier' });
    if (has(/rapport|report/) && wantsOpen && has(/complet|faire|controler|to do|review|check/)) return act('ouvrir_rapport', { quel: 'a_completer' });

    if (has(/retard|overdue|\blate\b/)) return act('lister_rapports', { statut: 'en_retard', jours: jours });
    if (has(/a completer|a faire|en attente|brouillon|pas fait|manque|to complete|to do|pending|draft|not done|missing/)) return act('lister_rapports', { statut: 'a_completer', jours: jours });
    if (has(/transmis|a controler|a valider|\bsent\b|submitted|to review|to approve|to check/)) return act('lister_rapports', { statut: 'transmis', jours: jours });
    if (has(/valide|verrouill|approved|validated|locked/)) return act('lister_rapports', { statut: 'valides', jours: jours });
    if (has(/(liste|tous|combien|list|\ball\b|how many).*(rapport|intervention|report|call-out)/)) return act('lister_rapports', { statut: 'tous', jours: jours });

    var pages = [
      [/droit|acces|permission|autoris|right/, 'droits'],
      [/indicateur|kpi|graphique|tableaux de bord des|indicator|chart|graph|profile dashboard/, 'indicateurs'],
      [/historique|dossier|mes expositions|ma fiche|rendez-vous|rdv|history|record|my exposure|appointment/, 'dossier'],
      [/export|csv|pdf|telecharg|download/, 'export'],
      [/gestion|management|overview/, 'gestion'],
      [/suivi individuel|suivi des agents|dossier d un agent|individual follow|follow-up|follow up/, 'suivi'],
      [/referentiel|base de donnees|coefficient|reference framework|database/, 'referentiel'],
      [/reglementation|loi|decret|regulation|\blaw|decree/, 'reglementation'],
      [/changement|change/, 'changements'],
      [/tenue|\bkit\b|turnout|\bgear\b/, 'tenues'],
      [/rapport|report/, 'rapports'],
      [/tableau de bord|accueil|dashboard|\bhome\b/, 'tableau-de-bord']
    ];
    for (var i = 0; i < pages.length; i++) {
      if (has(pages[i][0]) && PAGES.some(function (p) { return p.id === pages[i][1]; })) return act('ouvrir_page', { page: pages[i][1] });
    }
    return { text: "Je n'ai pas compris. Essayez par exemple : " + SUGG[ROLE].slice(0, 2).map(function (s) { return '« ' + s + ' »'; }).join(' ou ') + '.' };
  }
  function act(name, input) { return { action: { name: name, input: input } }; }
  function iso(offset) { var d = new Date(Date.now() + offset * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  // Pour les tests automatisés
  window.VBSAssistant = { local: local, open: open, ask: ask };
})();
