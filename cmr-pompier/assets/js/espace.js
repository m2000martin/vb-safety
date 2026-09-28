// Espace connecté : menu par rôle, visite guidée, tableaux de bord et vues.
(function () {
  var S = VBS.requireRole(['agent', 'cos', 'commandement', 'sssm']);
  if (!S) return;

  // =================================================================== libellés
  var ROLE_LABEL = { agent: 'Agent', cos: 'CA / COS', commandement: 'Chef CI / commandement', sssm: 'SSSM' };
  var TYPE = { habitation: "Feu d'habitation", vehicule: 'Feu de véhicule', industriel: 'Feu industriel', vegetation: 'Feu de végétation', conteneur: 'Feu de conteneur', chimique: 'Matières dangereuses / chimique', autre: 'Autre feu' };
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
      item(M.rapportsCos, "Rédigez le rapport de contamination de votre équipage après chaque intervention. Sur une opération à plusieurs agrès, chaque CA remplit le sien et le COS suit qui l'a fait. Les rapports validés par le SSSM sont verrouillés."),
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
      item(M.rapportsSssm, "Toutes les interventions, engin par engin ou agent par agent. Corrigez un rapport, et importez les mesures (ex. CO sanguin) de toute une opération depuis un fichier."),
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

  function myRappels() {
    return (db.rappels || []).filter(function (r) { return r.a === db.meId && r.it && r.it.statut === 'brouillon'; }).sort(function (a, b) { return b.createdObj - a.createdObj; });
  }
  function viewDashCos(root) {
    var pend = db.interventions.filter(function (x) { return x.cos === db.meId && x.statut === 'brouillon'; });
    var raps = myRappels();
    var extra = pend.length
      ? '<div class="callout red"><span class="icon-tile">' + icon('clip') + '</span><div><strong>' + pend.length + ' rapport' + (pend.length > 1 ? 's' : '') + ' à compléter</strong><span class="sub">' + esc(pend.map(function (x) { return TYPE[x.type_feu] + ' du ' + fmtD(x.dateObj); }).join(' · ')) + '</span></div><a class="btn btn-primary btn-sm" href="#rapport/' + pend[0].id + '">Compléter</a></div>'
      : '<div class="callout"><span class="icon-tile ok">' + icon('check') + '</span><div><strong>Tous vos rapports sont à jour</strong></div></div>';
    viewDashPerso(root, extra);
    if (raps.length) {
      var r = raps[0], u = db.byId[r.de];
      root.querySelector('.page-head').insertAdjacentHTML('afterend', '<div class="callout red"><span class="icon-tile">' + icon('bell') + '</span><div><strong>Relance de ' + esc(u ? (u.grade ? u.grade + ' ' : '') + u.name : 'votre Chef CI') + ' · ' + fmtD(r.createdObj) + '</strong><span class="sub">' + esc(r.message || '') + '</span></div><a class="btn btn-primary btn-sm" href="#rapport/' + r.intervention + '">Compléter</a></div>');
    }
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
  function lastRappel(itId) {
    return (db.rappels || []).filter(function (r) { return r.intervention === itId; }).sort(function (a, b) { return b.createdObj - a.createdObj; })[0];
  }
  function bindRemind(root) {
    root.querySelectorAll('[data-remind]').forEach(function (b) {
      var r = lastRappel(b.dataset.remind);
      if (r && r.createdObj && within(r.createdObj, 1)) { b.disabled = true; b.innerHTML = icon('check') + 'Relancé le ' + fmtD(r.createdObj); }
      b.onclick = async function () {
        var x = db.inter[b.dataset.remind]; b.disabled = true;
        try {
          await VBSData.create(S, 'rappels', { intervention: x.id, de: db.meId, a: x.cos, message: 'Merci de compléter le rapport de contamination ' + x.numero + ' (' + TYPE[x.type_feu] + ' du ' + fmtD(x.dateObj) + ').' });
          toast('Rappel envoyé à ' + (x.cosUser ? x.cosUser.name : 'CA/COS') + ' : il le verra sur son tableau de bord.');
          await reload();
        } catch (e) { b.disabled = false; toast('Envoi impossible : ' + e.message); }
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
      return '<li><span class="when">' + (s.it ? fmtD(s.it.dateObj) : '') + '</span><span class="what"><b>Signalement ' + (s.niveau === 'critique' ? 'critique' : 'forte exposition') + '</b><small>' + esc(s.it ? TYPE[s.it.type_feu] + ' · ' + s.it.numero : '') + ' · ' + esc(s.motif) + '</small></span><span class="right">' + badge(s.statut === 'ouvert' ? ['Ouvert', 'badge-late'] : ['Pris en charge', 'badge-info']) + (s.statut === 'ouvert' ? '<button class="btn btn-secondary btn-sm" type="button" data-sig="' + s.id + '|pris_en_charge">Prendre en charge</button>' : '<button class="btn btn-secondary btn-sm" type="button" data-sig="' + s.id + '|clos">Clore</button>') + '</span></li>';
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
    root.querySelectorAll('[data-sig]').forEach(function (b) { var q = b.dataset.sig.split('|'); b.onclick = function () { setSignalement(q[0], q[1], b); }; });
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
    var sigBy = {}; db.signalements.forEach(function (sg) { sigBy[sg.intervention] = sg; });
    var SIGST = { ouvert: 'ouvert', pris_en_charge: 'pris en charge', clos: 'clos' };
    var myOps = db.operations.filter(function (o) { return o.cos === db.meId; }).sort(function (a, b) { return b.dateObj - a.dateObj; });
    root.innerHTML = head("Rapports d'interventions", 'Le compte rendu de contamination et de décontamination de votre équipage, après chaque intervention. Sur une opération à plusieurs agrès, chaque CA remplit celui de son équipage.', '<div class="actions-row" style="margin:0"><button class="btn btn-secondary" type="button" id="new-op">' + icon('users') + 'Opération à plusieurs agrès</button><a class="btn btn-primary" href="#rapport/nouveau">' + icon('clip') + 'Nouveau rapport</a></div>') +
      viewOpsCos(myOps) + (myOps.length ? '<h3 class="list-title">Mes rapports</h3>' : '') +
      '<div>' + its.map(function (x) {
        var st = VBSData.reportState(x), locked = x.statut === 'controle_sssm', sig = sigBy[x.id], rap = lastRappel(x.id);
        var stateBadge = x.statut === 'brouillon' ? badge(st === 'retard' ? ['À compléter · en retard', 'badge-late'] : ['À compléter', 'badge-pending']) : badge(STATE[st]);
        return '<details class="report"' + (x.statut === 'brouillon' ? ' open' : '') + '><summary><span class="when">' + fmtDT(x.dateObj) + '</span><span class="what"><b>' + esc(TYPE[x.type_feu]) + ' · ' + esc(x.precision) + '</b><br><span class="note">' + esc(x.numero) + ' · ' + esc(x.commune) + ' · ' + x.crew.length + ' engagés</span></span><span class="right">' + (locked ? '<span class="lock">' + icon('lock') + 'Verrouillé</span> ' : '') + stateBadge + '</span></summary>' +
          '<div class="body">' + (rap && x.statut === 'brouillon' ? '<p class="note">' + icon('bell') + ' Relance le ' + fmtD(rap.createdObj) + (db.byId[rap.de] ? ' par ' + esc(db.byId[rap.de].name) : '') + '</p>' : '') + (x.op ? '<div class="chips">' + opChip(x) + '</div>' : '') + reportMeta(x) + (x.crew.length ? crewTable(x) : '<p class="empty">Équipage à renseigner.</p>') +
          '<div class="actions-row">' +
            (x.statut === 'brouillon' ? '<a class="btn btn-primary btn-sm" href="#rapport/' + x.id + '">' + icon('clip') + 'Compléter le rapport</a>' : '<a class="btn btn-secondary btn-sm" href="#rapport/' + x.id + '">Voir le rapport</a>') +
            (sig ? '<span class="badge badge-info">Signalement SSSM : ' + esc(SIGST[sig.statut]) + '</span>' : '<button class="btn btn-secondary btn-sm" type="button" data-signal="' + x.id + '">' + icon('alert') + 'Signalement SSSM</button>') +
          '</div></div></details>';
      }).join('') + '</div>';
    root.querySelectorAll('[data-signal]').forEach(function (btn) { btn.onclick = function () { openSignalement(db.inter[btn.dataset.signal]); }; });
    root.querySelector('#new-op').onclick = openNewOperation;
    bindRemind(root);
  }

  var gFilter = 'tous';
  function viewGestion(root) {
    var its = db.interventions, filters = [['tous', 'Tous'], ['retard', 'En retard'], ['attente', 'En attente'], ['transmis', 'Transmis SSSM'], ['controle', 'Validés']];
    var list = its.filter(function (x) { return gFilter === 'tous' || VBSData.reportState(x) === gFilter; });
    root.innerHTML = head('Gestion globale', 'Détail des rapports de contamination du centre par statut. Aucune donnée d\'exposition individuelle n\'est affichée.',
      '<div class="seg" role="group" aria-label="Filtrer par statut">' + filters.map(function (f) { var n = f[0] === 'tous' ? its.length : its.filter(function (x) { return VBSData.reportState(x) === f[0]; }).length; return '<button type="button" data-g="' + f[0] + '" aria-pressed="' + (gFilter === f[0]) + '">' + f[1] + ' (' + n + ')</button>'; }).join('') + '</div>') +
      '<section class="panel"><table class="dtable"><thead><tr><th>Date</th><th>N°</th><th>Intervention</th><th>CA / COS</th><th class="num">Engagés</th><th>Statut</th><th></th></tr></thead><tbody>' +
      list.map(function (x) { var s = VBSData.reportState(x);
        return '<tr><td data-l="Date">' + fmtD(x.dateObj) + '</td><td data-l="N°">' + esc(x.numero) + '</td><td data-l="Intervention">' + esc(TYPE[x.type_feu]) + (x.op ? '<br><span class="note">' + esc(x.op.numero) + ' · agrès ' + esc(engOf(x)) + '</span>' : '') + '</td><td data-l="CA / COS">' + esc(x.cosUser ? x.cosUser.name : '—') + '</td><td class="num" data-l="Engagés">' + (x.crew.length || '—') + '</td><td>' + badge(STATE[s]) + '</td><td>' + (s === 'retard' || s === 'attente' ? '<button class="btn btn-secondary btn-sm" type="button" data-remind="' + x.id + '">' + icon('send') + 'Relancer</button>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table></section>';
    root.querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { gFilter = b.dataset.g; route(); }; });
    bindRemind(root);
  }

  var sFilter = 'a_controler', sMode = 'engin';
  function viewRapportsSssm(root) {
    var sigIds = db.signalements.filter(function (sg) { return sg.statut !== 'clos'; }).map(function (sg) { return sg.intervention; });
    var F = { a_controler: function (x) { return x.statut === 'transmis'; }, signales: function (x) { return sigIds.indexOf(x.id) !== -1; }, tous: function () { return true; } };
    var list = db.interventions.filter(F[sFilter]);
    root.innerHTML = head('Rapports', 'Toutes les interventions du département. Chaque consultation et correction est journalisée.',
      '<div class="page-head" style="gap:8px"><div class="seg" role="group" aria-label="Filtre"><button type="button" data-sf="a_controler" aria-pressed="' + (sFilter === 'a_controler') + '">À contrôler</button><button type="button" data-sf="signales" aria-pressed="' + (sFilter === 'signales') + '">Signalés</button><button type="button" data-sf="tous" aria-pressed="' + (sFilter === 'tous') + '">Tous</button></div>' +
      '<div class="seg" role="group" aria-label="Affichage"><button type="button" data-sm="engin" aria-pressed="' + (sMode === 'engin') + '">Engin par engin</button><button type="button" data-sm="agents" aria-pressed="' + (sMode === 'agents') + '">Tous les agents</button></div></div>') +
      (list.length ? '<div>' + list.map(function (x) {
        return '<details class="report"><summary><span class="when">' + fmtDT(x.dateObj) + '</span><span class="what"><b>' + esc(TYPE[x.type_feu]) + ' · ' + esc(x.precision) + '</b><br><span class="note">' + esc(x.numero) + ' · ' + (x.op ? 'CA : ' : 'CA/COS : ') + esc(x.cosUser ? x.cosUser.name : '—') + ' · ' + x.crew.length + ' engagés' + (x.op ? ' · opération ' + esc(x.op.numero) + ' (COS : ' + esc(x.op.cosUser ? x.op.cosUser.name : '—') + ')' : '') + '</span></span><span class="right">' + (sigIds.indexOf(x.id) !== -1 ? badge(['Signalé', 'badge-late']) + ' ' : '') + badge(STATE[VBSData.reportState(x)]) + '</span></summary>' +
          '<div class="body">' + reportMeta(x) + crewTable(x, { byEngin: sMode === 'engin', sssm: true }) + docsHtml(x) +
          '<div class="actions-row"><a class="btn btn-secondary btn-sm" href="#rapport/' + x.id + '">Modifier</a><button class="btn btn-secondary btn-sm" type="button" data-import="' + x.id + '">' + icon('download') + (x.op ? "Importer des mesures pour l'opération" : 'Importer des mesures') + '</button><button class="btn btn-secondary btn-sm" type="button" data-prel="' + x.id + '">' + icon('flask') + 'Un prélèvement</button>' + (x.statut !== 'controle_sssm' ? '<button class="btn btn-primary btn-sm" type="button" data-validate-it="' + x.id + '">' + icon('lock') + 'Valider et verrouiller</button>' : '<span class="lock">' + icon('lock') + 'Validé' + (x.valide_le ? ' le ' + fmtD(new Date(String(x.valide_le).replace(' ', 'T'))) : '') + '</span>') + '</div></div></details>';
      }).join('') + '</div>' : '<p class="empty">Aucun rapport dans cette catégorie.</p>');
    root.querySelectorAll('[data-sf]').forEach(function (b) { b.onclick = function () { sFilter = b.dataset.sf; route(); }; });
    root.querySelectorAll('[data-sm]').forEach(function (b) { b.onclick = function () { sMode = b.dataset.sm; route(); }; });
    root.querySelectorAll('[data-prel]').forEach(function (b) { b.onclick = function () { openPrelevement(db.inter[b.dataset.prel]); }; });
    root.querySelectorAll('[data-import]').forEach(function (b) { b.onclick = function () { openImport(db.inter[b.dataset.import]); }; });
    bindDocs(root);
    root.querySelectorAll('[data-validate-it]').forEach(function (b) { b.onclick = function () { validateReport(db.inter[b.dataset.validateIt], b); }; });
  }
  async function validateReport(x, btn) {
    if (btn) btn.disabled = true;
    try {
      await VBSData.update(S, 'interventions', x.id, { statut: 'controle_sssm', valide_le: VBSData.toApiDate(new Date()), valide_par: db.meId });
      toast('Rapport ' + x.numero + ' validé et verrouillé.'); await reload();
    } catch (e) { if (btn) btn.disabled = false; toast('Validation impossible : ' + e.message); }
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
      '<section class="panel"><div class="panel-head"><h3>Historique des expositions</h3><button class="link-btn" type="button" id="plan-rdv">' + icon('cal') + 'Planifier un rendez-vous</button></div>' +
        (parts.length ? '<table class="dtable"><thead><tr><th>Date</th><th>Intervention</th><th>Rôle · engin</th><th class="num">ARI / sans ARI</th><th>Contamination</th><th>Décontamination</th><th class="num">Indice</th></tr></thead><tbody>' + parts.map(function (p) {
          return '<tr><td data-l="Date">' + fmtD(p.it.dateObj) + '</td><td data-l="Intervention">' + esc(TYPE[p.it.type_feu]) + '<br><span class="note">' + esc(p.it.numero) + '</span></td><td data-l="Rôle">' + esc(ROLE_TENU[p.role_tenu]) + (p.engin ? ' · ' + esc(p.engin) : '') + '</td><td class="num" data-l="ARI / sans ARI">' + (p.ari_min || 0) + ' / ' + (p.sans_ari_min || 0) + ' min</td><td>' + cont(p) + '</td><td>' + decon(p) + '</td><td class="num" data-l="Indice">' + p.indice + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="empty">Aucune exposition.</p>') + '</section>';
    bindCharts(root); bindSoon(root);
    root.querySelector('#plan-rdv').onclick = function () { openRdv(u); };
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

  // =================================================================== fenêtres (dialogues)
  function modal(title, body, actions, opts) {
    var dlg = document.createElement('dialog');
    dlg.className = 'modal' + (opts && opts.wide ? ' wide' : '');
    dlg.innerHTML = '<form method="dialog" class="modal-card" novalidate><div class="modal-head"><h3>' + esc(title) + '</h3><button class="icon-btn" value="cancel" aria-label="Fermer">✕</button></div><div class="modal-body">' + body + '</div><p class="field-error modal-err" hidden></p><div class="modal-foot">' +
      '<button class="btn btn-secondary" value="cancel">Annuler</button>' + actions.map(function (a, i) { return '<button class="btn ' + (a.primary ? 'btn-primary' : 'btn-secondary') + '" type="button" data-act="' + i + '">' + a.label + '</button>'; }).join('') + '</div></form>';
    document.body.appendChild(dlg);
    dlg.addEventListener('close', function () { dlg.remove(); });
    dlg.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = async function () {
        var err = dlg.querySelector('.modal-err'); err.hidden = true; b.disabled = true;
        try { var ok = await actions[+b.dataset.act].run(dlg); if (ok !== false) dlg.close(); }
        catch (e) { err.textContent = e.message; err.hidden = false; }
        finally { b.disabled = false; }
      };
    });
    dlg.showModal();
    return dlg;
  }
  function need(v, msg) { if (v === null || v === undefined || String(v).trim() === '') throw new Error(msg); return v; }
  function localInput(d) { return d.getFullYear() + '-' + d2(d.getMonth() + 1) + '-' + d2(d.getDate()) + 'T' + d2(d.getHours()) + ':' + d2(d.getMinutes()); }

  function openSignalement(x) {
    var crew = x.crew.slice().sort(function (a, b) { return ['forte', 'moyenne', 'faible', 'nulle'].indexOf(a.contamination) - ['forte', 'moyenne', 'faible', 'nulle'].indexOf(b.contamination); });
    modal('Signalement au SSSM', '<p class="note">' + esc(TYPE[x.type_feu]) + ' · ' + esc(x.numero) + ' · ' + fmtDT(x.dateObj) + '</p>' +
      '<fieldset class="fs"><legend class="label">Niveau</legend><label class="radio"><input type="radio" name="niveau" value="eleve" checked> Exposition forte</label><label class="radio"><input type="radio" name="niveau" value="critique"> Critique (prise en charge rapide)</label></fieldset>' +
      '<fieldset class="fs"><legend class="label">Agents concernés</legend>' + crew.map(function (p) { return '<label class="check"><input type="checkbox" name="agents" value="' + p.agent + '"' + (p.contamination === 'forte' ? ' checked' : '') + '> ' + esc(p.user ? p.user.name : '—') + ' ' + cont(p) + '</label>'; }).join('') + '</fieldset>' +
      '<div class="field"><label class="label" for="sig-motif">Motif</label><textarea class="textarea" id="sig-motif" rows="3" maxlength="600" placeholder="Ex. engagement prolongé en déblai sans ARI, suie visible au cou"></textarea><span class="hint">Décrivez les faits, sans diagnostic ni symptôme.</span></div>',
      [{ label: icon('send') + 'Envoyer au SSSM', primary: true, run: async function (d) {
        var agents = Array.prototype.map.call(d.querySelectorAll('[name=agents]:checked'), function (c) { return c.value; });
        if (!agents.length) throw new Error('Sélectionnez au moins un agent.');
        var motif = need(d.querySelector('#sig-motif').value, 'Indiquez le motif du signalement.');
        await VBSData.create(S, 'signalements', { intervention: x.id, agents: agents, auteur: db.meId, niveau: d.querySelector('[name=niveau]:checked').value, motif: motif.trim(), statut: 'ouvert' });
        toast('Signalement envoyé au SSSM.'); await reload();
      } }]);
  }

  var PREL_UNIT = { hbco: '%', hap_urinaire: 'µmol/mol créat.', autre: '' };
  function openPrelevement(x) {
    modal('Ajouter un prélèvement', '<p class="note">' + esc(TYPE[x.type_feu]) + ' · ' + esc(x.numero) + ' · ' + fmtDT(x.dateObj) + '</p>' +
      '<div class="field"><label class="label" for="pr-agent">Agent</label><select class="select" id="pr-agent">' + x.crew.map(function (p) { return '<option value="' + p.id + '">' + esc((p.user ? p.user.name : '—') + ' · ' + ROLE_TENU[p.role_tenu]) + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-2"><div class="field"><label class="label" for="pr-type">Type</label><select class="select" id="pr-type">' + Object.keys(PREL).map(function (k) { return '<option value="' + k + '">' + PREL[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label class="label" for="pr-date">Date</label><input class="input" id="pr-date" type="date" value="' + localInput(new Date()).slice(0, 10) + '"></div></div>' +
      '<div class="form-2"><div class="field"><label class="label" for="pr-val">Valeur</label><input class="input" id="pr-val" type="number" step="0.1" min="0" inputmode="decimal"></div>' +
      '<div class="field"><label class="label" for="pr-unit">Unité</label><input class="input" id="pr-unit" type="text" value="%"></div></div>' +
      '<div class="field"><label class="label" for="pr-com">Commentaire</label><input class="input" id="pr-com" type="text" maxlength="400"></div>',
      [{ label: 'Enregistrer', primary: true, run: async function (d) {
        var v = need(d.querySelector('#pr-val').value, 'Indiquez la valeur mesurée.');
        await VBSData.create(S, 'prelevements', { participation: d.querySelector('#pr-agent').value, type: d.querySelector('#pr-type').value, valeur: +v, unite: d.querySelector('#pr-unit').value, date: d.querySelector('#pr-date').value + ' 12:00:00', commentaire: d.querySelector('#pr-com').value, auteur: db.meId });
        toast('Prélèvement enregistré.'); await reload();
      } }]).querySelector('#pr-type').onchange = function (e) { e.target.closest('dialog').querySelector('#pr-unit').value = PREL_UNIT[e.target.value]; };
  }

  function openRdv(u) {
    var d0 = new Date(Date.now() + 7 * VBSData.DAY); d0.setHours(10, 0, 0, 0);
    modal('Planifier un rendez-vous', '<p class="note">' + esc((u.grade ? u.grade + ' ' : '') + u.name + ' · ' + u.matricule) + '</p>' +
      '<div class="field"><label class="label" for="rv-date">Date et heure</label><input class="input" id="rv-date" type="datetime-local" value="' + localInput(d0) + '"></div>' +
      '<div class="field"><label class="label" for="rv-motif">Motif</label><input class="input" id="rv-motif" type="text" maxlength="160" value="Visite de suivi des expositions"></div>' +
      '<div class="field"><label class="label" for="rv-lieu">Lieu</label><input class="input" id="rv-lieu" type="text" maxlength="120" value="SSSM · Groupement fictif Nord"></div>',
      [{ label: icon('cal') + 'Planifier', primary: true, run: async function (d) {
        var when = need(d.querySelector('#rv-date').value, 'Choisissez une date.');
        await VBSData.create(S, 'rendez_vous', { agent: u.id, date: VBSData.toApiDate(new Date(when)), motif: d.querySelector('#rv-motif').value, lieu: d.querySelector('#rv-lieu').value, statut: 'prevu' });
        toast('Rendez-vous planifié : l\'agent le voit sur son tableau de bord.'); await reload();
      } }]);
  }

  async function setSignalement(id, statut, btn) {
    btn.disabled = true;
    try { await VBSData.update(S, 'signalements', id, { statut: statut }); toast(statut === 'clos' ? 'Signalement clos.' : 'Signalement pris en charge.'); await reload(); }
    catch (e) { btn.disabled = false; toast('Mise à jour impossible : ' + e.message); }
  }

  // =================================================================== opérations (plusieurs agrès)
  function engOf(x) { var m = String(x.numero || '').match(/-([A-Z]{2,5})$/); if (m) return m[1]; var c = x.crew && x.crew[0]; return c && c.engin ? c.engin : '—'; }
  function opLabel(o) { return o.numero + ' · ' + TYPE[o.type_feu] + (o.precision ? ' · ' + o.precision : ''); }
  function opChip(x) {
    if (!x.op) return '';
    var cos = x.op.cosUser ? x.op.cosUser.name : '—';
    return '<span class="chip op-chip">' + icon('users') + esc(x.op.numero) + ' · COS : ' + esc(cos) + '</span>';
  }
  function viewOpsCos(ops) {
    if (!ops.length) return '';
    return '<section class="panel"><div class="panel-head"><h3>Opérations que vous commandez (COS)</h3><span class="note">Vous voyez si chaque CA a rempli son rapport, pas l\'exposition de ses équipages.</span></div>' +
      ops.map(function (o) {
        var reps = o.reports.slice().sort(function (a, b) { return (a.cos === db.meId ? -1 : 0) - (b.cos === db.meId ? -1 : 0); });
        var done = reps.filter(function (x) { return x.statut !== 'brouillon'; }).length;
        return '<div class="op-block"><div class="op-head"><div><b>' + esc(opLabel(o)) + '</b><small>' + fmtDT(o.dateObj) + ' · ' + esc(o.commune || '') + '</small></div>' + badge(done === reps.length ? ['Tous les rapports transmis', 'badge-ok'] : [done + ' sur ' + reps.length + ' rapports transmis', 'badge-pending']) + '</div>' +
          '<table class="dtable"><thead><tr><th>Agrès</th><th>CA</th><th>Statut</th><th></th></tr></thead><tbody>' + reps.map(function (x) {
            var st = VBSData.reportState(x), mine = x.cos === db.meId;
            var stB = x.statut === 'brouillon' ? badge(st === 'retard' ? ['Non rempli · en retard', 'badge-late'] : ['Non rempli', 'badge-pending']) : badge(STATE[st]);
            var act = mine ? '<a class="btn btn-secondary btn-sm" href="#rapport/' + x.id + '">' + (x.statut === 'brouillon' ? 'Compléter mon rapport' : 'Voir mon rapport') + '</a>' : (x.statut === 'brouillon' ? '<button class="btn btn-secondary btn-sm" type="button" data-remind="' + x.id + '">' + icon('send') + 'Relancer</button>' : '');
            return '<tr><td data-l="Agrès"><b>' + esc(engOf(x)) + '</b></td><td data-l="CA">' + esc(x.cosUser ? x.cosUser.name : '—') + (mine ? ' <span class="note">(vous)</span>' : '') + '</td><td>' + stB + '</td><td>' + act + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }).join('') + '</section>';
  }
  function openNewOperation() {
    var cas = db.users.filter(function (u) { return u.role === 'cos'; }).sort(function (a, b) { return (a.id === db.meId ? -1 : 0) - (b.id === db.meId ? -1 : 0) || a.name.localeCompare(b.name); });
    var num = 'OP-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000);
    modal('Nouvelle opération à plusieurs agrès', '<p class="note">Vous êtes COS. Un rapport est ouvert pour chaque CA engagé : chacun remplit celui de son équipage.</p>' +
      '<div class="form-2"><div class="field"><label class="label" for="op-num">N° d\'opération</label><input class="input" id="op-num" value="' + num + '" maxlength="32"></div>' +
      '<div class="field"><label class="label" for="op-date">Date et heure</label><input class="input" id="op-date" type="datetime-local" value="' + localInput(new Date()) + '"></div></div>' +
      '<div class="form-2"><div class="field"><label class="label" for="op-type">Nature / motif de départ</label><select class="select" id="op-type">' + Object.keys(TYPE).map(function (k) { return '<option value="' + k + '">' + TYPE[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label class="label" for="op-commune">Commune</label><input class="input" id="op-commune" maxlength="80"></div></div>' +
      '<div class="field"><label class="label" for="op-prec">Précision</label><input class="input" id="op-prec" maxlength="160" placeholder="Ex. entrepôt de stockage, 2 000 m²"></div>' +
      '<fieldset class="fs"><legend class="label">CA engagés et leur agrès</legend>' + cas.map(function (u, i) {
        return '<div class="ca-row"><label class="check"><input type="checkbox" name="ca" value="' + u.id + '"' + (u.id === db.meId ? ' checked disabled' : '') + '> ' + esc((u.grade ? u.grade + ' ' : '') + u.name) + (u.id === db.meId ? ' <span class="note">(vous)</span>' : '') + '</label><select class="select" data-engin="' + u.id + '" aria-label="Agrès de ' + esc(u.name) + '">' + ENGINS.map(function (e, k) { return '<option' + (k === Math.min(i, 2) ? ' selected' : '') + '>' + e + '</option>'; }).join('') + '</select></div>';
      }).join('') + '</fieldset>',
      [{ label: 'Créer l\'opération', primary: true, run: async function (d) {
        var numero = need(d.querySelector('#op-num').value, "Indiquez le numéro d'opération.").trim();
        var when = need(d.querySelector('#op-date').value, 'Indiquez la date.');
        var chosen = Array.prototype.map.call(d.querySelectorAll('[name=ca]:checked'), function (c) { return c.value; });
        if (chosen.indexOf(db.meId) === -1) chosen.unshift(db.meId);
        var engins = chosen.map(function (id) { return d.querySelector('[data-engin="' + id + '"]').value; });
        if (new Set(engins).size !== engins.length) throw new Error('Chaque CA doit avoir un agrès différent.');
        var base = { date: VBSData.toApiDate(new Date(when)), type_feu: d.querySelector('#op-type').value, precision: d.querySelector('#op-prec').value, commune: d.querySelector('#op-commune').value, centre: (db.me || {}).centre };
        var op = await VBSData.create(S, 'operations', Object.assign({ numero: numero, cos: db.meId }, base));
        var mineId = null;
        for (var i = 0; i < chosen.length; i++) {
          var r = await VBSData.create(S, 'interventions', Object.assign({}, base, { numero: numero.replace(/^OP/, 'INT') + '-' + engins[i], cos: chosen[i], operation: op.id, statut: 'brouillon', ambiance: 'feu_fumee' }));
          if (chosen[i] === db.meId) mineId = r.id;
        }
        toast('Opération créée : ' + chosen.length + ' rapport' + (chosen.length > 1 ? 's' : '') + ' ouvert' + (chosen.length > 1 ? 's' : '') + '.');
        await reload();
        if (mineId) location.hash = 'rapport/' + mineId;
      } }]);
  }

  // =================================================================== import de mesures (SSSM)
  var MEAS = { hbco: ['HbCO (CO sanguin)', '%'], hap_urinaire: ['HAP urinaires (1-OHP)', 'µmol/mol créat.'], autre: ['Autre mesure', ''] };
  function norm(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function parseCsv(text) {
    var lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) return [];
    var first = lines[0], delim = [';', '\t', ','].sort(function (a, b) { return first.split(b).length - first.split(a).length; })[0];
    return lines.map(function (l) {
      var out = [], cur = '', q = false;
      for (var i = 0; i < l.length; i++) { var c = l[i]; if (c === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (c === delim && !q) { out.push(cur); cur = ''; } else cur += c; }
      out.push(cur); return out.map(function (x) { return x.trim(); });
    });
  }
  function readRows(file) {
    var name = file.name.toLowerCase();
    if (/\.(csv|txt)$/.test(name)) return file.text().then(parseCsv);
    if (/\.xlsx$/.test(name)) {
      if (typeof window.readXlsxFile !== 'function') return Promise.reject(new Error('Lecteur Excel non chargé, réessayez dans un instant.'));
      return window.readXlsxFile(file).then(function (res) {
        // Selon la version : tableau de lignes, ou liste de feuilles { sheet, data }
        var rows = res && res.rows ? res.rows : (Array.isArray(res) && res[0] && !Array.isArray(res[0]) && res[0].data ? res[0].data : res);
        return rows.map(function (r) { return r.map(function (c) { return c instanceof Date ? d2(c.getHours()) + ':' + d2(c.getMinutes()) : (c == null ? '' : String(c)); }); });
      });
    }
    if (/\.xls$/.test(name)) return Promise.reject(new Error('Ancien format .xls : enregistrez le fichier en .xlsx ou en CSV.'));
    return Promise.resolve(null); // PDF, photo : pièce justificative seulement
  }
  function matchRows(rows, people) {
    var hi = -1, cols = {};
    for (var r = 0; r < Math.min(rows.length, 6); r++) {
      var h = rows[r].map(norm), c = {};
      h.forEach(function (x, i) {
        if (c.mat == null && /matric|^mat$|^id$/.test(x)) c.mat = i;
        else if (c.nom == null && /(^| )nom|agent|name|prenom/.test(x)) c.nom = i;
        else if (c.heure == null && /heure|time|horaire/.test(x)) c.heure = i;
        else if (c.val == null && /valeur|resultat|result|hbco|co |^co$|mesure|value|taux|ohp|hap|sp ?co/.test(x)) c.val = i;
      });
      if (c.val != null && (c.mat != null || c.nom != null)) { hi = r; cols = c; break; }
    }
    var body = hi === -1 ? rows : rows.slice(hi + 1);
    if (hi === -1) { cols = { mat: 0, val: rows[0] ? rows[0].length - 1 : 1 }; }
    var found = {}, unknown = [];
    body.forEach(function (row) {
      var mat = cols.mat != null ? String(row[cols.mat] || '').toUpperCase().replace(/\s/g, '') : '';
      var nom = cols.nom != null ? norm(row[cols.nom]) : '';
      var raw = String(row[cols.val] == null ? '' : row[cols.val]).replace(',', '.').replace(/[^\d.\-]/g, '');
      if (!raw || isNaN(parseFloat(raw))) return;
      var p = people.find(function (x) { return mat && x.user && x.user.matricule.toUpperCase() === mat; });
      if (!p && nom) {
        var hits = people.filter(function (x) { var n = norm(x.user ? x.user.name : ''); var last = n.split(' ').slice(-1)[0]; return n === nom || nom.indexOf(last) !== -1; });
        if (hits.length === 1) p = hits[0];
      }
      if (p) found[p.id] = { valeur: parseFloat(raw), heure: cols.heure != null ? String(row[cols.heure] || '').slice(0, 5) : '' };
      else unknown.push(mat || row[cols.nom] || '?');
    });
    return { found: found, unknown: unknown, read: body.length };
  }
  function openImport(x) {
    var scope = x.op ? x.op.reports : [x];
    var people = [];
    scope.forEach(function (it) { it.crew.slice().sort(function (a, b) { return (a.role_tenu === 'chef_agres' ? -1 : 0) - (b.role_tenu === 'chef_agres' ? -1 : 0); }).forEach(function (p) { people.push(p); }); });
    var title = x.op ? 'Opération ' + x.op.numero + ' · ' + scope.length + ' rapports' : 'Intervention ' + x.numero;
    var d0 = x.op ? x.op.dateObj : x.dateObj;
    var existing = function (p, type) { return (db.prelevements || []).filter(function (z) { return z.participation === p.id && z.type === type; })[0]; };
    function grid(type, found) {
      return '<table class="dtable meas"><thead><tr><th>Agent</th><th>Agrès · CA</th><th>Valeur</th><th>Heure</th></tr></thead><tbody>' + people.map(function (p) {
        var f = found && found[p.id], ex = existing(p, type);
        return '<tr' + (f ? ' class="hit"' : '') + '><td data-l="Agent"><b>' + esc(p.user ? p.user.name : '—') + '</b><br><span class="note">' + esc(p.user ? p.user.matricule : '') + '</span></td><td data-l="Agrès">' + esc(engOf(p.it)) + ' · ' + esc(p.it.cosUser ? p.it.cosUser.name : '') + '</td>' +
          '<td data-l="Valeur"><input class="input" type="number" step="0.1" min="0" inputmode="decimal" data-val="' + p.id + '" value="' + (f ? f.valeur : '') + '" aria-label="Valeur pour ' + esc(p.user ? p.user.name : '') + '">' + (ex ? '<span class="note">Déjà : ' + ex.valeur + ' ' + esc(ex.unite || '') + '</span>' : '') + '</td>' +
          '<td data-l="Heure"><input class="input" type="time" data-heure="' + p.id + '" value="' + (f && f.heure ? esc(f.heure) : '') + '"></td></tr>';
      }).join('') + '</tbody></table>';
    }
    var dlg = modal('Importer des mesures', '<p class="note">' + esc(title) + ' · ' + people.length + ' agents engagés</p>' +
      '<div class="form-3"><div class="field"><label class="label" for="im-type">Mesure</label><select class="select" id="im-type">' + Object.keys(MEAS).map(function (k) { return '<option value="' + k + '">' + MEAS[k][0] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label class="label" for="im-unit">Unité</label><input class="input" id="im-unit" value="%"></div>' +
      '<div class="field"><label class="label" for="im-date">Date du prélèvement</label><input class="input" id="im-date" type="date" value="' + localInput(d0).slice(0, 10) + '"></div></div>' +
      '<div class="dropzone"><label class="label" for="im-file">Document de résultats</label><input class="input" id="im-file" type="file" accept=".csv,.txt,.xlsx,.pdf,image/*">' +
      '<span class="hint">CSV ou Excel (.xlsx) : une ligne par agent avec le matricule (ou le nom) et la valeur, le tableau se remplit tout seul. PDF ou photo : conservé comme pièce justificative, saisissez les valeurs ci-dessous.</span>' +
      '<button type="button" class="link-btn" id="im-tpl">' + icon('download') + 'Télécharger le modèle pré-rempli (CSV)</button></div>' +
      '<p class="note" id="im-status" role="status"></p><div id="im-grid">' + grid('hbco') + '</div>',
      [{ label: 'Enregistrer les mesures', primary: true, run: async function (d) {
        var type = d.querySelector('#im-type').value, unit = d.querySelector('#im-unit').value, date = need(d.querySelector('#im-date').value, 'Indiquez la date du prélèvement.');
        var vals = people.map(function (p) { return { p: p, v: d.querySelector('[data-val="' + p.id + '"]').value, h: d.querySelector('[data-heure="' + p.id + '"]').value }; }).filter(function (z) { return z.v !== ''; });
        if (!vals.length) throw new Error('Aucune valeur saisie.');
        var file = d.querySelector('#im-file').files[0];
        var docData = { titre: MEAS[type][0] + ' · ' + (x.op ? x.op.numero : x.numero) + (file ? ' · ' + file.name : ''), type_mesure: type, nb_mesures: vals.length, auteur: db.meId };
        if (x.op) docData.operation = x.op.id; else docData.intervention = x.id;
        var doc;
        if (file) { var fd = new FormData(); Object.keys(docData).forEach(function (k) { fd.append(k, docData[k]); }); fd.append('fichier', file); doc = await VBSData.create(S, 'documents', fd); }
        else doc = await VBSData.create(S, 'documents', docData);
        for (var i = 0; i < vals.length; i++) {
          await VBSData.create(S, 'prelevements', { participation: vals[i].p.id, type: type, valeur: parseFloat(String(vals[i].v).replace(',', '.')), unite: unit, date: date + ' 12:00:00', heure: vals[i].h, document: doc.id, auteur: db.meId, commentaire: '' });
        }
        toast(vals.length + ' mesure' + (vals.length > 1 ? 's enregistrées' : ' enregistrée') + ' pour ' + (x.op ? "l'opération " + x.op.numero : 'cette intervention') + '.');
        await reload();
      } }], { wide: true });
    var status = dlg.querySelector('#im-status'), found = null;
    dlg.querySelector('#im-type').onchange = function (e) { dlg.querySelector('#im-unit').value = MEAS[e.target.value][1]; dlg.querySelector('#im-grid').innerHTML = grid(e.target.value, found); };
    dlg.querySelector('#im-tpl').onclick = function () {
      csvDownload('modele-mesures-' + (x.op ? x.op.numero : x.numero) + '.csv', [['matricule', 'nom', 'agres', 'valeur', 'heure']].concat(people.map(function (p) { return [p.user ? p.user.matricule : '', p.user ? p.user.name : '', engOf(p.it), '', '']; })));
    };
    dlg.querySelector('#im-file').onchange = async function (e) {
      var f = e.target.files[0]; if (!f) return;
      status.textContent = 'Lecture du fichier…';
      try {
        var rows = await readRows(f);
        if (!rows) { status.textContent = 'Document joint comme pièce justificative. Saisissez les valeurs dans le tableau.'; return; }
        var m = matchRows(rows, people); found = m.found;
        dlg.querySelector('#im-grid').innerHTML = grid(dlg.querySelector('#im-type').value, found);
        var n = Object.keys(found).length;
        status.innerHTML = '<b>' + n + ' agent' + (n > 1 ? 's' : '') + ' reconnu' + (n > 1 ? 's' : '') + '</b> sur ' + people.length + '. Vérifiez les valeurs avant d\'enregistrer.' + (m.unknown.length ? '<br>Lignes non reconnues : ' + esc(m.unknown.slice(0, 6).join(', ')) + (m.unknown.length > 6 ? '…' : '') : '');
      } catch (err) { status.textContent = 'Lecture impossible : ' + err.message; }
    };
  }
  function docsFor(x) {
    return (db.documents || []).filter(function (d) { return (x.op && d.operation === x.op.id) || d.intervention === x.id; });
  }
  function docsHtml(x) {
    var list = docsFor(x); if (!list.length) return '';
    return '<div class="docs"><span class="label">Documents du SSSM</span>' + list.map(function (d) {
      return '<span class="doc">' + icon('file') + esc(d.titre) + (d.nb_mesures ? ' · ' + d.nb_mesures + ' mesures' : '') + (d.fichier && !S.offline ? ' <button type="button" class="link-btn" data-dl="' + d.id + '">Télécharger</button>' : '') + '</span>';
    }).join('') + '</div>';
  }
  function bindDocs(root) {
    root.querySelectorAll('[data-dl]').forEach(function (b) {
      b.onclick = async function () {
        var d = db.documents.find(function (z) { return z.id === b.dataset.dl; });
        try { window.open(await VBS.fileUrl('documents', d.id, d.fichier), '_blank', 'noopener'); } catch (e) { toast('Téléchargement impossible : ' + e.message); }
      };
    });
  }

  // =================================================================== éditeur de rapport
  var FONCTIONS = [['commandement', 'Commandement'], ['conduite', 'Conduite'], ['attaque', 'Attaque'], ['alimentation', 'Alimentation'], ['deblai', 'Déblai'], ['nettoyage', 'Nettoyage']];
  var ENGINS = ['FPT', 'FPTL', 'EPA', 'CCF', 'VSAV', 'VL'];
  var MOTOR = { thermique: 'Thermique (essence, gazole)', gpl: 'GPL', hybride: 'Hybride', electrique: 'Électrique', lithium_ion: 'Batterie lithium-ion en emballement (HF)' };
  var AMB = { feu_fumee: 'Présence de feu et de fumée (incendie actif)', fumees_faibles: 'Fumées négligeables ou diffuses', aucun_feu: 'Aucun feu (reconnaissance, hors atmosphère toxique)' };
  var GDO = [['nulle', 'Nulle', "Aucun engagement en zone d'exclusion"], ['faible', 'Faible', 'Évolution en zone de soutien'], ['moyenne', 'Moyenne', 'Évolution en atmosphère viciée'], ['forte', 'Forte', "Évolution en milieu enfumé (zone d'exclusion)"]];
  var ed = null;

  function editorState(id) {
    if (id === 'nouveau') {
      var me = db.me || {};
      return { isNew: true, it: { operation: '', numero: 'INT-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 90000) + 10000), date: localInput(new Date()), type_feu: 'habitation', precision: '', commune: '', motorisation: '', ambiance: 'feu_fumee', zone_deshabillage: false, epi_ensaches: false, suspicion_amiante: false, exposition_globale: '', observations: '', statut: 'brouillon', centre: me.centre, cos: db.meId },
        crew: [blankMember(db.meId, 'chef_agres', 'FPT')], removed: [] };
    }
    var x = db.inter[id];
    if (!x) return null;
    if (S.role === 'cos' && x.cos !== db.meId) return null;
    var st0 = { isNew: false, id: x.id, it: { operation: x.operation || '', numero: x.numero, date: localInput(x.dateObj), type_feu: x.type_feu, precision: x.precision || '', commune: x.commune || '', motorisation: x.motorisation || '', ambiance: x.ambiance || 'feu_fumee', zone_deshabillage: !!x.zone_deshabillage, epi_ensaches: !!x.epi_ensaches, suspicion_amiante: !!x.suspicion_amiante, exposition_globale: x.exposition_globale || '', observations: x.observations || '', statut: x.statut, centre: x.centre, cos: x.cos },
      crew: x.crew.map(function (p) { return { id: p.id, agent: p.agent, role_tenu: p.role_tenu, engin: p.engin || '', fonctions: (p.fonctions || []).slice(), contamination: p.contamination || 'nulle', tenue_complete: !!p.tenue_complete, ari_porte: !!p.ari_porte || (+p.ari_min > 0), ari_min: +p.ari_min || 0, sans_ari_min: +p.sans_ari_min || 0, ffp3: !!p.ffp3, douche: !!p.douche, tenue_changee: !!p.tenue_changee, lingettes: !!p.lingettes, decon_validee: !!p.decon_validee, decon_ref: p.decon_ref || '', decon_heure: p.decon_heure || '', exposition_particuliere: p.exposition_particuliere || '', commentaire: p.commentaire || '' }; })
        .sort(function (a, b) { return (a.role_tenu === 'chef_agres' ? 0 : 1) - (b.role_tenu === 'chef_agres' ? 0 : 1); }),
      removed: [] };
    // Rapport ouvert par le COS pour ce CA : le CA est ajouté d'office comme chef d'agrès
    if (!st0.crew.length && x.cos === db.meId) st0.crew.push(blankMember(db.meId, 'chef_agres', engOf(x) !== '—' ? engOf(x) : 'FPT'));
    return st0;
  }
  function blankMember(agent, role, engin) {
    return { agent: agent, role_tenu: role || 'binome_attaque', engin: engin || 'FPT', fonctions: [], contamination: null, tenue_complete: null, ari_porte: null, ari_min: 0, sans_ari_min: 0, ffp3: null, douche: false, tenue_changee: false, lingettes: false, decon_validee: false, decon_ref: '', decon_heure: '', exposition_particuliere: '', commentaire: '' };
  }
  function edReadOnly() { return S.role === 'cos' ? ed.it.statut !== 'brouillon' : S.role !== 'sssm'; }
  function toxProfile() {
    var ref = db.referentiel.filter(function (r) { return r.type_feu === ed.it.type_feu; })[0];
    var list = ref ? ref.agents_cmr.split(',').map(function (x) { return x.trim(); }) : [];
    if (ed.it.type_feu === 'vehicule' && ed.it.motorisation === 'lithium_ion') list = list.concat(['Acide fluorhydrique (HF)', 'Lithium']);
    if (ed.it.ambiance === 'aucun_feu') list = [];
    return list;
  }
  function opt(v, cur) { return v === cur ? ' on' : ''; }
  function pairBtns(i, field, a, b) {
    var cur = ed.crew[i][field];
    return '<div class="pair" role="group"><button type="button" class="opt' + (cur === true ? ' on' : '') + '" data-set="' + i + '|' + field + '|1">' + a + '</button><button type="button" class="opt' + (cur === false ? ' on warn' : '') + '" data-set="' + i + '|' + field + '|0">' + b + '</button></div>';
  }
  function memberCard(i) {
    var m = ed.crew[i], u = db.byId[m.agent] || {}, ro = edReadOnly();
    var idx = VBSData.indice(ed.it.type_feu, m);
    return '<article class="agent-card" data-card="' + i + '"><div class="agent-top"><div><b>' + esc(u.name || '—') + '</b><small>' + esc([u.grade, u.matricule].filter(Boolean).join(' · ')) + '</small></div>' +
      (ro ? '' : '<button type="button" class="icon-btn sm" data-remove="' + i + '" aria-label="Retirer ' + esc(u.name || '') + ' de l\'équipage">✕</button>') + '</div>' +
      '<div class="form-2"><div class="field"><label class="label">Poste</label><select class="select" data-f="' + i + '|role_tenu">' + Object.keys(ROLE_TENU).map(function (k) { return '<option value="' + k + '"' + (m.role_tenu === k ? ' selected' : '') + '>' + ROLE_TENU[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label class="label">Engin</label><select class="select" data-f="' + i + '|engin">' + ENGINS.map(function (k) { return '<option' + (m.engin === k ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="block"><span class="label">Fonctions et rôles exécutés</span><div class="chips-pick">' + FONCTIONS.map(function (f) { return '<button type="button" class="opt' + (m.fonctions.indexOf(f[0]) !== -1 ? ' on' : '') + '" data-fct="' + i + '|' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="block"><span class="label">Exposition perçue (terminologie GDO)</span><div class="gdo">' + GDO.map(function (g) { return '<button type="button" class="opt gdo-' + g[0] + opt(g[0], m.contamination) + '" data-set="' + i + '|contamination|' + g[0] + '"><b>' + g[1] + '</b><small>' + g[2] + '</small></button>'; }).join('') + '</div></div>' +
      '<div class="block"><span class="label">Port des équipements de protection</span><div class="epi">' +
        '<div><small>Tenue d\'intervention</small>' + pairBtns(i, 'tenue_complete', 'Complète', 'Incomplète') + '</div>' +
        '<div><small>Protection respiratoire (ARI)</small>' + pairBtns(i, 'ari_porte', 'ARI porté', 'Sans ARI') + '</div>' +
        '<div><small>Masque FFP3 (déblai)</small>' + pairBtns(i, 'ffp3', 'Porté', 'Non porté') + '</div></div>' +
        '<div class="form-2">' + (m.ari_porte ? '<div class="field"><label class="label">Temps d\'engagement sous ARI</label><select class="select" data-f="' + i + '|ari_min">' + [15, 30, 45, 60].map(function (v) { return '<option value="' + v + '"' + (+m.ari_min === v ? ' selected' : '') + '>' + (v === 60 ? '60 min et plus' : v + ' min') + '</option>'; }).join('') + '</select></div>' : '<div></div>') +
        '<div class="field"><label class="label">Temps hors ARI, déblai compris (min)</label><input class="input" type="number" min="0" max="600" step="5" inputmode="numeric" data-f="' + i + '|sans_ari_min" value="' + (m.sans_ari_min || 0) + '"></div></div></div>' +
      '<div class="block decon-box"><div class="decon-head"><span class="label">Décontamination</span><button type="button" class="opt' + (m.decon_validee ? ' on ok' : '') + '" data-toggle="' + i + '|decon_validee">' + (m.decon_validee ? icon('check') + 'Décontamination cutanée HAP validée' : 'Décontamination cutanée HAP à valider') + '</button></div>' +
        '<div class="chips-pick">' + [['douche', 'Douche'], ['tenue_changee', 'Tenue changée'], ['lingettes', 'Lingettes']].map(function (g) { return '<button type="button" class="opt' + (m[g[0]] ? ' on' : '') + '" data-toggle="' + i + '|' + g[0] + '">' + g[1] + '</button>'; }).join('') + '</div>' +
        '<div class="form-2"><div class="field"><label class="label">Réf. de mesure</label><input class="input" type="text" maxlength="40" data-f="' + i + '|decon_ref" value="' + esc(m.decon_ref) + '" placeholder="Ex. Mesure VB124-1"></div><div class="field"><label class="label">Heure</label><input class="input" type="time" data-f="' + i + '|decon_heure" value="' + esc(m.decon_heure) + '"></div></div></div>' +
      '<div class="form-2"><div class="field"><label class="label">Exposition particulière</label><input class="input" type="text" maxlength="300" data-f="' + i + '|exposition_particuliere" value="' + esc(m.exposition_particuliere) + '"></div>' +
      '<div class="field"><label class="label">Commentaire individuel</label><input class="input" type="text" maxlength="500" data-f="' + i + '|commentaire" value="' + esc(m.commentaire) + '" placeholder="Faits uniquement, sans donnée médicale"></div></div>' +
      '<div class="agent-foot"><span>Indice d\'exposition estimé</span><b>' + idx + '</b></div></article>';
  }
  function missing(m) {
    var out = [];
    if (!m.fonctions.length) out.push('fonctions');
    if (m.contamination === null) out.push('exposition perçue');
    if (m.tenue_complete === null) out.push('tenue');
    if (m.ari_porte === null) out.push('ARI');
    return out;
  }
  function viewEditor(root, id) {
    if (!ed || (id === 'nouveau' ? !ed.isNew : ed.id !== id)) ed = editorState(id);
    if (!ed) { root.innerHTML = '<p class="empty">Rapport introuvable ou non accessible.</p>'; return; }
    var ro = edReadOnly(), x = ed.it, st = ed.isNew ? 'attente' : VBSData.reportState(Object.assign({ dateObj: new Date(x.date) }, x));
    var inCrew = ed.crew.map(function (m) { return m.agent; });
    var candidates = db.users.filter(function (u) { return (u.role === 'agent' || u.role === 'cos') && inCrew.indexOf(u.id) === -1; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var tox = toxProfile();
    root.innerHTML = '<div class="ed-wrap"><a class="back-link" href="#rapports">' + icon('back') + 'Rapports</a>' +
      head(ed.isNew ? 'Nouveau rapport de contamination' : 'Rapport ' + esc(x.numero), S.role === 'sssm' ? 'Correction par le SSSM : chaque modification est journalisée.' : 'Compte rendu de contamination et de décontamination de votre équipage.', ed.isNew ? badge(['Brouillon', 'badge-pending']) : (ro ? '<span class="lock">' + icon('lock') + 'Lecture seule</span> ' : '') + badge(x.statut === 'brouillon' ? ['Brouillon', 'badge-pending'] : STATE[st])) +
      '<fieldset class="ed-fs"' + (ro ? ' disabled' : '') + '>' +
      '<section class="panel"><div class="panel-head"><h3>Typologie du sinistre</h3>' + (!ed.isNew && db.inter[ed.id] && db.inter[ed.id].op ? opChip(db.inter[ed.id]) : '') + '</div>' +
        (ed.isNew ? '<div class="field"><label class="label" for="ed-op">Opération</label><select class="select" id="ed-op" data-it="operation" data-rerender><option value="">Intervention simple : je suis CA et COS</option>' + db.operations.filter(function (o) { return within(o.dateObj, 3); }).map(function (o) { return '<option value="' + o.id + '"' + (x.operation === o.id ? ' selected' : '') + '>' + esc(opLabel(o) + ' · COS : ' + (o.cosUser ? o.cosUser.name : '—')) + '</option>'; }).join('') + '</select><span class="hint">Sur une opération à plusieurs agrès, rattachez votre rapport : le COS verra que vous l\'avez rempli.</span></div>' : '') +
        '<div class="form-3"><div class="field"><label class="label" for="ed-num">N° d\'intervention</label><input class="input" id="ed-num" data-it="numero" value="' + esc(x.numero) + '" maxlength="32"></div>' +
        '<div class="field"><label class="label" for="ed-date">Date et heure</label><input class="input" id="ed-date" type="datetime-local" data-it="date" value="' + esc(x.date) + '"></div>' +
        '<div class="field"><label class="label" for="ed-commune">Commune</label><input class="input" id="ed-commune" data-it="commune" value="' + esc(x.commune) + '" maxlength="80"></div></div>' +
        '<div class="form-3"><div class="field"><label class="label" for="ed-type">Nature / motif de départ</label><select class="select" id="ed-type" data-it="type_feu" data-rerender>' + Object.keys(TYPE).map(function (k) { return '<option value="' + k + '"' + (x.type_feu === k ? ' selected' : '') + '>' + TYPE[k] + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label class="label" for="ed-prec">Précision</label><input class="input" id="ed-prec" data-it="precision" value="' + esc(x.precision) + '" maxlength="160" placeholder="Ex. VL en parking souterrain"></div>' +
        (x.type_feu === 'vehicule' ? '<div class="field"><label class="label" for="ed-motor">Motorisation / carburation</label><select class="select" id="ed-motor" data-it="motorisation" data-rerender><option value="">—</option>' + Object.keys(MOTOR).map(function (k) { return '<option value="' + k + '"' + (x.motorisation === k ? ' selected' : '') + '>' + MOTOR[k] + '</option>'; }).join('') + '</select></div>' : '<div></div>') + '</div>' +
        '<div class="field"><label class="label" for="ed-amb">Ambiance opérationnelle (fumées et feu)</label><select class="select" id="ed-amb" data-it="ambiance" data-rerender>' + Object.keys(AMB).map(function (k) { return '<option value="' + k + '"' + (x.ambiance === k ? ' selected' : '') + '>' + AMB[k] + '</option>'; }).join('') + '</select></div>' +
        '<div class="tox"><span class="label">Profil toxicologique (référentiel SSSM)</span><div class="chips">' + (tox.length ? tox.map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') : '<span class="note">Aucun agent CMR attendu</span>') + '</div></div>' +
        '<div class="chips-pick">' + [['zone_deshabillage', 'Zone de déshabillage mise en place'], ['epi_ensaches', 'EPI souillés ensachés'], ['suspicion_amiante', "Suspicion d'amiante"]].map(function (g) { return '<button type="button" class="opt' + (x[g[0]] ? ' on' : '') + '" data-ittoggle="' + g[0] + '">' + g[1] + '</button>'; }).join('') + '</div>' +
        '<div class="form-2 glob"><div class="field"><label class="label" for="ed-glob">Exposition particulière globale</label><input class="input" id="ed-glob" data-it="exposition_globale" value="' + esc(x.exposition_globale) + '" maxlength="300" placeholder="Ex. fumées de plastiques brûlés"></div><button type="button" class="btn btn-secondary" id="ed-apply-all">Appliquer à tout l\'équipage</button></div>' +
        '<div class="field"><label class="label" for="ed-obs">Observations</label><textarea class="textarea" id="ed-obs" data-it="observations" rows="2" maxlength="1000"></textarea></div>' +
      '</section>' +
      '<section class="panel"><div class="panel-head"><h3>Engagements et protection · ' + ed.crew.length + ' engagé' + (ed.crew.length > 1 ? 's' : '') + '</h3></div>' +
        '<div class="crew-grid" id="crew">' + ed.crew.map(function (_, i) { return memberCard(i); }).join('') + '</div>' +
        (ro ? '' : '<div class="add-member"><select class="select" id="ed-add"><option value="">Ajouter un membre d\'équipage…</option>' + candidates.map(function (u) { return '<option value="' + u.id + '">' + esc(u.name + ' · ' + (u.grade || '') + ' · ' + u.matricule) + '</option>'; }).join('') + '</select><button type="button" class="btn btn-secondary" id="ed-add-btn">Ajouter</button></div>') +
      '</section></fieldset>' +
      (ro ? '' : '<div class="action-bar"><span class="note" id="ed-status"></span>' +
        (S.role === 'cos' ? '<button type="button" class="btn btn-secondary" id="ed-save">Enregistrer le brouillon</button><button type="button" class="btn btn-primary" id="ed-send">' + icon('send') + 'Transmettre au SSSM</button>'
          : '<button type="button" class="btn btn-secondary" id="ed-save">Enregistrer les corrections</button>' + (x.statut !== 'controle_sssm' ? '<button type="button" class="btn btn-primary" id="ed-validate">' + icon('lock') + 'Enregistrer et valider</button>' : '')) + '</div>') + '</div>';
    root.querySelector('#ed-obs').value = x.observations || '';
    // Les écouteurs sont posés sur l'élément recréé à chaque rendu : pas d'accumulation.
    bindEditor(root.firstElementChild, root);
  }
  function bindEditor(root, host) {
    var redraw = function () { var y = window.scrollY; viewEditor(host, ed.isNew ? 'nouveau' : ed.id); window.scrollTo(0, y); };
    var redrawCard = function (i) { var c = root.querySelector('[data-card="' + i + '"]'); if (c) c.outerHTML = memberCard(i); };
    root.addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset.it) ed.it[t.dataset.it] = t.value;
      if (t.dataset.f) { var p = t.dataset.f.split('|'), m = ed.crew[+p[0]]; m[p[1]] = (p[1] === 'sans_ari_min' || p[1] === 'ari_min') ? (+t.value || 0) : t.value; if (p[1] === 'sans_ari_min') { var f = root.querySelector('[data-card="' + p[0] + '"] .agent-foot b'); if (f) f.textContent = VBSData.indice(ed.it.type_feu, m); } }
    });
    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.it && t.hasAttribute('data-rerender')) {
        ed.it[t.dataset.it] = t.value;
        if (t.dataset.it === 'type_feu' && t.value !== 'vehicule') ed.it.motorisation = '';
        if (t.dataset.it === 'operation' && t.value && db.ops[t.value]) { var o = db.ops[t.value]; ed.it.type_feu = o.type_feu; ed.it.commune = o.commune || ''; ed.it.precision = o.precision || ''; ed.it.date = localInput(o.dateObj); ed.it.numero = o.numero.replace(/^OP/, 'INT') + '-' + (ed.crew[0] ? ed.crew[0].engin : 'FPT'); }
        redraw();
      }
      if (t.dataset.f && t.dataset.f.split('|')[1] === 'ari_min') redrawCard(+t.dataset.f.split('|')[0]);
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.set) { var p = b.dataset.set.split('|'), m = ed.crew[+p[0]]; var v = p[2] === '1' ? true : p[2] === '0' ? false : p[2]; m[p[1]] = m[p[1]] === v && typeof v === 'boolean' ? null : v; if (p[1] === 'ari_porte') m.ari_min = m.ari_porte ? (m.ari_min || 30) : 0; redrawCard(+p[0]); }
      else if (b.dataset.toggle) { var q = b.dataset.toggle.split('|'); ed.crew[+q[0]][q[1]] = !ed.crew[+q[0]][q[1]]; if (q[1] === 'decon_validee' && ed.crew[+q[0]].decon_validee && !ed.crew[+q[0]].decon_heure) { var n = new Date(); ed.crew[+q[0]].decon_heure = d2(n.getHours()) + ':' + d2(n.getMinutes()); } redrawCard(+q[0]); }
      else if (b.dataset.fct) { var r = b.dataset.fct.split('|'), fs = ed.crew[+r[0]].fonctions, k = fs.indexOf(r[1]); if (k === -1) fs.push(r[1]); else fs.splice(k, 1); redrawCard(+r[0]); }
      else if (b.dataset.ittoggle) { ed.it[b.dataset.ittoggle] = !ed.it[b.dataset.ittoggle]; b.classList.toggle('on'); }
      else if (b.dataset.remove) { var gone = ed.crew.splice(+b.dataset.remove, 1)[0]; if (gone.id) ed.removed.push(gone.id); redraw(); }
      else if (b.id === 'ed-apply-all') { var g = ed.it.exposition_globale.trim(); if (!g) { toast("Saisissez d'abord l'exposition particulière globale."); return; } ed.crew.forEach(function (m) { m.exposition_particuliere = g; }); redraw(); toast("Exposition appliquée à tout l'équipage."); }
      else if (b.id === 'ed-add-btn') { var sel = root.querySelector('#ed-add'); if (!sel.value) return; var u = db.byId[sel.value]; ed.crew.push(blankMember(sel.value, u && u.role === 'cos' ? 'chef_agres' : 'binome_attaque', ed.crew[0] ? ed.crew[0].engin : 'FPT')); redraw(); }
      else if (b.id === 'ed-save') saveEditor(null).catch(function () {});
      else if (b.id === 'ed-send') confirmTransmit();
      else if (b.id === 'ed-validate') saveEditor('valider').catch(function () {});
    });
  }
  function confirmTransmit() {
    var probs = ed.crew.map(function (m) { var miss = missing(m); return miss.length ? (db.byId[m.agent] || {}).name + ' : ' + miss.join(', ') : null; }).filter(Boolean);
    if (!ed.crew.length) probs.push("Aucun membre d'équipage.");
    var rows = ed.crew.map(function (m) {
      var u = db.byId[m.agent] || {}, resp = m.ari_porte ? 'Voies respiratoires protégées (ARI ' + m.ari_min + ' min)' : (m.contamination === 'moyenne' || m.contamination === 'forte') ? "Risque d'inhalation élevé : engagé sans ARI" : 'Exposition respiratoire faible ou nulle';
      return '<li><b>' + esc(u.name || '—') + '</b> ' + (m.contamination ? badge(CONT[m.contamination]) : '') + '<br><span class="note">' + esc(resp) + ' · ' + (m.decon_validee ? 'Décontamination HAP validée' + (m.decon_ref ? ' [' + esc(m.decon_ref) + (m.decon_heure ? ' à ' + esc(m.decon_heure) : '') + ']' : '') : 'Décontamination HAP non validée') + (m.exposition_particuliere ? ' · ' + esc(m.exposition_particuliere) : '') + '</span></li>';
    }).join('');
    modal('Transmettre au SSSM', (probs.length ? '<div class="callout red"><div><strong>À compléter avant transmission</strong><span class="sub">' + probs.map(esc).join('<br>') + '</span></div></div>' : '<p>Une fois transmis, le rapport n\'est plus modifiable par vous. Le SSSM pourra le corriger et le valider.</p>') +
      '<p class="note">' + esc(TYPE[ed.it.type_feu]) + (ed.it.motorisation ? ' · ' + esc(MOTOR[ed.it.motorisation]) : '') + ' · ' + esc(AMB[ed.it.ambiance]) + '</p><ul class="summary-list">' + rows + '</ul>',
      probs.length ? [] : [{ label: icon('send') + 'Confirmer la transmission', primary: true, run: function () { return saveEditor('transmettre'); } }]);
  }
  async function saveEditor(action) {
    var bar = document.getElementById('ed-status'); var btns = document.querySelectorAll('.action-bar .btn'); btns.forEach(function (b) { b.disabled = true; });
    if (bar) bar.textContent = 'Enregistrement…';
    try {
      var x = ed.it;
      need(x.numero, "Indiquez le numéro d'intervention."); need(x.date, 'Indiquez la date.');
      var itData = { numero: x.numero.trim(), date: VBSData.toApiDate(new Date(x.date)), type_feu: x.type_feu, precision: x.precision, commune: x.commune, motorisation: x.type_feu === 'vehicule' ? x.motorisation : '', ambiance: x.ambiance, zone_deshabillage: x.zone_deshabillage, epi_ensaches: x.epi_ensaches, suspicion_amiante: x.suspicion_amiante, exposition_globale: x.exposition_globale, observations: x.observations };
      if (ed.isNew) { var rec = await VBSData.create(S, 'interventions', Object.assign(itData, { centre: x.centre, cos: db.meId, statut: 'brouillon' }, x.operation ? { operation: x.operation } : {})); ed.id = rec.id; ed.isNew = false; }
      else await VBSData.update(S, 'interventions', ed.id, itData);
      for (var r = 0; r < ed.removed.length; r++) await VBSData.remove(S, 'participations', ed.removed[r]);
      ed.removed = [];
      for (var i = 0; i < ed.crew.length; i++) {
        var m = ed.crew[i];
        var pd = { intervention: ed.id, agent: m.agent, role_tenu: m.role_tenu, engin: m.engin, fonctions: m.fonctions, contamination: m.contamination || 'nulle', tenue_complete: !!m.tenue_complete, ari_porte: !!m.ari_porte, ari_min: m.ari_porte ? +m.ari_min : 0, sans_ari_min: +m.sans_ari_min || 0, ffp3: !!m.ffp3, douche: m.douche, tenue_changee: m.tenue_changee, lingettes: m.lingettes, decon_validee: m.decon_validee, decon_ref: m.decon_ref, decon_heure: m.decon_heure, exposition_particuliere: m.exposition_particuliere, commentaire: m.commentaire, indice: VBSData.indice(x.type_feu, m) };
        if (S.role === 'sssm') pd.modifie_par = db.meId;
        if (m.id) await VBSData.update(S, 'participations', m.id, pd);
        else { var pr = await VBSData.create(S, 'participations', pd); m.id = pr.id; }
      }
      if (action === 'transmettre') await VBSData.update(S, 'interventions', ed.id, { statut: 'transmis', transmis_le: VBSData.toApiDate(new Date()) });
      if (action === 'valider') await VBSData.update(S, 'interventions', ed.id, { statut: 'controle_sssm', valide_le: VBSData.toApiDate(new Date()), valide_par: db.meId });
      var done = action === 'transmettre' ? 'Rapport transmis au SSSM.' : action === 'valider' ? 'Rapport corrigé, validé et verrouillé.' : 'Enregistré.';
      ed = null; await reload();
      toast(done);
      if (action) location.hash = 'rapports'; else { location.hash = 'rapport/' + (rec ? rec.id : location.hash.split('/')[1]); }
    } catch (e) {
      if (bar) bar.textContent = ''; btns.forEach(function (b) { b.disabled = false; });
      toast('Enregistrement impossible : ' + e.message);
      throw e;
    }
  }

  async function reload() {
    try { db = await VBSData.load(S); counts(); route(); }
    catch (e) { toast('Rechargement impossible : ' + e.message); }
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
    var hash = location.hash.slice(1) || 'tableau-de-bord';
    var parts = hash.split('/'), id = parts[0];
    var isEditor = id === 'rapport' && parts[1] && (S.role === 'cos' || S.role === 'sssm');
    var m = MENU.find(function (x) { return x.id === (isEditor ? 'rapports' : id); }) || MENU[0];
    nav.querySelectorAll('.nav-item').forEach(function (a) { a.setAttribute('aria-current', a.dataset.id === m.id ? 'page' : 'false'); });
    $('page-title').textContent = isEditor ? 'Rapport de contamination' : m.label;
    document.title = (isEditor ? 'Rapport de contamination' : m.label) + ' · Carnet Expo CMR';
    if (!db) return;
    var view = $('view');
    if (isEditor) { if (parts[1] === 'nouveau' && S.role !== 'cos') { location.hash = 'rapports'; return; } viewEditor(view, parts[1]); return; }
    ed = null;
    renderInto(m.id, view);
  }
  window.addEventListener('hashchange', function () { route(); $('view').focus({ preventScroll: true }); window.scrollTo(0, 0); });

  function counts() {
    var c = {};
    if (S.role === 'cos') c.rapports = db.interventions.filter(function (x) { return x.cos === db.meId && x.statut === 'brouillon'; }).length;
    if (S.role === 'commandement') c.gestion = db.interventions.filter(function (x) { return VBSData.reportState(x) === 'retard'; }).length;
    if (S.role === 'sssm') { c.rapports = db.interventions.filter(function (x) { return x.statut === 'transmis'; }).length; c.referentiel = db.referentiel.filter(function (r) { return r.statut === 'suggestion_ia'; }).length; c.reglementation = db.reglementation.filter(function (r) { return r.impact === 'action_requise'; }).length; }
    nav.querySelectorAll('[data-count]').forEach(function (el) { el.hidden = true; });
    Object.keys(c).forEach(function (k) { var el = nav.querySelector('[data-count="' + k + '"]'); if (el && c[k]) { el.textContent = c[k]; el.hidden = false; } });
    var alerts = S.role === 'sssm' ? db.signalements.filter(function (s) { return s.statut === 'ouvert'; }).length + (c.reglementation || 0)
      : S.role === 'cos' ? (c.rapports || 0) + myRappels().length : S.role === 'commandement' ? c.gestion : (nextRdv(db, db.meId) && (nextRdv(db, db.meId).dateObj - Date.now()) < 14 * VBSData.DAY ? 1 : 0);
    var bell = $('bell'), dot = bell.querySelector('.dot'); if (dot) dot.remove();
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
    tourDone(); $('tour').hidden = true; document.body.classList.remove('touring'); $('tour-preview').innerHTML = '';
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
