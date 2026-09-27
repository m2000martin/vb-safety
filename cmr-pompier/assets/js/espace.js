// Espace connecté : menu par rôle, visite guidée, tableaux de bord et vues.
(function () {
  var S = VBS.requireRole(['agent', 'cos', 'commandement', 'sssm']);
  if (!S) return;

  // =================================================================== libellés
  var ROLE_LABEL = { agent: 'Agent', cos: 'CA / COS', commandement: 'Chef CI / commandement', sssm: 'SSSM' };
  var TYPE = { habitation: "Feu d'habitation", vehicule: 'Feu de véhicule', industriel: 'Feu industriel', vegetation: 'Feu de végétation', conteneur: 'Feu de conteneur', autre: 'Autre feu' };
  var ROLE_TENU = { chef_agres: "Chef d'agrès", binome_attaque: "Binôme d'attaque", binome_alimentation: "Binôme d'alimentation", conducteur: 'Conducteur', soutien: 'Soutien', autre: 'Autre' };
  var CONT = { nulle: ['Nulle', 'badge-neutral'], faible: ['Faible', 'badge-low'], moyenne: ['Moyenne', 'badge-mod'], forte: ['Forte', 'badge-high'] };
  var STATE = { attente: ['En attente', 'badge-pending'], retard: ['En retard', 'badge-late'], transmis: ['Transmis SSSM', 'badge-info'], controle: ['Validé SSSM', 'badge-ok'] };
  var PHASE = { attaque: 'Attaque', deblai: 'Déblai', soutien: 'Soutien / alimentation' };
  var PROT = { ari: 'Sous ARI', epi_sans_ari: 'EPI sans ARI', sans_epi: 'Sans EPI' };
  var NIV = { faible: ['Faible', 'badge-low'], moyen: ['Moyen', 'badge-mod'], eleve: ['Élevé', 'badge-high'] };
  var PREL = { hbco: 'HbCO (CO sanguin)', hap_urinaire: 'HAP urinaires (1-OHP)', autre: 'Autre' };
  var MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  // =================================================================== menus par rôle
  var M = {
    tdb: { id: 'tableau-de-bord', label: 'Tableau de bord', icon: 'home' },
    dossier: { id: 'dossier', label: 'Dossier personnel', icon: 'user' },
    rapportsCos: { id: 'rapports', label: "Rapports d'interventions", icon: 'clip' },
    gestion: { id: 'gestion', label: 'Gestion globale', icon: 'list' },
    rapportsSssm: { id: 'rapports', label: 'Rapports', icon: 'clip' },
    suivi: { id: 'suivi', label: 'Suivi individuel', icon: 'users' },
    exp: { id: 'export', label: 'Export', icon: 'download' },
    ref: { id: 'referentiel', label: 'Base de données centrale', icon: 'db' },
    regl: { id: 'reglementation', label: 'Suivi réglementation', icon: 'scale' }
  };
  function item(base, tour) { return Object.assign({}, base, { tour: tour }); }
  var MENUS = {
    agent: [
      item(M.tdb, "Vos dernières interventions, votre indice d'exposition cumulé et votre prochain rendez-vous au SSSM."),
      item(M.dossier, "L'historique complet de vos expositions, intervention par intervention, et vos rendez-vous SSSM."),
      item(M.exp, 'Exportez vos propres données en PDF ou CSV, pour votre médecin ou vos archives.')
    ],
    cos: [
      item(M.tdb, "Vos expositions récentes, votre prochain rendez-vous SSSM et les rapports qu'il vous reste à compléter."),
      item(M.dossier, "L'historique complet de vos propres expositions et vos rendez-vous SSSM."),
      item(M.rapportsCos, "Rédigez le rapport de contamination de votre équipage après chaque intervention. Les rapports validés par le SSSM sont verrouillés. Signalez au SSSM une intervention à forte exposition."),
      item(M.exp, 'Exportez vos propres données en PDF ou CSV.')
    ],
    commandement: [
      item(M.tdb, 'Suivez vos éléments personnels ou ceux du centre : rapports par statut et calendrier coloré.'),
      item(M.dossier, 'Votre propre historique d\'exposition et vos rendez-vous SSSM.'),
      item(M.gestion, 'Le détail des rapports par statut, et un rappel en un clic aux CA ou COS concernés.'),
      item(M.exp, "Exportez vos données personnelles et l'état des rapports de votre centre.")
    ],
    sssm: [
      item(M.tdb, 'Dossiers à jour ou non, alertes sur les cas particuliers, feux des dernières 24 h et tendance de contamination.'),
      item(M.rapportsSssm, 'Toutes les interventions, engin par engin ou agent par agent. Vous pouvez corriger un rapport et ajouter un prélèvement (ex. HbCO).'),
      item(M.suivi, "Le dossier de chaque agent : historique d'exposition, prélèvements, derniers et prochains rendez-vous."),
      item(M.exp, 'Tous les exports : interventions, expositions, référentiel.'),
      item(M.ref, "Pour chaque motif de départ, phase et protection, vous décidez du type d'exposition associé. L'IA propose à partir des études, vous validez."),
      item(M.regl, 'Les évolutions réglementaires qui concernent le suivi des expositions, avec leur niveau d\'impact.')
    ]
  };
  var MENU = MENUS[S.role];

  // =================================================================== utilitaires
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function icon(n, cls) { return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function d2(n) { return String(n).padStart(2, '0'); }
  function fmtD(d) { return d2(d.getDate()) + '/' + d2(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function fmtDT(d) { return fmtD(d) + ' · ' + d2(d.getHours()) + 'h' + d2(d.getMinutes()); }
  function fmtLong(d) { return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
  function badge(pair) { return '<span class="badge ' + pair[1] + '">' + esc(pair[0]) + '</span>'; }
  function cont(p) { return badge(CONT[p.contamination] || ['—', 'badge-neutral']); }
  function decon(p) { return p.decon_validee ? '<span class="badge badge-ok">Décon. validée</span>' : '<span class="badge badge-pending">Décon. à valider</span>'; }
  function cumulLevel(v) { return v < 150 ? ['Faible', 'badge-low'] : v < 400 ? ['Modéré', 'badge-mod'] : ['Élevé', 'badge-high']; }
  function sum(a, f) { return a.reduce(function (s, x) { return s + (f(x) || 0); }, 0); }
  function first(name) { return String(name || '').split(' ').slice(-1)[0]; }
  function within(d, days) { return Date.now() - d <= days * VBSData.DAY; }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
  }
  function csvDownload(name, rows) {
    var csv = rows.map(function (r) { return r.map(function (c) { var s = String(c == null ? '' : c); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';'); }).join('\n');
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // Série mensuelle sur 12 mois
  function monthly(items, dateOf, valueOf, avg) {
    var now = new Date(), out = [];
    for (var k = 11; k >= 0; k--) {
      var m = new Date(now.getFullYear(), now.getMonth() - k, 1), n = new Date(now.getFullYear(), now.getMonth() - k + 1, 1);
      var inM = items.filter(function (x) { var d = dateOf(x); return d >= m && d < n; });
      var v = sum(inM, valueOf);
      out.push({ label: MONTHS[m.getMonth()], full: MONTHS[m.getMonth()] + ' ' + m.getFullYear(), value: avg ? (inM.length ? Math.round(v / inM.length) : 0) : v, n: inM.length });
    }
    return out;
  }

  // Courbe simple (une seule série, pas de légende) avec info-bulle au survol
  function lineChart(pts, unit) {
    var W = 560, H = 220, L = 36, R = 12, T = 12, B = 28;
    var max = Math.max(10, Math.max.apply(null, pts.map(function (p) { return p.value; })));
    var step = Math.pow(10, Math.floor(Math.log10(max))); var top = Math.ceil(max / step) * step; if (top / step > 6) { step *= 2; top = Math.ceil(max / step) * step; }
    var x = function (i) { return L + i * (W - L - R) / (pts.length - 1); }, y = function (v) { return T + (H - T - B) * (1 - v / top); };
    var grid = '', ticks = Math.round(top / step);
    for (var g = 0; g <= ticks; g++) { var gv = g * step; grid += '<line class="grid-line" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(gv) + '" y2="' + y(gv) + '"/><text class="axis" x="' + (L - 6) + '" y="' + (y(gv) + 4) + '" text-anchor="end">' + gv + '</text>'; }
    var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.value).toFixed(1); }).join(' ');
    var area = path + ' L' + x(pts.length - 1) + ' ' + y(0) + ' L' + x(0) + ' ' + y(0) + ' Z';
    var labels = pts.map(function (p, i) { return (i % 2 === (pts.length - 1) % 2) ? '<text class="axis" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + p.label + '</text>' : ''; }).join('');
    var slot = (W - L - R) / (pts.length - 1);
    var hits = pts.map(function (p, i) { return '<rect class="hit" x="' + (x(i) - slot / 2) + '" y="' + T + '" width="' + slot + '" height="' + (H - T - B) + '" data-tip="' + esc(p.full + ' : ' + p.value + (unit || '')) + '" data-x="' + x(i) + '" data-y="' + y(p.value) + '"/><circle class="pt" cx="' + x(i) + '" cy="' + y(p.value) + '" r="4"/>'; }).join('');
    return '<div class="chart-wrap"><svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Évolution sur 12 mois">' + grid + '<path class="area" d="' + area + '"/><path class="line" d="' + path + '"/>' + labels + hits + '</svg><div class="chart-tip"></div></div>';
  }
  function bindCharts(root) {
    root.querySelectorAll('.chart-wrap').forEach(function (w) {
      var svg = w.querySelector('svg'), tip = w.querySelector('.chart-tip');
      svg.addEventListener('mousemove', function (e) {
        var h = e.target.closest('.hit'); if (!h) { tip.style.opacity = 0; return; }
        var k = svg.getBoundingClientRect().width / 560;
        tip.textContent = h.dataset.tip; tip.style.left = (h.dataset.x * k) + 'px'; tip.style.top = (h.dataset.y * k) + 'px'; tip.style.opacity = 1;
      });
      svg.addEventListener('mouseleave', function () { tip.style.opacity = 0; });
    });
  }

  function kpi(ic, tone, label, value, sub) {
    return '<div class="panel kpi"><span class="icon-tile ' + (tone || '') + '">' + icon(ic) + '</span><div><div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + '</div>' + (sub ? '<div class="kpi-sub">' + sub + '</div>' : '') + '</div></div>';
  }
  function head(title, sub, right) {
    return '<div class="page-head"><div><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (right || '') + '</div>';
  }
  function interventionRows(parts, limit) {
    if (!parts.length) return '<p class="empty">Aucune intervention enregistrée à votre nom.</p>';
    return '<ul class="rows">' + parts.slice(0, limit || 5).map(function (p) {
      return '<li><span class="when">' + fmtD(p.it.dateObj) + '</span><span class="what"><b>' + esc(TYPE[p.it.type_feu]) + '</b><small>' + esc(p.it.precision || '') + ' · ' + esc(p.it.commune || '') + '</small></span><span class="right">' + cont(p) + '</span></li>';
    }).join('') + '</ul>';
  }
  function nextRdv(db, userId) {
    return db.rdv.filter(function (r) { return r.agent === userId && r.statut === 'prevu' && r.dateObj >= new Date(); }).sort(function (a, b) { return a.dateObj - b.dateObj; })[0];
  }
  function rdvCallout(r) {
    if (!r) return '<div class="callout">' + '<span class="icon-tile">' + icon('cal') + '</span><div><strong>Rendez-vous SSSM</strong><span class="sub">Aucun rendez-vous prévu pour le moment.</span></div></div>';
    var days = Math.ceil((r.dateObj - Date.now()) / VBSData.DAY);
    return '<div class="callout"><span class="icon-tile">' + icon('cal') + '</span><div><strong>Prochain rendez-vous SSSM · dans ' + days + ' jour' + (days > 1 ? 's' : '') + '</strong><span class="sub">' + esc(fmtLong(r.dateObj)) + ' à ' + d2(r.dateObj.getHours()) + 'h · ' + esc(r.motif) + '</span></div></div>';
  }

  // =================================================================== vues
  var db = null;

  function viewDashPerso(root, extra) {
    var mine = db.mine, now = new Date();
    var thisM = mine.filter(function (p) { return p.it.dateObj.getMonth() === now.getMonth() && p.it.dateObj.getFullYear() === now.getFullYear(); }).length;
    var prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var prevM = mine.filter(function (p) { return p.it.dateObj.getMonth() === prev.getMonth() && p.it.dateObj.getFullYear() === prev.getFullYear(); }).length;
    var y = mine.filter(function (p) { return within(p.it.dateObj, 365); }), cumul = sum(y, function (p) { return p.indice; });
    var diff = thisM - prevM;
    var k3;
    if (S.role === 'cos') {
      var pend = db.interventions.filter(function (x) { return x.cos === db.meId && x.statut === 'brouillon'; });
      var late = pend.filter(function (x) { return VBSData.reportState(x) === 'retard'; }).length;
      k3 = kpi('file', '', 'Rapports à compléter', pend.length, late ? '<span class="badge badge-late">' + late + ' en retard</span>' : 'À jour');
    } else {
      var ok = mine.length ? Math.round(100 * mine.filter(function (p) { return p.decon_validee; }).length / mine.length) : 0;
      k3 = kpi('shield', 'ok', 'Décontamination validée', ok + ' %', 'Sur toutes vos interventions');
    }
    var html = head('Bonjour ' + esc(S.name || '') + ',', 'Voici le résumé de vos expositions et de vos dernières interventions.', '<span class="page-date">' + esc(fmtLong(now)) + '</span>') +
      '<div class="grid grid-3">' +
        kpi('flame', '', 'Interventions ce mois-ci', thisM, (diff >= 0 ? '+' : '') + diff + ' par rapport au mois dernier') +
        kpi('chart', 'warn', "Indice d'exposition cumulé (12 mois)", cumul, badge(cumulLevel(cumul)) + 'Indicatif, non médical') +
        k3 +
      '</div>' +
      '<div class="grid grid-main">' +
        '<section class="panel"><div class="panel-head"><h3>Évolution de votre indice d\'exposition</h3></div>' + lineChart(monthly(mine, function (p) { return p.it.dateObj; }, function (p) { return p.indice; })) + '<p class="note">Somme mensuelle des indices de vos interventions.</p></section>' +
        '<section class="panel"><div class="panel-head"><h3>Dernières interventions</h3><a href="#dossier">Voir tout ' + icon('arrow') + '</a></div>' + interventionRows(mine, 5) + '</section>' +
      '</div>' +
      '<div class="grid grid-2">' + rdvCallout(nextRdv(db, db.meId)) + (extra || '<div class="callout"><span class="icon-tile">' + icon('download') + '</span><div><strong>Export rapide</strong><span class="sub">Vos données en PDF ou CSV.</span></div><a class="btn btn-secondary btn-sm" href="#export">Exporter</a></div>') + '</div>';
    root.innerHTML = html; bindCharts(root);
  }

  function viewDashCos(root) {
    var pend = db.interventions.filter(function (x) { return x.cos === db.meId && x.statut === 'brouillon'; });
    var extra = pend.length
      ? '<div class="callout red"><span class="icon-tile">' + icon('clip') + '</span><div><strong>' + pend.length + ' rapport' + (pend.length > 1 ? 's' : '') + ' en attente</strong><span class="sub">' + esc(pend.map(function (x) { return TYPE[x.type_feu] + ' du ' + fmtD(x.dateObj); }).join(' · ')) + '</span></div><a class="btn btn-primary btn-sm" href="#rapports">Compléter</a></div>'
      : '<div class="callout"><span class="icon-tile ok">' + icon('check') + '</span><div><strong>Tous vos rapports sont à jour</strong></div></div>';
    viewDashPerso(root, extra);
  }

  var cmdMode = 'centre', calMonth = null, calDay = null;
  function viewDashCmd(root) {
    var toggle = '<div class="seg" role="group" aria-label="Vue"><button type="button" data-mode="centre" aria-pressed="' + (cmdMode === 'centre') + '">Vue du centre</button><button type="button" data-mode="perso" aria-pressed="' + (cmdMode === 'perso') + '">Ma vue</button></div>';
    if (cmdMode === 'perso') { viewDashPerso(root); root.querySelector('.page-head').insertAdjacentHTML('beforeend', toggle); bindSeg(root); return; }
    var its = db.interventions, st = { attente: 0, retard: 0, transmis: 0, controle: 0 };
    its.forEach(function (x) { st[VBSData.reportState(x)]++; });
    var total = its.length, upToDate = total ? Math.round(100 * (st.transmis + st.controle) / total) : 0;
    var late = its.filter(function (x) { return VBSData.reportState(x) === 'retard'; });
    root.innerHTML = head('Suivi des rapports · ' + esc(centreName()), 'Chaque intervention a-t-elle son rapport de contamination, et est-il à jour ?', toggle) +
      '<div class="status-strip">' +
        '<div class="status-card retard">' + badge(STATE.retard) + '<b>' + st.retard + '</b><span class="note">Brouillon depuis plus de 72 h</span></div>' +
        '<div class="status-card">' + badge(STATE.attente) + '<b>' + st.attente + '</b><span class="note">Brouillon de moins de 72 h</span></div>' +
        '<div class="status-card">' + badge(STATE.transmis) + '<b>' + st.transmis + '</b><span class="note">En attente de contrôle</span></div>' +
        '<div class="status-card">' + badge(STATE.controle) + '<b>' + st.controle + '</b><span class="note">Verrouillés</span></div>' +
      '</div>' +
      '<div class="grid grid-main">' +
        '<section class="panel"><div class="panel-head"><h3>Calendrier des rapports</h3><span class="note">' + upToDate + ' % des rapports transmis ou validés</span></div><div id="cal"></div>' +
          '<div class="legend"><span><i style="background:var(--danger)"></i>En retard</span><span><i style="background:var(--warn)"></i>En attente</span><span><i style="background:var(--info)"></i>Transmis SSSM</span><span><i style="background:var(--ok)"></i>Validé SSSM</span></div></section>' +
        '<section class="panel"><div class="panel-head"><h3 id="day-title">Rapports en retard</h3><a href="#gestion">Gestion globale ' + icon('arrow') + '</a></div><div id="day-list"></div></section>' +
      '</div>';
    bindSeg(root);
    var cal = root.querySelector('#cal'), list = root.querySelector('#day-list');
    function showList(items, title) {
      root.querySelector('#day-title').textContent = title;
      list.innerHTML = items.length ? '<ul class="rows">' + items.map(function (x) {
        var s = VBSData.reportState(x);
        return '<li><span class="when">' + fmtD(x.dateObj) + '</span><span class="what"><b>' + esc(TYPE[x.type_feu]) + '</b><small>' + esc(x.numero) + ' · CA/COS : ' + esc(x.cosUser ? x.cosUser.name : '—') + '</small></span><span class="right">' + badge(STATE[s]) + (s === 'retard' || s === 'attente' ? '<button class="btn btn-secondary btn-sm" data-remind="' + x.id + '">' + icon('send') + 'Relancer</button>' : '') + '</span></li>';
      }).join('') + '</ul>' : '<p class="empty">Aucun rapport.</p>';
      bindRemind(list);
    }
    calMonth = calMonth || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    function drawCal() {
      var y = calMonth.getFullYear(), m = calMonth.getMonth(), lead = (new Date(y, m, 1).getDay() + 6) % 7, last = new Date(y, m + 1, 0).getDate();
      var order = { retard: 4, attente: 3, transmis: 2, controle: 1 }, today = new Date();
      var h = '<div class="cal-head"><button class="cal-nav" type="button" data-cal="-1" aria-label="Mois précédent">‹</button><strong>' + calMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) + '</strong><button class="cal-nav" type="button" data-cal="1" aria-label="Mois suivant">›</button></div><div class="cal">' +
        ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(function (d) { return '<span class="dow">' + d + '</span>'; }).join('') + '<span></span>'.repeat(lead);
      for (var dd = 1; dd <= last; dd++) {
        var dayIts = its.filter(function (x) { return x.dateObj.getFullYear() === y && x.dateObj.getMonth() === m && x.dateObj.getDate() === dd; });
        var worst = dayIts.map(VBSData.reportState).sort(function (a, b) { return order[b] - order[a]; })[0];
        var isT = today.getFullYear() === y && today.getMonth() === m && today.getDate() === dd;
        h += '<button type="button" class="day ' + (worst ? 'has st-' + worst : '') + (isT ? ' today' : '') + (calDay === dd ? ' sel' : '') + '" data-day="' + dd + '"' + (dayIts.length ? '' : ' disabled') + ' aria-label="' + dd + (worst ? ' : ' + STATE[worst][0] : '') + '">' + dd + (dayIts.length ? '<span class="n">' + dayIts.length + '</span>' : '') + '</button>';
      }
      cal.innerHTML = h + '</div>';
      cal.querySelectorAll('[data-cal]').forEach(function (b) { b.onclick = function () { calMonth = new Date(y, m + (+b.dataset.cal), 1); calDay = null; drawCal(); }; });
      cal.querySelectorAll('.day.has').forEach(function (b) { b.onclick = function () {
        calDay = +b.dataset.day; drawCal();
        showList(its.filter(function (x) { return x.dateObj.getFullYear() === y && x.dateObj.getMonth() === m && x.dateObj.getDate() === calDay; }), 'Rapports du ' + d2(calDay) + '/' + d2(m + 1) + '/' + y);
      }; });
    }
    drawCal();
    showList(late, 'Rapports en retard');
  }
  function bindSeg(root) {
    root.querySelectorAll('[data-mode]').forEach(function (b) { b.onclick = function () { cmdMode = b.dataset.mode; route(); }; });
  }
  var reminded = {};
  function bindRemind(root) {
    root.querySelectorAll('[data-remind]').forEach(function (b) {
      if (reminded[b.dataset.remind]) { b.disabled = true; b.innerHTML = icon('check') + 'Relancé'; }
      b.onclick = function () {
        var x = db.inter[b.dataset.remind]; reminded[x.id] = true; b.disabled = true; b.innerHTML = icon('check') + 'Relancé';
        toast('Rappel envoyé à ' + (x.cosUser ? x.cosUser.name : 'CA/COS') + ' (démo : aucun message réel envoyé)');
      };
    });
  }
  function centreName() { return 'CIS Démo-sur-Marne'; }

  function viewDashSssm(root) {
    var its = db.interventions, P = db.participations;
    var ctrl = its.filter(function (x) { return x.statut === 'controle_sssm'; }).length, toCheck = its.filter(function (x) { return x.statut === 'transmis'; }).length;
    var upToDate = its.length ? Math.round(100 * ctrl / its.length) : 0;
    var openSig = db.signalements.filter(function (s) { return s.statut !== 'clos'; });
    var fortes = P.filter(function (p) { return p.contamination === 'forte' && !p.decon_validee && p.it; });
    var last24 = its.filter(function (x) { return within(x.dateObj, 1); });
    var recent = last24.length ? last24 : its.filter(function (x) { return within(x.dateObj, 3); });
    var m30 = P.filter(function (p) { return p.it && within(p.it.dateObj, 30); }), m60 = P.filter(function (p) { return p.it && within(p.it.dateObj, 60) && !within(p.it.dateObj, 30); });
    var avg30 = m30.length ? Math.round(sum(m30, function (p) { return p.indice; }) / m30.length) : 0, avg60 = m60.length ? Math.round(sum(m60, function (p) { return p.indice; }) / m60.length) : 0;
    var trend = avg30 - avg60;
    var dist = { nulle: 0, faible: 0, moyenne: 0, forte: 0 }; m30.forEach(function (p) { dist[p.contamination]++; });
    var colors = { nulle: '#C9C2B8', faible: 'var(--ok)', moyenne: 'var(--warn)', forte: 'var(--danger)' };
    var stack = '<div class="stack" role="img" aria-label="Répartition des contaminations sur 30 jours">' + Object.keys(dist).filter(function (k) { return dist[k]; }).map(function (k) { return '<i style="flex:' + dist[k] + ';background:' + colors[k] + '" title="' + CONT[k][0] + ' : ' + dist[k] + '"></i>'; }).join('') + '</div>' +
      '<div class="legend">' + Object.keys(dist).map(function (k) { return '<span><i style="background:' + colors[k] + '"></i>' + CONT[k][0] + ' · <b>' + dist[k] + '</b></span>'; }).join('') + '</div>';
    // Agents à surveiller : indice cumulé sur 90 jours
    var byAgent = {};
    P.forEach(function (p) { if (p.it && within(p.it.dateObj, 90)) { byAgent[p.agent] = (byAgent[p.agent] || 0) + p.indice; } });
    var top = Object.keys(byAgent).sort(function (a, b) { return byAgent[b] - byAgent[a]; }).slice(0, 5);
    var alerts = openSig.map(function (s) {
      return '<li><span class="when">' + (s.it ? fmtD(s.it.dateObj) : '') + '</span><span class="what"><b>Signalement ' + (s.niveau === 'critique' ? 'critique' : 'forte exposition') + '</b><small>' + esc(s.it ? TYPE[s.it.type_feu] + ' · ' + s.it.numero : '') + ' · ' + esc(s.motif) + '</small></span><span class="right">' + badge(s.statut === 'ouvert' ? ['Ouvert', 'badge-late'] : ['Pris en charge', 'badge-info']) + '</span></li>';
    }).concat(fortes.slice(0, 4).map(function (p) {
      return '<li><span class="when">' + fmtD(p.it.dateObj) + '</span><span class="what"><b>' + esc(p.user ? p.user.name : 'Agent') + ' · contamination forte</b><small>' + esc(TYPE[p.it.type_feu]) + ' · décontamination non validée</small></span><span class="right">' + badge(['À vérifier', 'badge-pending']) + '</span></li>';
    }));
    root.innerHTML = head('Tableau de bord SSSM', 'État des dossiers, cas particuliers et tendance des expositions.', '<span class="page-date">' + esc(fmtLong(new Date())) + '</span>') +
      '<div class="grid grid-4">' +
        kpi('check', 'ok', 'Dossiers à jour', upToDate + ' %', toCheck + ' rapport' + (toCheck > 1 ? 's' : '') + ' à contrôler') +
        kpi('alert', '', 'Alertes cas particuliers', openSig.length + fortes.length, openSig.length + ' signalement' + (openSig.length > 1 ? 's' : '') + ' · ' + fortes.length + ' décon. à vérifier') +
        kpi('flame', 'warn', 'Feux des dernières 24 h', last24.length, last24.length ? sum(last24, function (x) { return x.crew.length; }) + ' agents engagés' : 'Aucun feu sur 24 h') +
        kpi('chart', 'info', 'Indice moyen (30 j)', avg30, (trend > 0 ? '▲ +' : trend < 0 ? '▼ ' : '= ') + trend + ' vs les 30 jours précédents') +
      '</div>' +
      '<div class="grid grid-main">' +
        '<section class="panel"><div class="panel-head"><h3>Tendance : indice moyen par agent engagé</h3></div>' + lineChart(monthly(P.filter(function (p) { return p.it; }), function (p) { return p.it.dateObj; }, function (p) { return p.indice; }, true)) + '</section>' +
        '<section class="panel"><div class="panel-head"><h3>Alertes</h3><a href="#rapports">Rapports ' + icon('arrow') + '</a></div>' + (alerts.length ? '<ul class="rows">' + alerts.join('') + '</ul>' : '<p class="empty">Aucune alerte.</p>') + '</section>' +
      '</div>' +
      '<div class="grid grid-2">' +
        '<section class="panel"><div class="panel-head"><h3>' + (last24.length ? 'Feux des dernières 24 h' : 'Aucun feu sur 24 h · 72 dernières heures') + '</h3></div>' +
          (recent.length ? '<ul class="rows">' + recent.map(function (x) { var worst = x.crew.map(function (p) { return p.contamination; }).sort(function (a, b) { return ['nulle', 'faible', 'moyenne', 'forte'].indexOf(b) - ['nulle', 'faible', 'moyenne', 'forte'].indexOf(a); })[0]; return '<li><span class="when">' + fmtDT(x.dateObj).split(' · ')[1] + '</span><span class="what"><b>' + esc(TYPE[x.type_feu]) + '</b><small>' + esc(x.commune) + ' · ' + x.crew.length + ' agents</small></span><span class="right">' + (worst ? badge(CONT[worst]) : '') + '</span></li>'; }).join('') + '</ul>' : '<p class="empty">Aucune intervention récente.</p>') + '</section>' +
        '<section class="panel"><div class="panel-head"><h3>État de contamination des agents (30 j)</h3></div>' + stack + '<p class="note">' + m30.length + ' expositions enregistrées sur 30 jours.</p></section>' +
      '</div>' +
      '<section class="panel"><div class="panel-head"><h3>Agents à surveiller (indice cumulé 90 j)</h3><a href="#suivi">Suivi individuel ' + icon('arrow') + '</a></div>' +
        '<table class="dtable"><thead><tr><th>Agent</th><th>Matricule</th><th class="num">Indice 90 j</th><th>Niveau</th><th>Dernier rendez-vous</th></tr></thead><tbody>' +
        top.map(function (id) { var u = db.byId[id] || {}; var lastR = db.rdv.filter(function (r) { return r.agent === id && r.statut === 'realise'; }).sort(function (a, b) { return b.dateObj - a.dateObj; })[0];
          return '<tr><td data-l="Agent"><b>' + esc(u.name) + '</b></td><td data-l="Matricule">' + esc(u.matricule) + '</td><td class="num" data-l="Indice">' + byAgent[id] + '</td><td>' + badge(byAgent[id] < 120 ? NIV.faible : byAgent[id] < 250 ? NIV.moyen : NIV.eleve) + '</td><td data-l="Dernier RDV">' + (lastR ? fmtD(lastR.dateObj) : '—') + '</td></tr>'; }).join('') +
        '</tbody></table></section>';
    bindCharts(root);
  }

  function viewDossier(root) {
    var me = db.me || {}, mine = db.mine, y = mine.filter(function (p) { return within(p.it.dateObj, 365); });
    var cumul = sum(y, function (p) { return p.indice; }), all = sum(mine, function (p) { return p.indice; });
    var rdvs = db.rdv.filter(function (r) { return r.agent === db.meId; }).sort(function (a, b) { return b.dateObj - a.dateObj; });
    root.innerHTML = head('Dossier personnel', esc((me.grade ? me.grade + ' ' : '') + (me.name || S.name)) + ' · ' + esc(me.matricule || S.matricule) + ' · ' + esc(centreName())) +
      '<div class="grid grid-3">' +
        kpi('flame', '', 'Interventions enregistrées', mine.length, 'Depuis le début du suivi') +
        kpi('chart', 'warn', 'Indice cumulé (12 mois)', cumul, badge(cumulLevel(cumul)) + 'Total : ' + all) +
        kpi('cal', 'info', 'Rendez-vous SSSM', rdvs.filter(function (r) { return r.statut === 'prevu' && r.dateObj >= new Date(); }).length + ' prévu', rdvs.filter(function (r) { return r.statut === 'realise'; })[0] ? 'Dernier : ' + fmtD(rdvs.filter(function (r) { return r.statut === 'realise'; })[0].dateObj) : 'Aucun rendez-vous passé') +
      '</div>' +
      '<section class="panel"><div class="panel-head"><h3>Historique des expositions</h3><a href="#export">Exporter ' + icon('arrow') + '</a></div>' +
        (mine.length ? '<table class="dtable"><thead><tr><th>Date</th><th>Intervention</th><th>Rôle · engin</th><th class="num">ARI / sans ARI</th><th>Contamination</th><th>Décontamination</th><th class="num">Indice</th></tr></thead><tbody>' +
          mine.map(function (p) { return '<tr><td data-l="Date">' + fmtD(p.it.dateObj) + '</td><td data-l="Intervention"><b>' + esc(TYPE[p.it.type_feu]) + '</b><br><span class="note">' + esc(p.it.precision) + ' · ' + esc(p.it.numero) + '</span></td><td data-l="Rôle">' + esc(ROLE_TENU[p.role_tenu]) + (p.engin ? ' · ' + esc(p.engin) : '') + '</td><td class="num" data-l="ARI / sans ARI">' + (p.ari_min || 0) + ' / ' + (p.sans_ari_min || 0) + ' min</td><td>' + cont(p) + '</td><td>' + decon(p) + '</td><td class="num" data-l="Indice">' + p.indice + '</td></tr>'; }).join('') +
          '</tbody></table>' : '<p class="empty">Aucune intervention enregistrée à votre nom.</p>') + '</section>' +
      '<section class="panel"><div class="panel-head"><h3>Rendez-vous SSSM</h3></div>' + (rdvs.length ? '<ul class="rows">' + rdvs.map(function (r) {
        return '<li><span class="when">' + fmtD(r.dateObj) + '</span><span class="what"><b>' + esc(r.motif) + '</b><small>' + esc(r.lieu || '') + '</small></span><span class="right">' + badge(r.statut === 'prevu' ? ['Prévu', 'badge-info'] : r.statut === 'realise' ? ['Réalisé', 'badge-ok'] : ['Annulé', 'badge-neutral']) + '</span></li>'; }).join('') + '</ul>' : '<p class="empty">Aucun rendez-vous.</p>') + '</section>';
  }

  function crewTable(it, opts) {
    opts = opts || {};
    var crew = it.crew.slice().sort(function (a, b) { return (a.engin || '').localeCompare(b.engin || '') || (a.role_tenu === 'chef_agres' ? -1 : 1); });
    var prel = function (p) { return (db.prelevements || []).filter(function (x) { return x.participation === p.id; }).map(function (x) { return '<span class="badge badge-info">' + esc(PREL[x.type]) + ' : ' + x.valeur + ' ' + esc(x.unite || '') + '</span>'; }).join(' '); };
    function rows(list) { return list.map(function (p) {
      return '<tr><td data-l="Agent"><b>' + esc(p.user ? p.user.name : '—') + '</b>' + (opts.byEngin ? '' : (p.engin ? '<br><span class="note">' + esc(p.engin) + '</span>' : '')) + '</td><td data-l="Rôle">' + esc(ROLE_TENU[p.role_tenu]) + '</td><td class="num" data-l="ARI / sans ARI">' + (p.ari_min || 0) + ' / ' + (p.sans_ari_min || 0) + ' min</td><td>' + cont(p) + '</td><td>' + decon(p) + '</td>' + (opts.sssm ? '<td>' + (prel(p) || '<span class="note">—</span>') + '</td>' : '') + '</tr>';
    }).join(''); }
    var th = '<thead><tr><th>Agent</th><th>Rôle</th><th class="num">ARI / sans ARI</th><th>Contamination</th><th>Décontamination</th>' + (opts.sssm ? '<th>Prélèvements</th>' : '') + '</tr></thead>';
    if (!opts.byEngin) return '<table class="dtable">' + th + '<tbody>' + rows(crew) + '</tbody></table>';
    var groups = {}; crew.forEach(function (p) { (groups[p.engin || '—'] = groups[p.engin || '—'] || []).push(p); });
    return Object.keys(groups).map(function (g) { return '<div class="crew-group"><h4>' + esc(g) + '</h4><table class="dtable">' + th + '<tbody>' + rows(groups[g]) + '</tbody></table></div>'; }).join('');
  }
  function reportMeta(it) {
    var bits = [it.ambiance === 'feu_fumee' ? 'Feu et fumées' : it.ambiance === 'fumees_faibles' ? 'Fumées faibles' : it.ambiance === 'aucun_feu' ? 'Aucun feu' : '', it.motorisation ? 'Motorisation : ' + it.motorisation : '', it.zone_deshabillage ? 'Zone de déshabillage' : '', it.epi_ensaches ? 'EPI ensachés' : '', it.suspicion_amiante ? 'Suspicion d\'amiante' : ''].filter(Boolean);
    return '<div class="chips">' + bits.map(function (b) { return '<span class="chip">' + esc(b) + '</span>'; }).join('') + '</div>';
  }

  function viewRapportsCos(root) {
    var its = db.interventions.filter(function (x) { return x.cos === db.meId; });
    var sigBy = {}; db.signalements.forEach(function (s) { sigBy[s.intervention] = s; });
    root.innerHTML = head("Rapports d'interventions", 'Le compte rendu de contamination et de décontamination de votre équipage, après chaque intervention que vous avez commandée.', '<button class="btn btn-primary" type="button" data-soon="Nouveau rapport">' + icon('clip') + 'Nouveau rapport</button>') +
      '<div>' + its.map(function (x) {
        var s = VBSData.reportState(x), locked = x.statut === 'controle_sssm', forte = x.crew.some(function (p) { return p.contamination === 'forte'; }), sig = sigBy[x.id];
        var stateBadge = x.statut === 'brouillon' ? badge(s === 'retard' ? ['À compléter · en retard', 'badge-late'] : ['À compléter', 'badge-pending']) : badge(STATE[s]);
        return '<details class="report"' + (x.statut === 'brouillon' ? ' open' : '') + '><summary><span class="when">' + fmtDT(x.dateObj) + '</span><span class="what"><b>' + esc(TYPE[x.type_feu]) + ' · ' + esc(x.precision) + '</b><br><span class="note">' + esc(x.numero) + ' · ' + esc(x.commune) + ' · ' + x.crew.length + ' engagés</span></span><span class="right">' + (locked ? '<span class="lock">' + icon('lock') + 'Verrouillé</span> ' : '') + stateBadge + '</span></summary>' +
          '<div class="body">' + reportMeta(x) + crewTable(x) +
          '<div class="page-head" style="margin-top:14px;justify-content:flex-start">' +
            (x.statut === 'brouillon' ? '<button class="btn btn-primary btn-sm" type="button" data-soon="Compléter le rapport">' + icon('clip') + 'Compléter le rapport</button>' : '') +
            (sig ? '<span class="badge badge-info">Signalement SSSM : ' + esc({ ouvert: 'ouvert', pris_en_charge: 'pris en charge', clos: 'clos' }[sig.statut]) + '</span>' : (forte ? '<button class="btn btn-secondary btn-sm" type="button" data-soon="Signalement SSSM">' + icon('alert') + 'Signalement SSSM</button>' : '')) +
          '</div></div></details>';
      }).join('') + '</div>';
    bindSoon(root);
  }

  var gFilter = 'tous';
  function viewGestion(root) {
    var its = db.interventions, filters = [['tous', 'Tous'], ['retard', 'En retard'], ['attente', 'En attente'], ['transmis', 'Transmis SSSM'], ['controle', 'Validés']];
    var list = its.filter(function (x) { return gFilter === 'tous' || VBSData.reportState(x) === gFilter; });
    root.innerHTML = head('Gestion globale', 'Détail des rapports de contamination du centre par statut. Aucune donnée d\'exposition individuelle n\'est affichée.',
      '<div class="seg" role="group" aria-label="Filtrer par statut">' + filters.map(function (f) { var n = f[0] === 'tous' ? its.length : its.filter(function (x) { return VBSData.reportState(x) === f[0]; }).length; return '<button type="button" data-g="' + f[0] + '" aria-pressed="' + (gFilter === f[0]) + '">' + f[1] + ' (' + n + ')</button>'; }).join('') + '</div>') +
      '<section class="panel"><table class="dtable"><thead><tr><th>Date</th><th>N°</th><th>Intervention</th><th>CA / COS</th><th class="num">Engagés</th><th>Statut</th><th></th></tr></thead><tbody>' +
      list.map(function (x) { var s = VBSData.reportState(x);
        return '<tr><td data-l="Date">' + fmtD(x.dateObj) + '</td><td data-l="N°">' + esc(x.numero) + '</td><td data-l="Intervention">' + esc(TYPE[x.type_feu]) + '</td><td data-l="CA / COS">' + esc(x.cosUser ? x.cosUser.name : '—') + '</td><td class="num" data-l="Engagés">' + (x.crew.length || '—') + '</td><td>' + badge(STATE[s]) + '</td><td>' + (s === 'retard' || s === 'attente' ? '<button class="btn btn-secondary btn-sm" type="button" data-remind="' + x.id + '">' + icon('send') + 'Relancer</button>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table></section>';
    root.querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { gFilter = b.dataset.g; route(); }; });
    bindRemind(root);
  }

  var sFilter = 'a_controler', sMode = 'engin';
  function viewRapportsSssm(root) {
    var sigIds = db.signalements.filter(function (s) { return s.statut !== 'clos'; }).map(function (s) { return s.intervention; });
    var F = { a_controler: function (x) { return x.statut === 'transmis'; }, signales: function (x) { return sigIds.indexOf(x.id) !== -1; }, tous: function () { return true; } };
    var list = db.interventions.filter(F[sFilter]);
    root.innerHTML = head('Rapports', 'Toutes les interventions du département. Chaque consultation et correction est journalisée.',
      '<div class="page-head" style="gap:8px"><div class="seg" role="group" aria-label="Filtre"><button type="button" data-sf="a_controler" aria-pressed="' + (sFilter === 'a_controler') + '">À contrôler</button><button type="button" data-sf="signales" aria-pressed="' + (sFilter === 'signales') + '">Signalés</button><button type="button" data-sf="tous" aria-pressed="' + (sFilter === 'tous') + '">Tous</button></div>' +
      '<div class="seg" role="group" aria-label="Affichage"><button type="button" data-sm="engin" aria-pressed="' + (sMode === 'engin') + '">Engin par engin</button><button type="button" data-sm="agents" aria-pressed="' + (sMode === 'agents') + '">Tous les agents</button></div></div>') +
      (list.length ? '<div>' + list.map(function (x) {
        return '<details class="report"><summary><span class="when">' + fmtDT(x.dateObj) + '</span><span class="what"><b>' + esc(TYPE[x.type_feu]) + ' · ' + esc(x.precision) + '</b><br><span class="note">' + esc(x.numero) + ' · CA/COS : ' + esc(x.cosUser ? x.cosUser.name : '—') + ' · ' + x.crew.length + ' engagés</span></span><span class="right">' + badge(STATE[VBSData.reportState(x)]) + '</span></summary>' +
          '<div class="body">' + reportMeta(x) + crewTable(x, { byEngin: sMode === 'engin', sssm: true }) +
          '<div class="page-head" style="margin-top:14px;justify-content:flex-start"><button class="btn btn-secondary btn-sm" type="button" data-soon="Modifier le rapport">Modifier</button><button class="btn btn-secondary btn-sm" type="button" data-soon="Ajouter un prélèvement">' + icon('flask') + 'Ajouter un prélèvement</button>' + (x.statut === 'transmis' ? '<button class="btn btn-primary btn-sm" type="button" data-soon="Valider et verrouiller">' + icon('lock') + 'Valider et verrouiller</button>' : '') + '</div></div></details>';
      }).join('') + '</div>' : '<p class="empty">Aucun rapport dans cette catégorie.</p>');
    root.querySelectorAll('[data-sf]').forEach(function (b) { b.onclick = function () { sFilter = b.dataset.sf; route(); }; });
    root.querySelectorAll('[data-sm]').forEach(function (b) { b.onclick = function () { sMode = b.dataset.sm; route(); }; });
    bindSoon(root);
  }

  var suiviId = null;
  function viewSuivi(root) {
    var people = db.users.filter(function (u) { return u.role === 'agent' || u.role === 'cos'; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    suiviId = suiviId || (people[0] && people[0].id);
    var u = db.byId[suiviId] || {}, parts = db.participations.filter(function (p) { return p.agent === suiviId && p.it; }).sort(function (a, b) { return b.it.dateObj - a.it.dateObj; });
    var rdvs = db.rdv.filter(function (r) { return r.agent === suiviId; }).sort(function (a, b) { return b.dateObj - a.dateObj; });
    var prels = db.prelevements.filter(function (x) { return parts.some(function (p) { return p.id === x.participation; }); });
    var c12 = sum(parts.filter(function (p) { return within(p.it.dateObj, 365); }), function (p) { return p.indice; });
    var lastR = rdvs.filter(function (r) { return r.statut === 'realise'; })[0], nextR = rdvs.filter(function (r) { return r.statut === 'prevu' && r.dateObj >= new Date(); }).sort(function (a, b) { return a.dateObj - b.dateObj; })[0];
    root.innerHTML = head('Suivi individuel', 'Dossier de chaque agent : expositions, prélèvements et rendez-vous.',
      '<div class="field"><label class="label" for="agent-pick">Agent</label><select class="select" id="agent-pick">' + people.map(function (p) { return '<option value="' + p.id + '"' + (p.id === suiviId ? ' selected' : '') + '>' + esc(p.name + ' · ' + p.matricule) + '</option>'; }).join('') + '</select></div>') +
      '<div class="grid grid-4">' +
        kpi('user', '', esc(u.grade || ''), esc(u.name || ''), esc(u.matricule || '')) +
        kpi('chart', 'warn', 'Indice cumulé (12 mois)', c12, badge(cumulLevel(c12))) +
        kpi('cal', 'info', 'Dernier rendez-vous', lastR ? fmtD(lastR.dateObj) : '—', nextR ? 'Prochain : ' + fmtD(nextR.dateObj) : 'Aucun rendez-vous prévu') +
        kpi('flask', '', 'Prélèvements', prels.length, prels[0] ? 'Dernier : ' + esc(PREL[prels[0].type]) + ' ' + prels[0].valeur + ' ' + esc(prels[0].unite) : 'Aucun') +
      '</div>' +
      '<section class="panel"><div class="panel-head"><h3>Évolution de l\'indice</h3></div>' + lineChart(monthly(parts, function (p) { return p.it.dateObj; }, function (p) { return p.indice; })) + '</section>' +
      '<section class="panel"><div class="panel-head"><h3>Historique des expositions</h3><button class="link-btn" type="button" data-soon="Planifier un rendez-vous">' + icon('cal') + 'Planifier un rendez-vous</button></div>' +
        (parts.length ? '<table class="dtable"><thead><tr><th>Date</th><th>Intervention</th><th>Rôle · engin</th><th class="num">ARI / sans ARI</th><th>Contamination</th><th>Décontamination</th><th class="num">Indice</th></tr></thead><tbody>' + parts.map(function (p) {
          return '<tr><td data-l="Date">' + fmtD(p.it.dateObj) + '</td><td data-l="Intervention">' + esc(TYPE[p.it.type_feu]) + '<br><span class="note">' + esc(p.it.numero) + '</span></td><td data-l="Rôle">' + esc(ROLE_TENU[p.role_tenu]) + (p.engin ? ' · ' + esc(p.engin) : '') + '</td><td class="num" data-l="ARI / sans ARI">' + (p.ari_min || 0) + ' / ' + (p.sans_ari_min || 0) + ' min</td><td>' + cont(p) + '</td><td>' + decon(p) + '</td><td class="num" data-l="Indice">' + p.indice + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="empty">Aucune exposition.</p>') + '</section>';
    bindCharts(root); bindSoon(root);
    var pick = root.querySelector('#agent-pick'); if (pick) pick.onchange = function () { suiviId = pick.value; route(); };
  }

  function viewExport(root) {
    var opts = [];
    var mineRows = function () { return [['Date', 'Numéro', 'Type', 'Précision', 'Commune', 'Rôle', 'Engin', 'ARI (min)', 'Sans ARI (min)', 'Contamination', 'Décontamination validée', 'Indice']].concat(db.mine.map(function (p) { return [fmtD(p.it.dateObj), p.it.numero, TYPE[p.it.type_feu], p.it.precision, p.it.commune, ROLE_TENU[p.role_tenu], p.engin, p.ari_min, p.sans_ari_min, CONT[p.contamination][0], p.decon_validee ? 'oui' : 'non', p.indice]; })); };
    if (S.role !== 'sssm') opts.push(['perso', 'Mes expositions (CSV)', 'Votre historique complet, à ouvrir dans un tableur.', function () { csvDownload('mes-expositions.csv', mineRows()); }]);
    if (S.role !== 'sssm') opts.push(['pdf', 'Mon dossier (PDF)', "Ouvre votre dossier personnel prêt à imprimer ou à enregistrer en PDF.", function () { location.hash = 'dossier'; setTimeout(function () { window.print(); }, 400); }]);
    if (S.role === 'commandement' || S.role === 'sssm') opts.push(['etat', 'État des rapports du centre (CSV)', 'Statut de chaque rapport : en attente, en retard, transmis, validé.', function () { csvDownload('etat-rapports.csv', [['Date', 'Numéro', 'Type', 'Commune', 'CA/COS', 'Statut']].concat(db.interventions.map(function (x) { return [fmtD(x.dateObj), x.numero, TYPE[x.type_feu], x.commune, x.cosUser ? x.cosUser.name : '', STATE[VBSData.reportState(x)][0]]; }))); }]);
    if (S.role === 'sssm') {
      opts.push(['expo', 'Toutes les expositions (CSV)', 'Une ligne par agent et par intervention.', function () { csvDownload('expositions.csv', [['Date', 'Numéro', 'Type', 'Agent', 'Matricule', 'Rôle', 'Engin', 'ARI (min)', 'Sans ARI (min)', 'Contamination', 'Décon. validée', 'Indice']].concat(db.participations.filter(function (p) { return p.it; }).map(function (p) { return [fmtD(p.it.dateObj), p.it.numero, TYPE[p.it.type_feu], p.user ? p.user.name : '', p.user ? p.user.matricule : '', ROLE_TENU[p.role_tenu], p.engin, p.ari_min, p.sans_ari_min, CONT[p.contamination][0], p.decon_validee ? 'oui' : 'non', p.indice]; }))); }]);
      opts.push(['ref', 'Référentiel des expositions (CSV)', 'La base de données centrale validée par le SSSM.', function () { csvDownload('referentiel.csv', [['Motif', 'Phase', 'Protection', 'Agents CMR', 'Niveau', 'Statut']].concat(db.referentiel.map(function (r) { return [TYPE[r.type_feu], PHASE[r.phase], PROT[r.protection], r.agents_cmr, NIV[r.niveau][0], r.statut === 'valide' ? 'Validé' : 'Suggestion IA']; }))); }]);
    }
    root.innerHTML = head('Export', S.role === 'sssm' ? 'Tous les exports sont disponibles pour le SSSM.' : S.role === 'commandement' ? 'Vos données personnelles et l\'état des rapports de votre centre.' : 'Vos données personnelles uniquement.',
      S.role === 'commandement' ? '<div class="field"><label class="label" for="zone">Périmètre</label><select class="select" id="zone"><option>' + esc(centreName()) + '</option><option disabled>Autres centres du groupement (version SDIS)</option></select></div>' : '') +
      '<div class="grid grid-2">' + opts.map(function (o) { return '<div class="callout"><span class="icon-tile">' + icon('download') + '</span><div><strong>' + o[1] + '</strong><span class="sub">' + o[2] + '</span></div><button class="btn btn-secondary btn-sm" type="button" data-exp="' + o[0] + '">Télécharger</button></div>'; }).join('') + '</div>' +
      '<p class="note">Les fichiers sont générés dans votre navigateur. Ils contiennent des données personnelles : conservez-les en lieu sûr.</p>';
    opts.forEach(function (o) { var b = root.querySelector('[data-exp="' + o[0] + '"]'); if (b) b.onclick = o[3]; });
  }

  var rType = 'tous';
  function viewReferentiel(root) {
    var rows = db.referentiel.filter(function (r) { return rType === 'tous' || r.type_feu === rType; });
    var sug = db.referentiel.filter(function (r) { return r.statut === 'suggestion_ia'; }).length;
    root.innerHTML = head('Base de données centrale', "Pour chaque motif de départ, phase et protection, le type d'exposition retenu. L'IA propose à partir des études ; le SSSM décide. Tous les rapports s'appuient sur ce référentiel.",
      '<div class="field"><label class="label" for="rtype">Motif de départ</label><select class="select" id="rtype"><option value="tous">Tous les motifs</option>' + Object.keys(TYPE).map(function (k) { return '<option value="' + k + '"' + (rType === k ? ' selected' : '') + '>' + TYPE[k] + '</option>'; }).join('') + '</select></div>') +
      (sug ? '<div class="callout red"><span class="icon-tile">' + icon('alert') + '</span><div><strong>' + sug + ' suggestion' + (sug > 1 ? 's' : '') + ' de l\'IA à valider</strong><span class="sub">Elles ne s\'appliquent aux rapports qu\'après votre validation.</span></div></div>' : '') +
      '<section class="panel"><table class="dtable"><thead><tr><th>Motif</th><th>Phase</th><th>Protection</th><th>Agents CMR</th><th>Niveau</th><th>Statut</th><th></th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td data-l="Motif">' + esc(TYPE[r.type_feu]) + '</td><td data-l="Phase">' + esc(PHASE[r.phase]) + '</td><td data-l="Protection">' + esc(PROT[r.protection]) + '</td><td data-l="Agents CMR">' + esc(r.agents_cmr) + '</td><td>' + badge(NIV[r.niveau]) + '</td><td>' + (r.statut === 'valide' ? badge(['Validé SSSM', 'badge-ok']) : badge(['Suggestion IA', 'badge-info'])) + '</td><td>' + (r.statut === 'suggestion_ia' ? '<button class="btn btn-primary btn-sm" type="button" data-validate="' + r.id + '">' + icon('check') + 'Valider</button>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table></section>';
    root.querySelector('#rtype').onchange = function (e) { rType = e.target.value; route(); };
    root.querySelectorAll('[data-validate]').forEach(function (b) {
      b.onclick = async function () {
        var r = db.referentiel.find(function (x) { return x.id === b.dataset.validate; }); b.disabled = true;
        try {
          if (!S.offline) await VBS.request('/api/collections/referentiel/records/' + r.id, { method: 'PATCH', body: { statut: 'valide', valide_par: db.meId, source: 'Validé par le SSSM' } });
          r.statut = 'valide'; toast('Ligne validée : elle s\'applique désormais aux nouveaux rapports.'); route();
        } catch (e) { b.disabled = false; toast('Validation impossible : ' + e.message); }
      };
    });
  }

  function viewReglementation(root) {
    var IMP = { info: ['Information', 'badge-neutral'], a_suivre: ['À suivre', 'badge-info'], action_requise: ['Action requise', 'badge-late'] };
    root.innerHTML = head('Suivi réglementation', 'Les évolutions qui concernent le suivi des expositions des sapeurs-pompiers.') +
      db.reglementation.map(function (a) { var d = new Date(String(a.date).replace(' ', 'T'));
        return '<section class="panel"><div class="panel-head"><h3>' + esc(a.titre) + '</h3>' + badge(IMP[a.impact] || IMP.info) + '</div><p>' + esc(a.resume) + '</p><p class="note">' + fmtD(d) + ' · ' + esc(a.source) + '</p></section>'; }).join('') +
      '<p class="note">Contenus de démonstration. Dans la version SDIS, cette veille est alimentée et vérifiée par VB Safety.</p>';
  }

  function bindSoon(root) {
    root.querySelectorAll('[data-soon]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); toast('« ' + b.dataset.soon + ' » : en cours de construction dans cette démo.'); }; });
  }

  var VIEWS = {
    'tableau-de-bord': { agent: viewDashPerso, cos: viewDashCos, commandement: viewDashCmd, sssm: viewDashSssm },
    dossier: viewDossier, rapports: { cos: viewRapportsCos, sssm: viewRapportsSssm }, gestion: viewGestion,
    suivi: viewSuivi, 'export': viewExport, referentiel: viewReferentiel, reglementation: viewReglementation
  };
  function renderInto(id, root) {
    var v = VIEWS[id]; if (v && typeof v === 'object') v = v[S.role];
    if (!v) { root.innerHTML = '<p class="empty">Page introuvable.</p>'; return; }
    v(root);
  }

  // =================================================================== coque
  var nav = $('nav');
  nav.innerHTML = MENU.map(function (m) { return '<li><a class="nav-item" href="#' + m.id + '" data-id="' + m.id + '">' + icon(m.icon) + '<span>' + m.label + '</span><span class="nav-count" data-count="' + m.id + '" hidden></span></a></li>'; }).join('');
  $('side-role').textContent = 'Espace ' + ROLE_LABEL[S.role];
  $('user-name').textContent = S.name || S.matricule;
  $('user-role').textContent = ROLE_LABEL[S.role] + ' · ' + S.matricule;
  $('user-initials').textContent = String(S.name || S.matricule).split(/[ .]+/).filter(Boolean).map(function (x) { return x[0]; }).join('').slice(0, 2).toUpperCase();
  if (S.offline) $('demo-banner').textContent = 'Version de démonstration · aperçu sans serveur · données fictives';
  $('logout').onclick = function () { VBS.logout(); };
  var app = $('app'), tgl = $('menu-toggle');
  tgl.onclick = function () { var o = app.classList.toggle('nav-open'); tgl.setAttribute('aria-expanded', o); };
  nav.addEventListener('click', function () { app.classList.remove('nav-open'); tgl.setAttribute('aria-expanded', 'false'); });

  function route() {
    var id = location.hash.slice(1) || 'tableau-de-bord';
    var m = MENU.find(function (x) { return x.id === id; }) || MENU[0];
    nav.querySelectorAll('.nav-item').forEach(function (a) { a.setAttribute('aria-current', a.dataset.id === m.id ? 'page' : 'false'); });
    $('page-title').textContent = m.label;
    document.title = m.label + ' · Carnet Expo CMR';
    if (!db) return;
    var view = $('view'); renderInto(m.id, view);
  }
  window.addEventListener('hashchange', function () { route(); $('view').focus({ preventScroll: true }); window.scrollTo(0, 0); });

  function counts() {
    var c = {};
    if (S.role === 'cos') c.rapports = db.interventions.filter(function (x) { return x.cos === db.meId && x.statut === 'brouillon'; }).length;
    if (S.role === 'commandement') c.gestion = db.interventions.filter(function (x) { return VBSData.reportState(x) === 'retard'; }).length;
    if (S.role === 'sssm') { c.rapports = db.interventions.filter(function (x) { return x.statut === 'transmis'; }).length; c.referentiel = db.referentiel.filter(function (r) { return r.statut === 'suggestion_ia'; }).length; c.reglementation = db.reglementation.filter(function (r) { return r.impact === 'action_requise'; }).length; }
    Object.keys(c).forEach(function (k) { var el = nav.querySelector('[data-count="' + k + '"]'); if (el && c[k]) { el.textContent = c[k]; el.hidden = false; } });
    var alerts = S.role === 'sssm' ? db.signalements.filter(function (s) { return s.statut === 'ouvert'; }).length + (c.reglementation || 0)
      : S.role === 'cos' ? c.rapports : S.role === 'commandement' ? c.gestion : (nextRdv(db, db.meId) && (nextRdv(db, db.meId).dateObj - Date.now()) < 14 * VBSData.DAY ? 1 : 0);
    var bell = $('bell');
    if (alerts) bell.insertAdjacentHTML('beforeend', '<span class="dot"></span>');
    bell.setAttribute('aria-label', alerts ? alerts + ' alerte' + (alerts > 1 ? 's' : '') : 'Aucune alerte');
    bell.onclick = function () { location.hash = S.role === 'sssm' ? 'tableau-de-bord' : S.role === 'cos' ? 'rapports' : S.role === 'commandement' ? 'gestion' : 'dossier'; };
  }

  // =================================================================== visite guidée
  var TOUR_KEY = 'vbs-tour-' + S.role, step = 0;
  function tourSeen() { try { return localStorage.getItem(TOUR_KEY) === '1'; } catch (e) { return false; } }
  function tourDone() { try { localStorage.setItem(TOUR_KEY, '1'); } catch (e) {} }
  function openTour() {
    step = 0; document.body.classList.add('touring'); $('tour').hidden = false;
    $('tour-lead').textContent = 'Voici un aperçu rapide de votre espace ' + ROLE_LABEL[S.role] + '.';
    drawTour();
  }
  function closeTour() {
    tourDone(); $('tour').hidden = true; document.body.classList.remove('touring');
    nav.querySelectorAll('.nav-item').forEach(function (a) { a.removeAttribute('data-tour-on'); });
    location.hash = 'tableau-de-bord'; route();
  }
  function drawTour() {
    var n = MENU.length;
    $('tour-count').innerHTML = '<b>' + (step + 1) + '</b> / ' + n;
    $('tour-bar').innerHTML = MENU.map(function (_, i) { return '<i class="' + (i <= step ? 'on' : '') + '"></i>'; }).join('');
    $('tour-dots').innerHTML = MENU.map(function (_, i) { return '<i class="' + (i === step ? 'on' : '') + '"></i>'; }).join('');
    $('tour-steps').innerHTML = MENU.map(function (m, i) {
      return '<li class="tour-step' + (i === step ? ' on' : '') + '" data-step="' + i + '"><span class="num">' + (i + 1) + '</span><h4>' + icon(m.icon) + esc(m.label) + '</h4><p>' + esc(m.tour) + '</p>' +
        '<button class="btn btn-primary btn-sm" type="button" data-next>' + (i === n - 1 ? 'Terminer' : 'Suivant') + icon('arrow', 'icon-arrow') + '</button></li>';
    }).join('');
    $('tour-prev').disabled = step === 0;
    $('tour-next').firstElementChild.textContent = step === n - 1 ? "Accéder à mon espace" : 'Suivant';
    nav.querySelectorAll('.nav-item').forEach(function (a) { a.setAttribute('data-tour-on', a.dataset.id === MENU[step].id ? 'true' : 'false'); });
    var prev = $('tour-preview');
    if (db) { prev.innerHTML = '<div class="view"></div>'; renderInto(MENU[step].id, prev.firstChild); }
    $('tour-steps').querySelectorAll('.tour-step').forEach(function (li) { li.onclick = function (e) { if (e.target.closest('[data-next]')) return; step = +li.dataset.step; drawTour(); }; });
    $('tour-steps').querySelectorAll('[data-next]').forEach(function (b) { b.onclick = next; });
  }
  function next() { if (step < MENU.length - 1) { step++; drawTour(); } else closeTour(); }
  $('tour-next').onclick = next;
  $('tour-prev').onclick = function () { if (step > 0) { step--; drawTour(); } };
  $('tour-skip').onclick = closeTour;
  $('tour-open').onclick = function () { app.classList.remove('nav-open'); openTour(); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('tour').hidden) closeTour(); });

  // =================================================================== démarrage
  route();
  VBSData.load(S).then(function (data) {
    db = data; counts(); route();
    if (!tourSeen()) openTour();
  }).catch(function (err) {
    var expired = err && (err.status === 401 || err.status === 403);
    $('view').innerHTML = '<section class="panel"><h2>' + (expired ? 'Session expirée' : 'Données indisponibles') + '</h2><p class="note">' + (expired ? 'Reconnectez-vous pour continuer.' : 'Le serveur de démonstration ne répond pas. Vous pouvez vous reconnecter en mode aperçu.') + '</p><p style="margin-top:14px"><a class="btn btn-primary" href="connexion.html">Retour à la connexion</a></p></section>';
  });
})();
