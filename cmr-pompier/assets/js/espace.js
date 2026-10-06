// Espace connecté : menu par rôle, visite guidée, tableaux de bord et vues.
(function () {
  var S = VBS.requireRole(['agent', 'cos', 'commandement', 'sssm', 'habillement']);
  if (!S) return;
  // L'indicateur d'exposition (équivalents-feu) n'est affiché qu'au médecin du SSSM
  var DOC = S.role === 'sssm';

  // =================================================================== libellés
  var ROLE_LABEL = { agent: 'Agent', cos: 'CA / COS', commandement: 'Chef CI / commandement', sssm: 'SSSM', habillement: 'Référent EPI' };
  var R = VBSRef;
  var TYPE = { habitation: "Feu d'habitation, de structure", industriel: 'Feu industriel ou entrepôt', clos: 'Feu en volume clos (cave, sous-sol, parking)', vehicule: 'Feu de véhicule', cheminee: 'Feu de cheminée', vegetation: 'Feu de végétation', conteneur: 'Feu de conteneur, de poubelle', chimique: 'Matières dangereuses, chimique', autre: 'Autre intervention avec fumées' };
  var ROLE_TENU = { chef_agres: "Chef d'agrès", binome_attaque: "Binôme d'attaque", binome_alimentation: "Binôme d'alimentation", conducteur: 'Conducteur', soutien: 'Soutien', autre: 'Autre' };
  var CONT = { nulle: ['Zone de soutien', 'badge-neutral'], faible: ['Zone de soutien', 'badge-neutral'], moyenne: ['Zone contrôlée', 'badge-mod'], forte: ["Zone d'exclusion", 'badge-high'] };
  var TENUE = { veste: 'Veste de feu', surpantalon: 'Pantalon de feu', cagoule: 'Cagoule' };
  var TST = { en_service: ['En service', 'badge-ok'], contaminee: ['Contaminée', 'badge-late'], au_lavage: ['Au lavage', 'badge-info'], en_stock: ['En stock', 'badge-neutral'], reformee: ['Réformée', 'badge-neutral'] };
  var DST = { envoyee: ['À traiter', 'badge-pending'], traitee: ['Traitée', 'badge-ok'], annulee: ['Annulée', 'badge-neutral'] };
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
    regl: { id: 'reglementation', label: 'Suivi réglementation', icon: 'scale' },
    tdbHab: { id: 'tableau-de-bord', label: 'Tableau de bord', icon: 'home' },
    tenues: { id: 'tenues', label: 'Tenues de feu', icon: 'list' },
    changements: { id: 'changements', label: 'Changements de tenue', icon: 'send' }
  };
  function item(base, tour) { return Object.assign({}, base, { tour: tour }); }
  var MENUS = {
    agent: [
      item(M.tdb, "Vos dernières interventions, vos compteurs et votre prochain rendez-vous au SSSM."),
      item(M.dossier, "L'historique complet de vos expositions, intervention par intervention, votre fiche individuelle d'exposition et vos rendez-vous SSSM."),
      item(M.exp, 'Exportez vos propres données en PDF ou CSV, pour votre médecin ou vos archives.')
    ],
    cos: [
      item(M.tdb, "Vos expositions récentes, votre prochain rendez-vous SSSM et les rapports qu'il vous reste à compléter."),
      item(M.dossier, "L'historique complet de vos propres expositions et vos rendez-vous SSSM."),
      item(M.rapportsCos, "Rédigez le rapport de contamination de votre équipage après chaque intervention : trois appuis suffisent, le reste est proposé d'office. Sur une opération à plusieurs agrès, chaque CA remplit le sien."),
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
      item(M.suivi, "Le dossier de chaque agent et sa fiche individuelle d'exposition, par année, sur 12 mois glissants ou sur toute la carrière."),
      item(M.exp, 'Tous les exports : interventions, expositions, référentiel.'),
      item(Object.assign({}, M.ref, { label: 'Référentiel CMR' }), "Pour chaque motif de départ, validez ou modifiez le coefficient, les agents CMR retenus et les circonstances proposées au chef d'agrès."),
      item(M.regl, 'Les évolutions réglementaires qui concernent le suivi des expositions, avec leur niveau d\'impact.')
    ],
    habillement: [
      item(M.tdbHab, 'Les agents dont la tenue est à changer après une intervention sur feu, les tenues à laver et les alertes de seuil.'),
      item(M.changements, "Vous enregistrez chaque changement de tenue : l'ancienne part au lavage, la nouvelle est attribuée à l'agent. Les remplacements au seuil d'alerte arrivent ici aussi."),
      item(M.tenues, 'Toutes les tenues du centre : numéro, agent, état, nombre de feux et de lavages. Vous pouvez modifier les numéros et attribuer une tenue.'),
      item(M.exp, 'Export de l\'état des tenues du centre.')
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
  function filled(p) { return !!p.position || !!(p.it && p.it.statut !== 'brouillon'); }
  function cont(p) { if (!filled(p)) return badge(['Rapport en cours', 'badge-pending']); return badge(CONT[p.contamination] || ['—', 'badge-neutral']); }
  function decon(p) {
    if (!filled(p)) return '<span class="note">—</span>';
    var dcx = R.DEC[p.decon_type];
    if (dcx) return badge([dcx.court, p.decon_type === 'DEC_AUCUNE' ? 'badge-late' : 'badge-ok']) + (p.decon_type === 'DEC_AUCUNE' ? '' : confOk(p) ? '<br><span class="conf-tag ok">Validée par mesure · ' + esc(p.decon_heure) + '</span>' : DOC ? '<br><span class="conf-tag">Non confirmée par mesure</span>' : '');
    return p.decon_validee ? '<span class="badge badge-ok">Décon. validée</span>' : '<span class="badge badge-pending">Décon. à valider</span>';
  }
  function confOk(p) { return !!(p.decon_ref && p.decon_heure) && p.decon_type !== 'DEC_AUCUNE'; }
  function efTxt(p) { return filled(p) ? R.fmt(p.indice) : '—'; }
  function durTxt(m) { m = +m || 0; if (!m) return '—'; var h = Math.floor(m / 60), mm = m % 60; return h ? h + ' h' + (mm ? ' ' + d2(mm) : '') : mm + ' min'; }
  function posTxt(p) { return p.position ? R.posLabel(p.position) + (p.position === 'POS_ATT' && p.tactique === 'TAC_TRANS' ? ' (attaque transitoire)' : '') : ROLE_TENU[p.role_tenu] || '—'; }
  function ariTxt(p) { return p.ari_porte || +p.ari_min > 0 ? 'ARI porté' : 'Sans ARI'; }
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
      out.push({ label: MONTHS[m.getMonth()], full: MONTHS[m.getMonth()] + ' ' + m.getFullYear(), value: avg ? (inM.length ? Math.round(v / inM.length * 100) / 100 : 0) : Math.round(v * 100) / 100, n: inM.length });
    }
    return out;
  }

  // Courbe simple (une seule série, pas de légende) avec info-bulle au survol
  function lineChart(pts, unit) {
    var W = 560, H = 220, L = 36, R = 12, T = 12, B = 28;
    var max = Math.max(0.5, Math.max.apply(null, pts.map(function (p) { return p.value; })));
    var rawStep = max / 4, mag = Math.pow(10, Math.floor(Math.log10(rawStep))), nr = rawStep / mag;
    var step = (nr <= 1 ? 1 : nr <= 2 ? 2 : nr <= 5 ? 5 : 10) * mag, top = Math.ceil(max / step - 1e-9) * step;
    var nf = function (v) { return (Math.round(v * 100) / 100).toLocaleString('fr-FR'); };
    var x = function (i) { return L + i * (W - L - R) / (pts.length - 1); }, y = function (v) { return T + (H - T - B) * (1 - v / top); };
    var grid = '', ticks = Math.round(top / step);
    for (var g = 0; g <= ticks; g++) { var gv = g * step; grid += '<line class="grid-line" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(gv) + '" y2="' + y(gv) + '"/><text class="axis" x="' + (L - 6) + '" y="' + (y(gv) + 4) + '" text-anchor="end">' + nf(gv) + '</text>'; }
    var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.value).toFixed(1); }).join(' ');
    var area = path + ' L' + x(pts.length - 1) + ' ' + y(0) + ' L' + x(0) + ' ' + y(0) + ' Z';
    var labels = pts.map(function (p, i) { return (i % 2 === (pts.length - 1) % 2) ? '<text class="axis" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + p.label + '</text>' : ''; }).join('');
    var slot = (W - L - R) / (pts.length - 1);
    var hits = pts.map(function (p, i) { return '<rect class="hit" x="' + (x(i) - slot / 2) + '" y="' + T + '" width="' + slot + '" height="' + (H - T - B) + '" data-tip="' + esc(p.full + ' : ' + nf(p.value) + (unit || '')) + '" data-x="' + x(i) + '" data-y="' + y(p.value) + '"/><circle class="pt" cx="' + x(i) + '" cy="' + y(p.value) + '" r="4"/>'; }).join('');
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
      return '<li><span class="when">' + fmtD(p.it.dateObj) + '</span><span class="what"><b>' + esc(TYPE[p.it.type_feu]) + '</b><small>' + esc(p.it.precision || '') + ' · ' + esc(p.it.commune || '') + '</small></span><span class="right">' + cont(p) + (DOC && filled(p) && p.it.ambiance !== 'aucun_feu' ? '<span class="ef-mini">' + R.fmt(p.indice) + ' EF</span>' : '') + '</span></li>';
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

  function counters(parts) {
    var f = parts.filter(function (p) { return filled(p) && p.it && p.it.ambiance !== 'aucun_feu'; });
    return { feux: f.length, att: f.filter(function (p) { return p.position === 'POS_ATT' || p.position === 'VEG_LISIERE'; }).length, heures: sum(f, function (p) { return +p.duree_min || 0; }) / 60,
      decOk: f.filter(function (p) { return p.decon_type ? p.decon_type !== 'DEC_AUCUNE' : p.decon_validee; }).length, decNon: f.filter(function (p) { return p.decon_type === 'DEC_AUCUNE'; }).length,
      dec1h: f.filter(function (p) { return /LING_DOUCHE|LING_1H/.test(p.decon_type || ''); }).length, ariRet: f.filter(function (p) { return p.ari_retire_deb; }).length, ef: Math.round(sum(f, function (p) { return +p.indice || 0; }) * 100) / 100 };
  }
  function countersPanel(c, title) {
    var f = function (v, l) { return '<div class="fact"><b>' + v + '</b><span>' + l + '</span></div>'; };
    return '<section class="panel"><div class="panel-head"><h3>' + title + '</h3></div><div class="facts">' +
      f(c.feux, 'interventions avec fumées') + f(c.att, 'en position d\'attaque') + f(String(Math.round(c.heures * 10) / 10).replace('.', ','), 'heures de feu') +
      f(c.dec1h, 'décontaminations dans l\'heure') + f(c.decNon, 'sans décontamination') + f(c.ariRet, 'ARI retiré au déblai') + '</div>' +
      '</section>';
  }
  function viewDashPerso(root, extra) {
    var mine = db.mine, now = new Date();
    var thisM = mine.filter(function (p) { return p.it.dateObj.getMonth() === now.getMonth() && p.it.dateObj.getFullYear() === now.getFullYear(); }).length;
    var prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var prevM = mine.filter(function (p) { return p.it.dateObj.getMonth() === prev.getMonth() && p.it.dateObj.getFullYear() === prev.getFullYear(); }).length;
    var c = counters(mine.filter(function (p) { return within(p.it.dateObj, 365); }));
    var diff = thisM - prevM, k3;
    if (S.role === 'cos') {
      var pend = db.interventions.filter(function (x) { return x.cos === db.meId && x.statut === 'brouillon'; });
      var late = pend.filter(function (x) { return VBSData.reportState(x) === 'retard'; }).length;
      k3 = kpi('file', '', 'Rapports à compléter', pend.length, late ? '<span class="badge badge-late">' + late + ' en retard</span>' : 'À jour');
    } else {
      k3 = kpi('shield', 'ok', 'Décontaminations réalisées', (c.feux ? Math.round(100 * c.decOk / c.feux) : 0) + ' %', c.dec1h + ' dans l\'heure, sur ' + c.feux + ' interventions (12 mois)');
    }
    var html = head('Bonjour ' + esc(S.name || '') + ',', 'Voici le résumé de vos expositions et de vos dernières interventions.', '<span class="page-date">' + esc(fmtLong(now)) + '</span>') +
      '<div class="grid grid-3">' +
        kpi('flame', '', 'Interventions ce mois-ci', thisM, (diff >= 0 ? '+' : '') + diff + ' par rapport au mois dernier') +
        kpi('clock', 'warn', 'Heures de feu · 12 mois glissants', String(Math.round(c.heures * 10) / 10).replace('.', ',') + ' <small class="unit">h</small>', c.feux + ' interventions avec fumées, dont ' + c.att + ' en attaque') +
        k3 +
      '</div>' +
      '<div class="grid grid-main">' +
        '<section class="panel"><div class="panel-head"><h3>Interventions avec fumées, par mois</h3></div>' + lineChart(monthly(mine.filter(function (p) { return filled(p) && p.it.ambiance !== 'aucun_feu'; }), function (p) { return p.it.dateObj; }, function () { return 1; }), ' intervention(s)') + '</section>' +
        '<section class="panel"><div class="panel-head"><h3>Dernières interventions</h3><a href="#dossier">Voir tout ' + icon('arrow') + '</a></div>' + interventionRows(mine, 5) + '</section>' +
      '</div>' + countersPanel(c, 'Vos compteurs · 12 mois glissants') +
      '<div class="grid grid-2">' + rdvCallout(nextRdv(db, db.meId)) + (extra || '<div class="callout"><span class="icon-tile">' + icon('download') + '</span><div><strong>Fiche individuelle d\'exposition</strong><span class="sub">Par année, sur 12 mois glissants ou sur toute votre carrière.</span></div><a class="btn btn-secondary btn-sm" href="#dossier">Ouvrir</a></div>') + '</div>';
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
    var fortes = P.filter(function (p) { return p.it && filled(p) && ((p.contamination === 'forte' && p.decon_type === 'DEC_AUCUNE') || (p.position === 'POS_ATT' && !p.ari_porte)); });
    var last24 = its.filter(function (x) { return within(x.dateObj, 1); });
    var recent = last24.length ? last24 : its.filter(function (x) { return within(x.dateObj, 3); });
    var m30 = P.filter(function (p) { return p.it && filled(p) && within(p.it.dateObj, 30); }), m60 = P.filter(function (p) { return p.it && filled(p) && within(p.it.dateObj, 60) && !within(p.it.dateObj, 30); });
    var avg30 = m30.length ? sum(m30, function (p) { return +p.indice || 0; }) / m30.length : 0, avg60 = m60.length ? sum(m60, function (p) { return +p.indice || 0; }) / m60.length : 0;
    var trend = Math.round((avg30 - avg60) * 100) / 100;
    var dist = { nulle: 0, moyenne: 0, forte: 0 }; m30.forEach(function (p) { dist[p.contamination === 'faible' ? 'nulle' : p.contamination]++; });
    var colors = { nulle: '#C9C2B8', moyenne: 'var(--warn)', forte: 'var(--danger)' };
    var stack = '<div class="stack" role="img" aria-label="Répartition des contaminations sur 30 jours">' + Object.keys(dist).filter(function (k) { return dist[k]; }).map(function (k) { return '<i style="flex:' + dist[k] + ';background:' + colors[k] + '" title="' + CONT[k][0] + ' : ' + dist[k] + '"></i>'; }).join('') + '</div>' +
      '<div class="legend">' + Object.keys(dist).map(function (k) { return '<span><i style="background:' + colors[k] + '"></i>' + CONT[k][0] + ' · <b>' + dist[k] + '</b></span>'; }).join('') + '</div>';
    // Agents les plus exposés : cumul sur 12 mois glissants, affiché en relatif (jamais de seuil absolu)
    var byAgent = {};
    P.forEach(function (p) { if (p.it && filled(p) && within(p.it.dateObj, 365)) { byAgent[p.agent] = (byAgent[p.agent] || 0) + (+p.indice || 0); } });
    var ranked = Object.keys(byAgent).sort(function (a, b) { return byAgent[b] - byAgent[a]; }), top = ranked.slice(0, 5), top10 = Math.max(1, Math.ceil(ranked.length * 0.1));
    var alerts = openSig.map(function (s) {
      return '<li><span class="when">' + (s.it ? fmtD(s.it.dateObj) : '') + '</span><span class="what"><b>' + esc(sigTitle(s)) + '</b><small>' + esc(s.it ? TYPE[s.it.type_feu] + ' · ' + s.it.numero : '') + '</small></span><span class="right">' + badge(s.statut === 'ouvert' ? ['Ouvert', 'badge-late'] : ['Pris en charge', 'badge-info']) + (s.statut === 'ouvert' ? '<button class="btn btn-secondary btn-sm" type="button" data-sig="' + s.id + '|pris_en_charge">Prendre en charge</button>' : '<button class="btn btn-secondary btn-sm" type="button" data-sig="' + s.id + '|clos">Clore</button>') + '</span></li>';
    }).concat(fortes.slice(0, 4).map(function (p) {
      return '<li><span class="when">' + fmtD(p.it.dateObj) + '</span><span class="what"><b>' + esc(p.user ? p.user.name : 'Agent') + (p.position === 'POS_ATT' && !p.ari_porte ? ' · attaque sans ARI' : ' · zone d\'exclusion sans décontamination') + '</b><small>' + esc(TYPE[p.it.type_feu]) + ' · ' + esc(p.it.numero) + '</small></span><span class="right">' + badge(['À vérifier', 'badge-pending']) + '</span></li>';
    }));
    root.innerHTML = head('Tableau de bord SSSM', 'État des dossiers, cas particuliers et tendance des expositions.', '<span class="page-date">' + esc(fmtLong(new Date())) + '</span>') +
      '<div class="grid grid-4">' +
        kpi('check', 'ok', 'Dossiers à jour', upToDate + ' %', toCheck + ' rapport' + (toCheck > 1 ? 's' : '') + ' à contrôler') +
        kpi('alert', '', 'Alertes cas particuliers', openSig.length + fortes.length, openSig.length + ' signalement' + (openSig.length > 1 ? 's' : '') + ' · ' + fortes.length + ' écart' + (fortes.length > 1 ? 's' : '') + ' au protocole') +
        kpi('flame', 'warn', 'Feux des dernières 24 h', last24.length, last24.length ? sum(last24, function (x) { return x.crew.length; }) + ' agents engagés' : 'Aucun feu sur 24 h') +
        kpi('chart', 'info', 'Indicateur moyen par engagement (30 j)', R.fmt(avg30) + ' <small class="unit">EF</small>', (trend > 0 ? '▲ +' : trend < 0 ? '▼ ' : '= ') + R.fmt(trend) + ' par rapport aux 30 jours précédents') +
      '</div>' +
      '<div class="grid grid-main">' +
        '<section class="panel"><div class="panel-head"><h3>Tendance : indicateur moyen par agent engagé</h3></div>' + lineChart(monthly(P.filter(function (p) { return p.it && filled(p); }), function (p) { return p.it.dateObj; }, function (p) { return +p.indice || 0; }, true), ' EF') + '<p class="note">En équivalents-feu, référentiel v' + R.version + '.</p></section>' +
        '<section class="panel"><div class="panel-head"><h3>Alertes</h3><a href="#rapports">Rapports ' + icon('arrow') + '</a></div>' + (alerts.length ? '<ul class="rows">' + alerts.join('') + '</ul>' : '<p class="empty">Aucune alerte.</p>') + '</section>' +
      '</div>' +
      '<div class="grid grid-2">' +
        '<section class="panel"><div class="panel-head"><h3>' + (last24.length ? 'Feux des dernières 24 h' : 'Aucun feu sur 24 h · 72 dernières heures') + '</h3></div>' +
          (recent.length ? '<ul class="rows">' + recent.map(function (x) { var worst = x.crew.filter(filled).map(function (p) { return p.contamination; }).sort(function (a, b) { return ['nulle', 'faible', 'moyenne', 'forte'].indexOf(b) - ['nulle', 'faible', 'moyenne', 'forte'].indexOf(a); })[0]; return '<li><span class="when">' + fmtDT(x.dateObj).split(' · ')[1] + '</span><span class="what"><b>' + esc(TYPE[x.type_feu]) + '</b><small>' + esc(x.commune) + ' · ' + x.crew.length + ' agents</small></span><span class="right">' + (worst ? badge(CONT[worst]) : '') + '</span></li>'; }).join('') + '</ul>' : '<p class="empty">Aucune intervention récente.</p>') + '</section>' +
        '<section class="panel"><div class="panel-head"><h3>Zones d\'engagement des agents (30 j)</h3></div>' + stack + '<p class="note">' + m30.length + ' engagements enregistrés sur 30 jours.</p></section>' +
      '</div>' +
      '<section class="panel"><div class="panel-head"><h3>Agents les plus exposés (12 mois glissants)</h3><a href="#suivi">Suivi individuel ' + icon('arrow') + '</a></div>' +
        '<table class="dtable"><thead><tr><th>Agent</th><th>Matricule</th><th class="num">Indicateur 12 mois</th><th>Position relative</th><th>Dernier rendez-vous</th></tr></thead><tbody>' +
        top.map(function (id, k) { var u = db.byId[id] || {}; var lastR = db.rdv.filter(function (r) { return r.agent === id && r.statut === 'realise'; }).sort(function (a, b) { return b.dateObj - a.dateObj; })[0];
          return '<tr><td data-l="Agent"><b>' + esc(u.name) + '</b></td><td data-l="Matricule">' + esc(u.matricule) + '</td><td class="num" data-l="Indicateur">' + R.fmt(byAgent[id]) + ' EF</td><td data-l="Position">' + (k < top10 ? badge(['Parmi les 10 % les plus exposés', 'badge-mod']) : '<span class="note">' + (k + 1) + '<sup>e</sup> sur ' + ranked.length + '</span>') + '</td><td data-l="Dernier RDV">' + (lastR ? fmtD(lastR.dateObj) : '—') + '</td></tr>'; }).join('') +
        '</tbody></table><p class="note">Aucun seuil absolu : l\'indicateur se lit en comparaison avec les autres agents. ' + esc(R.MENTION) + '</p></section>';
    bindCharts(root);
    root.querySelectorAll('[data-sig]').forEach(function (b) { var q = b.dataset.sig.split('|'); b.onclick = function () { setSignalement(q[0], q[1], b); }; });
  }

  // ---------- Fiche individuelle d'exposition (nature, durée, degré) ----------
  var PER = { mode: '12m', year: new Date().getFullYear() };
  function inPeriod(p) { return PER.mode === 'carriere' ? true : PER.mode === 'annee' ? p.it.dateObj.getFullYear() === PER.year : within(p.it.dateObj, 365); }
  function periodLabel() { return PER.mode === 'carriere' ? 'Toute la carrière au SDIS' : PER.mode === 'annee' ? 'Année ' + PER.year : '12 mois glissants (au ' + fmtD(new Date()) + ')'; }
  function periodBar(parts) {
    var years = []; parts.forEach(function (p) { var y = p.it.dateObj.getFullYear(); if (years.indexOf(y) === -1) years.push(y); }); years.sort(function (a, b) { return b - a; });
    if (!years.length) years = [new Date().getFullYear()];
    return '<div class="period"><div class="seg" role="group" aria-label="Période"><button type="button" data-per="12m" aria-pressed="' + (PER.mode === '12m') + '">12 mois glissants</button><button type="button" data-per="annee" aria-pressed="' + (PER.mode === 'annee') + '">Année</button><button type="button" data-per="carriere" aria-pressed="' + (PER.mode === 'carriere') + '">Carrière</button></div>' +
      (PER.mode === 'annee' ? '<select class="select sel-sm" id="per-year" aria-label="Année">' + years.map(function (y) { return '<option' + (y === PER.year ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select>' : '') +
      '<button type="button" class="btn btn-primary btn-sm" data-fiche>' + icon('download') + 'Fiche d\'exposition (PDF)</button></div>';
  }
  function bindPeriod(root, parts, u) {
    root.querySelectorAll('[data-per]').forEach(function (b) { b.onclick = function () { PER.mode = b.dataset.per; if (PER.mode === 'annee' && !parts.some(function (p) { return p.it.dateObj.getFullYear() === PER.year; }) && parts[0]) PER.year = parts[0].it.dateObj.getFullYear(); route(); }; });
    var ys = root.querySelector('#per-year'); if (ys) ys.onchange = function () { PER.year = +ys.value; route(); };
    root.querySelectorAll('[data-fiche]').forEach(function (b) { b.onclick = function () { printFiche(u, parts); }; });
  }
  function historyTable(parts, empty) {
    if (!parts.length) return '<p class="empty">' + (empty || 'Aucune intervention sur cette période.') + '</p>';
    return '<table class="dtable"><thead><tr><th>Date</th><th>Intervention</th><th>Nature (agents CMR)</th><th>Position · poste</th><th>Zone</th><th>Durée</th><th>Décontamination</th>' + (DOC ? '<th class="num">Indicateur</th>' : '') + '</tr></thead><tbody>' +
      parts.map(function (p) { var f = filled(p);
        return '<tr><td data-l="Date">' + fmtD(p.it.dateObj) + '</td><td data-l="Intervention"><b>' + esc(TYPE[p.it.type_feu] || p.it.type_feu) + '</b><br><span class="note">' + esc(p.it.numero) + '</span></td>' +
          '<td data-l="Nature" class="nat">' + (f ? natureCourte(p.it) : '<span class="note">Rapport en cours</span>') + '</td>' +
          '<td data-l="Position">' + (f ? esc(posTxt(p)) : esc(ROLE_TENU[p.role_tenu] || '')) + '<br><span class="note">' + esc(ROLE_TENU[p.role_tenu] || '') + (p.engin ? ' · ' + esc(p.engin) : '') + '</span></td>' +
          '<td data-l="Zone">' + cont(p) + '</td><td data-l="Durée">' + (f ? durTxt(p.duree_min) : '—') + (p.ari_retire_deb ? '<br><span class="note">ARI retiré au déblai</span>' : '') + '</td><td data-l="Décontamination">' + decon(p) + '</td>' + (DOC ? '<td class="num" data-l="Indicateur">' + efTxt(p) + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table>';
  }
  function natureCourte(it) {
    var n = R.nature(it); if (!n.procedes.length) return 'Aucun (pas de fumée)';
    return '<span title="' + esc(R.natureTexte(it)) + '">' + n.procedes.map(function (k) { return esc(R.PROCEDES[k].court); }).join(', ') + ' + ' + n.substances.length + ' substances' + (n.circ.length ? '<br><b>' + n.circ.map(function (k) { return esc(R.CIRC[k].nom); }).join(', ') + '</b>' : '') + '</span>';
  }
  function printFiche(u, allParts) {
    var parts = allParts.filter(inPeriod).filter(filled), c = counters(parts), today = new Date();
    var rows = parts.map(function (p) {
      var n = R.nature(p.it);
      return '<tr><td>' + fmtD(p.it.dateObj) + '<br>' + esc(p.it.numero) + '</td><td>' + esc(TYPE[p.it.type_feu] || '') + '<br><small>' + esc(p.it.precision || '') + '</small></td>' +
        '<td>' + (n.procedes.length ? n.procedes.map(function (k) { return esc(R.PROCEDES[k].court); }).join(', ') + '<br><small>Substances : ' + (R.profil(p.it) === 'vegetation' ? 'socle végétation' : 'socle feu de structure') + ' (' + n.substances.length + ')</small>' + (n.circ.length ? '<br><b>+ ' + n.circ.map(function (k) { return esc(R.CIRC[k].nom); }).join(', ') + '</b>' : '') : 'Aucun procédé cancérogène') + '</td>' +
        '<td>' + durTxt(p.duree_min) + '</td><td>' + esc(posTxt(p)) + '<br>' + esc((CONT[p.contamination] || [''])[0]) + '<br>' + esc((R.DEC[p.decon_type] || { label: p.decon_validee ? 'Décontamination réalisée' : 'Non renseignée' }).label) + (confOk(p) ? '<br>Validée par mesure ' + esc(p.decon_ref) + ' à ' + esc(p.decon_heure) : '') + (p.ari_retire_deb ? '<br>ARI retiré au déblai' : '') + '</td></tr>';
    }).join('');
    var html = '<article class="fiche"><header class="fi-head"><div><h1>Fiche individuelle d\'exposition aux agents CMR</h1><p>Art. R. 4412-93-1 à R. 4412-93-4 du code du travail · nature, durée et degré de l\'exposition · à conserver 40 ans</p></div><span class="fi-brand">VB Safety · Sapeur-pompier</span></header>' +
      '<dl class="fi-id"><div><dt>Agent</dt><dd>' + esc((u.grade ? u.grade + ' ' : '') + (u.name || '')) + '</dd></div><div><dt>Matricule</dt><dd>' + esc(u.matricule || '') + '</dd></div><div><dt>Centre</dt><dd>' + esc(centreName()) + '</dd></div><div><dt>Période</dt><dd>' + esc(periodLabel()) + '</dd></div><div><dt>Édition</dt><dd>' + fmtD(today) + '</dd></div><div><dt>Référentiel</dt><dd>VB Safety v' + R.version + '</dd></div></dl>' +
      '<h2>Synthèse</h2><table class="fi-sum"><tr><td><b>' + c.feux + '</b> interventions avec fumées</td><td><b>' + c.att + '</b> en position d\'attaque</td><td><b>' + String(Math.round(c.heures * 10) / 10).replace('.', ',') + ' h</b> de feu</td></tr><tr><td><b>' + c.dec1h + '</b> décontaminations dans l\'heure</td><td><b>' + c.decNon + '</b> sans décontamination</td><td><b>' + c.ariRet + '</b> ARI retiré au déblai</td></tr></table>' +
      '<h2>Détail des expositions</h2>' + (rows ? '<table class="fi-tab"><thead><tr><th>Date · n°</th><th>Intervention</th><th>Nature</th><th>Durée</th><th>Degré (position, zone, décontamination)</th></tr></thead><tbody>' + rows + '</tbody></table>' : '<p>Aucune exposition enregistrée sur la période.</p>') +
      '<h2>Substances présumées</h2><table class="fi-leg"><tr><td><b>Socle feu de structure</b> : ' + R.SOCLE.map(function (x) { return esc(x.nom) + (x.cas ? ' (CAS ' + x.cas + ', ' + esc(x.cls) + ')' : ''); }).join(' ; ') + '.</td></tr><tr><td><b>Socle végétation</b> : ' + R.SOCLE.filter(function (x) { return R.SOCLE_VEG.indexOf(x.code) !== -1; }).map(function (x) { return esc(x.nom); }).join(', ') + ' ; 1,3-butadiène si véhicules impliqués.</td></tr></table>' +
      (DOC ? '<div class="fi-ind">' + esc(R.bloc(c.ef)) + ' Méthode : note méthodologique du référentiel.</div>' : '') +
      '<p class="fi-note">Nature : procédés cancérogènes de l\'arrêté du 26 octobre 2020 et substances présumées du référentiel (classification CLP, annexe VI). Durée : durée d\'engagement. Degré : position tenue, zone d\'engagement et décontamination réalisée. Données fictives de démonstration.</p>' +
      '<div class="fi-sign"><div>Visa du médecin du SSSM</div><div>Date et signature de l\'agent</div></div></article>';
    var area = $('print-area'); area.innerHTML = html;
    document.body.classList.add('printing');
    var t = document.title; document.title = 'Fiche exposition ' + (u.matricule || '') + ' ' + periodLabel();
    window.print();
    document.title = t;
    setTimeout(function () { document.body.classList.remove('printing'); area.innerHTML = ''; }, 300);
  }

  function viewDossier(root) {
    var me = db.me || {}, mine = db.mine, c12 = counters(mine.filter(function (p) { return within(p.it.dateObj, 365); })), call = counters(mine);
    var rdvs = db.rdv.filter(function (r) { return r.agent === db.meId; }).sort(function (a, b) { return b.dateObj - a.dateObj; });
    var parts = mine.filter(inPeriod);
    root.innerHTML = head('Dossier personnel', esc((me.grade ? me.grade + ' ' : '') + (me.name || S.name)) + ' · ' + esc(me.matricule || S.matricule) + ' · ' + esc(centreName())) +
      '<div class="grid grid-3">' +
        kpi('flame', '', 'Interventions enregistrées', mine.length, 'Depuis le début du suivi') +
        kpi('clock', 'warn', 'Heures de feu · 12 mois glissants', String(Math.round(c12.heures * 10) / 10).replace('.', ',') + ' <small class="unit">h</small>', 'Carrière : ' + String(Math.round(call.heures * 10) / 10).replace('.', ',') + ' h') +
        kpi('cal', 'info', 'Rendez-vous SSSM', rdvs.filter(function (r) { return r.statut === 'prevu' && r.dateObj >= new Date(); }).length + ' prévu', rdvs.filter(function (r) { return r.statut === 'realise'; })[0] ? 'Dernier : ' + fmtD(rdvs.filter(function (r) { return r.statut === 'realise'; })[0].dateObj) : 'Aucun rendez-vous passé') +
      '</div>' +
      '<section class="panel"><div class="panel-head wrap"><h3>Historique des expositions · ' + esc(periodLabel()) + '</h3>' + periodBar(mine) + '</div>' + historyTable(parts, 'Aucune intervention enregistrée sur cette période.') + '</section>' +
      countersPanel(counters(parts.filter(filled)), 'Compteurs · ' + periodLabel()) +
      '<section class="panel"><div class="panel-head"><h3>Rendez-vous SSSM</h3></div>' + (rdvs.length ? '<ul class="rows">' + rdvs.map(function (r) {
        return '<li><span class="when">' + fmtD(r.dateObj) + '</span><span class="what"><b>' + esc(r.motif) + '</b><small>' + esc(r.lieu || '') + '</small></span><span class="right">' + badge(r.statut === 'prevu' ? ['Prévu', 'badge-info'] : r.statut === 'realise' ? ['Réalisé', 'badge-ok'] : ['Annulé', 'badge-neutral']) + '</span></li>'; }).join('') + '</ul>' : '<p class="empty">Aucun rendez-vous.</p>') + '</section>';
    bindPeriod(root, mine, me);
  }

  function crewTable(it, opts) {
    opts = opts || {};
    var crew = it.crew.slice().sort(function (a, b) { return (a.engin || '').localeCompare(b.engin || '') || (a.role_tenu === 'chef_agres' ? -1 : 1); });
    var prel = function (p) { return (db.prelevements || []).filter(function (x) { return x.participation === p.id; }).map(function (x) { return '<span class="badge badge-info">' + esc(PREL[x.type]) + ' : ' + x.valeur + ' ' + esc(x.unite || '') + '</span>'; }).join(' '); };
    function rows(list) { return list.map(function (p) {
      return '<tr><td data-l="Agent"><b>' + esc(p.user ? p.user.name : '—') + '</b>' + (opts.byEngin ? '' : (p.engin ? '<br><span class="note">' + esc(p.engin) + '</span>' : '')) + '<br><span class="note">' + esc(ROLE_TENU[p.role_tenu]) + '</span></td><td data-l="Position">' + (filled(p) ? esc(posTxt(p)) : '—') + '</td><td data-l="Zone">' + cont(p) + '</td><td data-l="Durée">' + (filled(p) ? durTxt(p.duree_min) : '—') + '</td><td data-l="Décontamination">' + decon(p) + '</td>' + (DOC ? '<td class="num" data-l="Indicateur">' + efTxt(p) + '</td>' : '') + (opts.sssm ? '<td>' + (prel(p) || '<span class="note">—</span>') + '</td>' : '') + '</tr>';
    }).join(''); }
    var th = '<thead><tr><th>Agent</th><th>Position</th><th>Zone</th><th>Durée</th><th>Décontamination</th>' + (DOC ? '<th class="num">Indicateur</th>' : '') + (opts.sssm ? '<th>Prélèvements</th>' : '') + '</tr></thead>';
    if (!opts.byEngin) return '<table class="dtable">' + th + '<tbody>' + rows(crew) + '</tbody></table>';
    var groups = {}; crew.forEach(function (p) { (groups[p.engin || '—'] = groups[p.engin || '—'] || []).push(p); });
    return Object.keys(groups).map(function (g) { return '<div class="crew-group"><h4>' + esc(g) + '</h4><table class="dtable">' + th + '<tbody>' + rows(groups[g]) + '</tbody></table></div>'; }).join('');
  }
  function reportMeta(it) {
    var bits = [it.ambiance === 'feu_fumee' ? 'Feu et fumées' : it.ambiance === 'fumees_faibles' ? 'Fumées faibles' : it.ambiance === 'aucun_feu' ? 'Aucun feu' : '', it.duree_min ? 'Durée ' + durTxt(it.duree_min) : '', it.motorisation ? (MOTOR[it.motorisation] || it.motorisation) : '', it.zone_deshabillage ? 'Zone de déshabillage' : '', it.epi_ensaches ? 'EPI ensachés' : ''].filter(Boolean);
    return '<div class="chips">' + bits.map(function (b) { return '<span class="chip">' + esc(b) + '</span>'; }).join('') + '</div><p class="nat-line"><b>Nature :</b> ' + esc(R.natureTexte(it)) + (it.exposition_globale ? ' · <b>Exposition particulière :</b> ' + esc(it.exposition_globale) : '') + '</p>';
  }

  function repState(x) {
    var st = VBSData.reportState(x);
    if (x.statut === 'brouillon') return st === 'retard' ? '<span class="stt bad">En retard</span>' : '<span class="stt warn">À faire</span>';
    return x.statut === 'controle_sssm' ? '<span class="stt ok">Validé SSSM</span>' : '<span class="stt">Transmis</span>';
  }
  var repAll = false;
  function viewRapportsCos(root) {
    var its = db.interventions.filter(function (x) { return x.cos === db.meId; }).sort(function (a, b) { return b.dateObj - a.dateObj; });
    var todo = its.filter(function (x) { return x.statut === 'brouillon'; }), done = its.filter(function (x) { return x.statut !== 'brouillon'; });
    var myOps = db.operations.filter(function (o) { return o.cos === db.meId; }).sort(function (a, b) { return b.dateObj - a.dateObj; });
    var row = function (x) {
      var t = x.statut === 'brouillon', rap = t ? lastRappel(x.id) : null;
      return '<li><span class="when">' + fmtD(x.dateObj) + '<small>' + d2(x.dateObj.getHours()) + 'h' + d2(x.dateObj.getMinutes()) + '</small></span><span class="what"><b>' + esc(TYPE[x.type_feu]) + (x.precision ? ' · ' + esc(x.precision) : '') + '</b><small>' + esc(x.numero) + (x.commune ? ' · ' + esc(x.commune) : '') + (rap ? ' · relancé le ' + fmtD(rap.createdObj) : '') + '</small></span>' +
        '<span class="right">' + repState(x) + (t ? '<a class="btn btn-primary btn-sm" href="#rapport/' + x.id + '">Faire mon rapport</a>' : '<a class="btn btn-secondary btn-sm" href="#rapport/' + x.id + '">Voir</a>') + '</span></li>';
    };
    var shown = repAll ? done : done.slice(0, 8);
    root.innerHTML = head("Rapports d'interventions", 'Le rapport de contamination de votre équipage, après chaque intervention.', '<div class="actions-row" style="margin:0"><button class="btn btn-secondary" type="button" id="cisu-in">Réception CISU (démo)</button><button class="btn btn-secondary" type="button" id="new-op">Opération à plusieurs agrès</button><a class="btn btn-primary" href="#rapport/nouveau">Nouveau rapport</a></div>') +
      '<section class="panel"><div class="panel-head"><h3>À faire</h3></div>' + (todo.length ? '<ul class="rows rep-list">' + todo.map(row).join('') + '</ul>' : '<p class="empty">Tous vos rapports sont faits.</p>') + '</section>' +
      viewOpsCos(myOps) +
      '<section class="panel"><div class="panel-head"><h3>Déjà transmis</h3><span class="note">' + done.length + '</span></div>' + (done.length ? '<ul class="rows rep-list">' + shown.map(row).join('') + '</ul>' + (done.length > shown.length ? '<div class="actions-row"><button class="link-btn" type="button" id="rep-more">Afficher les ' + (done.length - shown.length) + ' plus anciens</button></div>' : '') : '<p class="empty">Aucun rapport transmis.</p>') + '</section>';
    root.querySelector('#new-op').onclick = openNewOperation;
    root.querySelector('#cisu-in').onclick = openCisu;
    var more = root.querySelector('#rep-more'); if (more) more.onclick = function () { repAll = true; route(); };
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
    var u = db.byId[suiviId] || {}, all = db.participations.filter(function (p) { return p.agent === suiviId && p.it; }).sort(function (a, b) { return b.it.dateObj - a.it.dateObj; });
    var parts = all.filter(inPeriod);
    var rdvs = db.rdv.filter(function (r) { return r.agent === suiviId; }).sort(function (a, b) { return b.dateObj - a.dateObj; });
    var prels = db.prelevements.filter(function (x) { return all.some(function (p) { return p.id === x.participation; }); });
    var cP = counters(parts.filter(filled));
    // Position relative sur 12 mois (jamais de seuil absolu)
    var tot = {}; db.participations.forEach(function (p) { if (p.it && filled(p) && within(p.it.dateObj, 365)) tot[p.agent] = (tot[p.agent] || 0) + (+p.indice || 0); });
    var ranked = Object.keys(tot).sort(function (a, b) { return tot[b] - tot[a]; }), rank = ranked.indexOf(suiviId);
    var rel = rank === -1 ? 'Aucune exposition sur 12 mois' : rank < Math.max(1, Math.ceil(ranked.length * 0.1)) ? 'Parmi les 10 % les plus exposés' : (rank + 1) + 'e sur ' + ranked.length + ' agents';
    var lastR = rdvs.filter(function (r) { return r.statut === 'realise'; })[0], nextR = rdvs.filter(function (r) { return r.statut === 'prevu' && r.dateObj >= new Date(); }).sort(function (a, b) { return a.dateObj - b.dateObj; })[0];
    root.innerHTML = head('Suivi individuel', 'Dossier de chaque agent : expositions, fiche individuelle, prélèvements et rendez-vous.',
      '<div class="field"><label class="label" for="agent-pick">Agent</label><select class="select" id="agent-pick">' + people.map(function (p) { return '<option value="' + p.id + '"' + (p.id === suiviId ? ' selected' : '') + '>' + esc(p.name + ' · ' + p.matricule) + '</option>'; }).join('') + '</select></div>') +
      '<div class="grid grid-4">' +
        kpi('user', '', esc(u.grade || ''), esc(u.name || ''), esc(u.matricule || '')) +
        kpi('chart', 'warn', 'Indicateur · ' + (PER.mode === '12m' ? '12 mois' : PER.mode === 'annee' ? PER.year : 'carrière'), R.fmt(cP.ef) + ' <small class="unit">EF</small>', esc(rel)) +
        kpi('cal', 'info', 'Dernier rendez-vous', lastR ? fmtD(lastR.dateObj) : '—', nextR ? 'Prochain : ' + fmtD(nextR.dateObj) : 'Aucun rendez-vous prévu') +
        kpi('flask', '', 'Prélèvements', prels.length, prels[0] ? 'Dernier : ' + esc(PREL[prels[0].type]) + ' ' + prels[0].valeur + ' ' + esc(prels[0].unite) : 'Aucun') +
      '</div>' +
      '<section class="panel"><div class="panel-head"><h3>Évolution de l\'indicateur (12 mois)</h3></div>' + lineChart(monthly(all.filter(filled), function (p) { return p.it.dateObj; }, function (p) { return +p.indice || 0; }), ' EF') + '</section>' +
      '<section class="panel"><div class="panel-head wrap"><h3>Expositions · ' + esc(periodLabel()) + '</h3>' + periodBar(all) + '</div>' + historyTable(parts, 'Aucune exposition sur cette période.') +
      '<div class="actions-row"><button class="link-btn" type="button" id="plan-rdv">' + icon('cal') + 'Planifier un rendez-vous</button></div></section>' +
      countersPanel(cP, 'Compteurs · ' + periodLabel());
    bindCharts(root); bindSoon(root); bindPeriod(root, all, u);
    root.querySelector('#plan-rdv').onclick = function () { openRdv(u); };
    var pick = root.querySelector('#agent-pick'); if (pick) pick.onchange = function () { suiviId = pick.value; route(); };
  }

  function viewExport(root) {
    var opts = [];
    var expoHead = ['Date', 'Numéro', 'Type de sinistre', 'Précision', 'Commune', 'Nature (procédés et substances CMR)', 'Circonstances', 'Rôle', 'Engin', 'Position', 'Tactique', 'Zone', 'Durée (min)', 'ARI', 'ARI retiré au déblai', 'Décontamination'].concat(DOC ? ['Indicateur (EF)', 'Référentiel'] : []);
    var expoRow = function (p) { var f = filled(p); return [fmtD(p.it.dateObj), p.it.numero, TYPE[p.it.type_feu], p.it.precision, p.it.commune, f ? R.natureTexte(p.it) : 'Rapport en cours', (p.it.circonstances || []).filter(function (k) { return R.CIRC[k]; }).map(function (k) { return R.CIRC[k].nom; }).join(', '), ROLE_TENU[p.role_tenu], p.engin, f ? R.posLabel(p.position) : '', p.tactique ? R.TAC[p.tactique].label : '', f ? (CONT[p.contamination] || [''])[0] : '', f ? p.duree_min : '', ariTxt(p), p.ari_retire_deb ? 'oui' : 'non', f ? (R.DEC[p.decon_type] || { label: '' }).label : ''].concat(DOC ? [f ? String(p.indice).replace('.', ',') : '', 'v' + R.version] : []); };
    if (S.role === 'agent' || S.role === 'cos' || S.role === 'commandement') {
      opts.push(['perso', 'Mes expositions (CSV)', 'Votre historique complet, avec la nature des agents CMR de chaque intervention.', function () { csvDownload('mes-expositions.csv', [expoHead].concat(db.mine.map(expoRow))); }]);
      opts.push(['pdf', 'Ma fiche individuelle d\'exposition (PDF)', 'Toute votre carrière : nature, durée et degré de chaque exposition.', function () { var m = PER.mode; PER.mode = 'carriere'; printFiche(db.me || {}, db.mine); PER.mode = m; }]);
    }
    if (S.role === 'commandement' || S.role === 'sssm') opts.push(['etat', 'État des rapports du centre (CSV)', 'Statut de chaque rapport : en attente, en retard, transmis, validé.', function () { csvDownload('etat-rapports.csv', [['Date', 'Numéro', 'Type', 'Commune', 'CA/COS', 'Statut']].concat(db.interventions.map(function (x) { return [fmtD(x.dateObj), x.numero, TYPE[x.type_feu], x.commune, x.cosUser ? x.cosUser.name : '', STATE[VBSData.reportState(x)][0]]; }))); }]);
    if (S.role === 'sssm') {
      opts.push(['expo', 'Toutes les expositions (CSV)', 'Une ligne par agent et par intervention, avec la nature des agents CMR.', function () { csvDownload('expositions.csv', [['Agent', 'Matricule'].concat(expoHead)].concat(db.participations.filter(function (p) { return p.it; }).map(function (p) { return [p.user ? p.user.name : '', p.user ? p.user.matricule : ''].concat(expoRow(p)); }))); }]);
      opts.push(['ref', 'Référentiel CMR v' + R.version + ' (CSV)', 'Tous les coefficients, avec leur statut.', function () {
        var rows = [['Famille', 'Code', 'Libellé', 'Valeur', 'Statut']];
        [['Position', R.POS, 'coef'], ['Position (végétation)', R.POS_VEG, 'coef'], ['Tactique', R.TAC, 'coef'], ['Type de sinistre', R.FEU, 'coef'], ['Décontamination (fraction retirée)', R.DEC, 'd']].forEach(function (g) { Object.keys(g[1]).forEach(function (k) { rows.push([g[0], k, g[1][k].label, String(g[1][k][g[2]]).replace('.', ','), R.STATUTS[g[1][k].statut]]); }); });
        csvDownload('referentiel-cmr-v' + R.version + '.csv', rows);
      }]);
    }
    if (S.role === 'habillement') opts.push(['tenues', 'État des tenues du centre (CSV)', 'Numéro, type, agent, état, feux et lavages.', function () { csvDownload('tenues.csv', [['Numéro', 'Type', 'Agent', 'Matricule', 'État', 'Feux depuis la mise en service', 'Feux depuis le dernier lavage', 'Lavages', 'Seuil d\'alerte']].concat((db.tenues || []).map(function (t) { return [t.numero, TENUE[t.type], t.user ? t.user.name : '', t.user ? t.user.matricule : '', TST[t.statut][0], t.nb_feux, t.feux_depuis_lavage, t.nb_lavages, t.seuil_feux]; }))); }]);
    root.innerHTML = head('Export', S.role === 'sssm' ? 'Tous les exports sont disponibles pour le SSSM.' : S.role === 'commandement' ? 'Vos données personnelles et l\'état des rapports de votre centre.' : S.role === 'habillement' ? 'Les données des tenues de votre centre.' : 'Vos données personnelles uniquement.',
      S.role === 'commandement' ? '<div class="field"><label class="label" for="zone">Périmètre</label><select class="select" id="zone"><option>' + esc(centreName()) + '</option><option disabled>Autres centres du groupement (version SDIS)</option></select></div>' : '') +
      '<div class="grid grid-2">' + opts.map(function (o) { return '<div class="callout"><span class="icon-tile">' + icon('download') + '</span><div><strong>' + o[1] + '</strong><span class="sub">' + o[2] + '</span></div><button class="btn btn-secondary btn-sm" type="button" data-exp="' + o[0] + '">Télécharger</button></div>'; }).join('') + '</div>' +
      '<p class="note">Les fichiers sont générés dans votre navigateur. Ils contiennent des données personnelles : conservez-les en lieu sûr.</p>';
    opts.forEach(function (o) { var b = root.querySelector('[data-exp="' + o[0] + '"]'); if (b) b.onclick = o[3]; });
  }

  // ---------- Référentiel CMR : validé par le SSSM, motif de départ par motif de départ ----------
  function nf2(v) { return (Math.round((+v || 0) * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }); }
  function motifStatut(v) {
    if (v.statut === 'valide') return '<span class="stt ok">Validé</span><small>' + esc(v.par || 'SSSM') + (v.valide_le ? ' · ' + fmtD(new Date(String(v.valide_le).replace(' ', 'T'))) : '') + '</small>';
    return '<span class="stt warn">À valider</span><small>Valeurs VB Safety</small>';
  }
  function viewReferentiel(root) {
    var st = function (k) { return '<span class="st st-' + k + '">' + R.STATUTS[k] + '</span>'; };
    var keys = Object.keys(R.MOTIFS), nOk = keys.filter(function (m) { return R.motif(m).statut === 'valide'; }).length;
    var coefTable = function (title, obj, key, fmt) { return '<h4 class="fold-h">' + title + '</h4><table class="dtable"><thead><tr><th>Libellé</th><th class="num">' + (key === 'd' ? 'Fraction retirée' : 'Coefficient') + '</th><th>Statut</th></tr></thead><tbody>' + Object.keys(obj).map(function (k) { return '<tr><td data-l="Libellé">' + esc(obj[k].label) + '</td><td class="num" data-l="Valeur">' + String(obj[k][key]).replace('.', ',') + '</td><td data-l="Statut">' + st(obj[k].statut) + '</td></tr>'; }).join('') + '</tbody></table>' + (fmt || ''); };
    root.innerHTML = head('Référentiel CMR', 'Pour chaque motif de départ, validez ou modifiez ce qui est retenu. Les rapports rédigés ensuite utilisent vos valeurs.', '<span class="ref-count"><b>' + nOk + '</b> / ' + keys.length + ' motifs validés</span>') +
      '<section class="panel"><div class="panel-head"><h3>Par motif de départ</h3>' + (nOk < keys.length ? '<button class="btn btn-secondary btn-sm" type="button" id="ref-all">Valider les ' + (keys.length - nOk) + ' motifs restants</button>' : '') + '</div>' +
      '<table class="dtable ref-table"><thead><tr><th>Motif de départ</th><th class="num">Coefficient</th><th>Agents CMR retenus</th><th>Proposé au CA</th><th>Statut</th><th></th></tr></thead><tbody>' +
      keys.map(function (m) {
        var v = R.motif(m), subs = R.SOCLE.filter(function (x) { return v.substances.indexOf(x.code) !== -1; }).map(function (x) { return x.nom.split(' (')[0]; });
        var dft = R.defautMotif(m).substances, same = dft.length === v.substances.length && dft.every(function (c) { return v.substances.indexOf(c) !== -1; });
        var subsTxt = same ? (m === 'vegetation' ? 'Socle végétation (' + subs.length + ')' : 'Socle des fumées (' + subs.length + ')') : subs.join(', ');
        return '<tr><td data-l="Motif"><b>' + esc(R.MOTIFS[m]) + '</b>' + (v.commentaire ? '<br><span class="note">' + esc(v.commentaire) + '</span>' : '') + '</td>' +
          '<td class="num" data-l="Coefficient">' + (v.coef == null ? '<span class="note">par position</span>' : nf2(v.coef)) + '</td>' +
          '<td data-l="Agents CMR"><span title="' + esc(subs.join(', ')) + '">' + esc(subsTxt) + '</span></td>' +
          '<td data-l="Proposé au CA">' + (v.circonstances.length ? esc(v.circonstances.map(function (k) { return R.CIRC[k] ? R.CIRC[k].nom : k; }).join(', ')) : '<span class="note">—</span>') + '</td>' +
          '<td data-l="Statut" class="ref-st">' + motifStatut(v) + '</td>' +
          '<td class="t-act">' + (v.statut !== 'valide' ? '<button class="btn btn-secondary btn-sm" type="button" data-mval="' + m + '">Valider</button> ' : '') + '<button class="link-btn" type="button" data-medit="' + m + '">Modifier</button></td></tr>';
      }).join('') + '</tbody></table>' +
      '<p class="note">Indicateur : position × tactique × coefficient du motif × (durée / 30) × (1 − décontamination), en équivalents-feu, plafonné à ' + R.PLAFOND + ' par intervention. ' + esc(R.MENTION) + '</p></section>' +
      '<details class="panel fold"><summary>Coefficients communs à tous les motifs</summary>' +
        coefTable('Position tenue (saisie par le chef d\'agrès)', R.POS, 'coef', '<p class="note">La position intègre déjà la zone et la phase.</p>') +
        coefTable('Tactique d\'attaque', R.TAC, 'coef') +
        coefTable('Décontamination', R.DEC, 'd', '<p class="note">Intervient sous la forme (1 − valeur).</p>') +
        coefTable('Feu de végétation : position', R.POS_VEG, 'coef', '<p class="note">Plafond de 4 EF par tranche de 12 heures. Si des habitations ou des véhicules brûlent, le calcul du feu de structure s\'applique.</p>') +
      '</details>' +
      '<details class="panel fold"><summary>Agents CMR et procédés de référence</summary>' +
        '<h4 class="fold-h">Procédés cancérogènes (arrêté du 26 octobre 2020)</h4><ul class="plain">' + Object.keys(R.PROCEDES).map(function (k) { return '<li>' + esc(R.PROCEDES[k].label) + '</li>'; }).join('') + '</ul>' +
        '<h4 class="fold-h">Substances des feux</h4><table class="dtable"><thead><tr><th>Substance</th><th>N° CAS</th><th>Classification</th></tr></thead><tbody>' + R.SOCLE.map(function (x) { return '<tr><td data-l="Substance">' + esc(x.nom) + '</td><td data-l="CAS">' + esc(x.cas || '—') + '</td><td data-l="Classification">' + esc(x.cls) + '</td></tr>'; }).join('') + '</tbody></table>' +
        '<h4 class="fold-h">Circonstances particulières</h4><table class="dtable"><thead><tr><th>Substance</th><th>Classification</th><th>Quand</th></tr></thead><tbody>' + Object.keys(R.CIRC).map(function (k) { var x = R.CIRC[k]; return '<tr><td data-l="Substance">' + esc(x.nom) + '</td><td data-l="Classification">' + esc(x.cls) + '</td><td data-l="Quand">' + esc(x.decl) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '</details>' +
      '<details class="panel fold"><summary>Sources</summary><ol class="src">' + R.SOURCES.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></details>';
    root.querySelectorAll('[data-medit]').forEach(function (b) { b.onclick = function () { openMotif(b.dataset.medit); }; });
    root.querySelectorAll('[data-mval]').forEach(function (b) { b.onclick = function () { b.disabled = true; saveMotif(R.motif(b.dataset.mval), {}).then(function () { toast('« ' + R.MOTIFS[b.dataset.mval] + ' » validé.'); }).catch(function (e) { b.disabled = false; toast('Validation impossible : ' + e.message); }); }; });
    var all = root.querySelector('#ref-all');
    if (all) all.onclick = async function () {
      if (!confirm('Valider les valeurs actuelles des ' + (keys.length - nOk) + ' motifs restants ?')) return;
      all.disabled = true;
      try { for (var i = 0; i < keys.length; i++) { var v = R.motif(keys[i]); if (v.statut !== 'valide') await saveMotif(v, {}, true); } await reload(); toast('Tous les motifs sont validés.'); }
      catch (e) { all.disabled = false; toast('Validation impossible : ' + e.message); }
    };
  }
  async function saveMotif(v, changes, noReload) {
    var data = Object.assign({ motif: v.motif, coef: v.coef == null ? 0 : v.coef, substances: v.substances, circonstances: v.circonstances, commentaire: v.commentaire || '' }, changes, { statut: 'valide', valide_par: db.meId, valide_le: VBSData.toApiDate(new Date()) });
    if (v.id) await VBSData.update(S, 'ref_motifs', v.id, data); else await VBSData.create(S, 'ref_motifs', data);
    if (!noReload) await reload();
  }
  function openMotif(m) {
    var v = R.motif(m), d0 = R.defautMotif(m), veg = m === 'vegetation';
    modal(R.MOTIFS[m], (veg ? '<p class="note">Feu de végétation : pas de coefficient de motif, le calcul se fait par position.</p>' :
        '<div class="field"><label class="label" for="mo-coef">Coefficient du motif</label><input class="input" id="mo-coef" type="number" min="0" max="3" step="0.05" inputmode="decimal" value="' + v.coef + '"><span class="hint">Valeur VB Safety : ' + nf2(d0.coef) + '. 1 = feu d\'habitation.</span></div>') +
      '<fieldset class="fs"><legend class="label">Agents CMR retenus</legend>' + R.SOCLE.map(function (x) { return '<label class="check"><input type="checkbox" name="mo-sub" value="' + x.code + '"' + (v.substances.indexOf(x.code) !== -1 ? ' checked' : '') + '> ' + esc(x.nom) + ' <span class="note">' + esc(x.cls) + '</span></label>'; }).join('') + '</fieldset>' +
      '<fieldset class="fs"><legend class="label">Circonstances proposées au chef d\'agrès</legend>' + Object.keys(R.CIRC).map(function (k) { return '<label class="check"><input type="checkbox" name="mo-circ" value="' + k + '"' + (v.circonstances.indexOf(k) !== -1 ? ' checked' : '') + '> ' + esc(R.CIRC[k].nom) + ' <span class="note">' + esc(R.CIRC[k].decl) + '</span></label>'; }).join('') + '<span class="hint">Le chef d\'agrès les voit en suggestion ; il coche seulement si c\'est le cas.</span></fieldset>' +
      '<div class="field"><label class="label" for="mo-com">Commentaire (facultatif)</label><input class="input" id="mo-com" maxlength="300" value="' + esc(v.commentaire || '') + '"></div>',
      [{ label: 'Valeurs VB Safety', run: function (dlg) {
          var c = dlg.querySelector('#mo-coef'); if (c) c.value = d0.coef;
          dlg.querySelectorAll('[name=mo-sub]').forEach(function (x) { x.checked = d0.substances.indexOf(x.value) !== -1; });
          dlg.querySelectorAll('[name=mo-circ]').forEach(function (x) { x.checked = d0.circonstances.indexOf(x.value) !== -1; });
          return false; } },
       { label: 'Enregistrer et valider', primary: true, run: async function (dlg) {
          var subs = Array.prototype.map.call(dlg.querySelectorAll('[name=mo-sub]:checked'), function (x) { return x.value; });
          if (!subs.length) throw new Error('Retenez au moins un agent CMR.');
          var ch = { substances: subs, circonstances: Array.prototype.map.call(dlg.querySelectorAll('[name=mo-circ]:checked'), function (x) { return x.value; }), commentaire: dlg.querySelector('#mo-com').value.trim() };
          if (!veg) { var c = parseFloat(String(dlg.querySelector('#mo-coef').value).replace(',', '.')); if (!(c >= 0 && c <= 3)) throw new Error('Coefficient entre 0 et 3.'); ch.coef = c; }
          await saveMotif(v, ch); toast('« ' + R.MOTIFS[m] + ' » enregistré et validé.');
        } }]);
  }

  function viewReglementation(root) {
    var IMP = { info: ['Information', 'badge-neutral'], a_suivre: ['À suivre', 'badge-info'], action_requise: ['Action requise', 'badge-late'] };
    var link = function (u) { u = String(u || ''); if (u.charAt(0) === '#') return '<a class="more" href="' + esc(u) + '">Ouvrir ' + icon('arrow') + '</a>'; return /^https:\/\//.test(u) ? '<a class="more" href="' + esc(u) + '" target="_blank" rel="noopener">En savoir plus ' + icon('arrow') + '</a>' : ''; };
    root.innerHTML = head('Suivi réglementation', 'Les évolutions qui concernent le suivi des expositions des sapeurs-pompiers.') +
      db.reglementation.map(function (a) { var d = new Date(String(a.date).replace(' ', 'T'));
        return '<section class="panel news"><div class="panel-head"><h3>' + esc(a.titre) + '</h3>' + badge(IMP[a.impact] || IMP.info) + '</div><p>' + esc(a.resume) + '</p><div class="news-foot"><span class="note">' + fmtD(d) + ' · ' + esc(a.source) + '</span>' + link(a.lien) + '</div></section>'; }).join('') +
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
  // =================================================================== réception CISU (démonstration)
  // Un message au format national (création d'affaire RC-EDA + moyens engagés RC-RI) crée le rapport
  // à compléter : nature, commune, début, durée et engin sont repris ; le CA ajoute l'équipage et l'exposition.
  var CISU_ANS = ['RC-EDA_Incendie_RaymondeLECCIA.01.json'].concat(['02', '03', '04', '05', '06', '07', '08'].map(function (n) { return 'RC-RI_Incendie_RaymondeLECCIA.' + n + '.json'; }));
  function hm(d) { return d ? d2(d.getHours()) + 'h' + d2(d.getMinutes()) : '—'; }
  function openCisu() {
    var C = window.VBSCisu, msgs = null, res = null;
    var dlg = modal('Intervention reçue du système d\'alerte',
      '<p class="note">Démonstration de l\'interface au <b>format national CISU</b>, celui des échanges 15-18 (modèles publics de l\'Agence du numérique en santé) : création d\'affaire <code>RC-EDA</code> et moyens engagés <code>RC-RI</code>. Avec un accès au système d\'alerte, ces messages arrivent seuls ; ici, vous les générez ou les importez.</p>' +
      '<div class="cisu-src"><div class="field"><label class="label" for="cisu-sc">Générer une intervention fictive</label><div class="cisu-row"><select class="select" id="cisu-sc">' + Object.keys(C.SCENARIOS).map(function (k) { return '<option value="' + k + '">' + esc(C.SCENARIOS[k]) + '</option>'; }).join('') + '</select><button class="btn btn-secondary" type="button" id="cisu-gen">Générer</button></div></div>' +
      '<div class="cisu-row cisu-alt"><button class="link-btn" type="button" id="cisu-ans">Charger l\'exemple officiel de l\'ANS (incendie)</button><label class="link-btn" for="cisu-file">Importer des fichiers .json</label><input type="file" id="cisu-file" accept=".json,application/json" multiple hidden></div></div>' +
      '<div id="cisu-res" class="cisu-res"><p class="empty">Aucun message reçu.</p></div>',
      [{ label: 'Créer le rapport à compléter', primary: true, run: async function () {
        if (!res) throw new Error('Générez ou importez d\'abord un message.');
        if (!res.type) throw new Error('Intervention sans exposition aux fumées : aucun rapport de contamination à créer.');
        var dup = db.interventions.filter(function (x) { return String(x.observations || '').indexOf(res.caseId) !== -1; })[0];
        if (dup) { location.hash = 'rapport/' + dup.id; toast('Cette affaire a déjà été reçue : rapport existant ouvert.'); return true; }
        var tail = String(res.caseId).replace(/[^A-Za-z0-9]/g, '').slice(-5).toUpperCase();
        var rec = await VBSData.create(S, 'interventions', {
          numero: 'INT-' + res.debut.getFullYear() + '-' + tail + '-' + res.enginPrincipal, date: VBSData.toApiDate(res.debut), type_feu: res.type,
          precision: (res.nature.label + (res.lieu ? ' · ' + res.lieu.label : '')).slice(0, 160), commune: res.commune, motorisation: '', ambiance: res.ambiance,
          duree_min: res.duree_min, circonstances: [], zone_deshabillage: false, epi_ensaches: false, suspicion_amiante: false, exposition_globale: '',
          observations: 'Reçu au format CISU · affaire ' + res.caseId + ' · nature ' + res.nature.code + ' ' + res.nature.label + ' · engins : ' + res.engins.map(function (e) { return e.nom; }).join(', '),
          statut: 'brouillon', centre: (db.me || {}).centre, cos: db.meId });
        await reload();
        location.hash = 'rapport/' + rec.id;
        toast('Rapport créé : complétez l\'équipage et l\'exposition.');
      } }], { wide: true });
    var box = dlg.querySelector('#cisu-res');
    function show(list, origine) {
      msgs = list;
      try { res = C.parse(list); }
      catch (e) { res = null; box.innerHTML = '<div class="callout red"><div><strong>Message refusé</strong><span class="sub">' + esc(e.message) + '</span></div></div>'; return; }
      var row = function (k, v) { return '<tr><th scope="row">' + k + '</th><td>' + v + '</td></tr>'; };
      var nEda = 1, nRi = list.length - 1;
      box.innerHTML = '<p class="cisu-ok">' + icon('check') + ' ' + list.length + ' message' + (list.length > 1 ? 's' : '') + ' lu' + (list.length > 1 ? 's' : '') + ' · ' + esc(origine) + '</p>' +
        '<table class="cisu-tab"><tbody>' +
        row('Affaire', '<code>' + esc(res.caseId) + '</code>') +
        row('Nature (code national)', '<code>' + esc(res.nature.code) + '</code> ' + esc(res.nature.label)) +
        (res.lieu ? row('Type de lieu', '<code>' + esc(res.lieu.code) + '</code> ' + esc(res.lieu.label)) : '') +
        (res.risques.length ? row('Risques', res.risques.map(function (r) { return '<code>' + esc(r.code) + '</code> ' + esc(r.label); }).join(' · ')) : '') +
        row('Type retenu pour le Carnet', res.type ? '<b>' + esc(TYPE[res.type]) + '</b><br><span class="note">' + esc(res.regle) + ' · ' + esc(AMB[res.ambiance]) + '</span>' : '<b>Aucun rapport</b><br><span class="note">' + esc(res.regle) + '</span>') +
        row('Commune', esc(res.commune || '—')) +
        row('Départ', fmtDT(res.debut)) +
        row('Fin sur les lieux', res.fin ? fmtDT(res.fin) : '—') +
        row('Durée', res.duree_min ? durTxt(res.duree_min) + ' <span class="note">(premier départ d\'engin → dernière fin sur les lieux)</span>' : '—') +
        row('Engins', res.engins.length ? '<ul class="cisu-eng">' + res.engins.map(function (e) { return '<li><b>' + esc(e.nom) + '</b> <span class="note">départ ' + hm(e.depart) + ' · arrivée ' + hm(e.arrivee) + ' · fin sur les lieux ' + hm(e.finLieux) + '</span></li>'; }).join('') + '</ul>' : '—') +
        '</tbody></table>' +
        (res.warnings.length ? '<p class="note">' + res.warnings.map(esc).join('<br>') + '</p>' : '') +
        (res.type ? '<div class="callout"><div><strong>Reste à saisir par le chef d\'agrès</strong><span class="sub">L\'équipage et les rôles (absents des messages CISU, ou repris du CRSS), le port de l\'ARI, la contamination et la décontamination.</span></div></div>' : '') +
        '<details class="cisu-raw"><summary>Voir les messages reçus (JSON)</summary><pre>' + esc(JSON.stringify(list, null, 2).slice(0, 20000)) + '</pre></details>';
    }
    dlg.querySelector('#cisu-gen').onclick = function () { var k = dlg.querySelector('#cisu-sc').value; show(C.generate(k), 'intervention fictive générée : ' + C.SCENARIOS[k]); };
    dlg.querySelector('#cisu-ans').onclick = async function () {
      try { var list = await Promise.all(CISU_ANS.map(function (f) { return fetch('assets/demo/cisu-ans/' + f).then(function (r) { if (!r.ok) throw new Error(f); return r.json(); }); })); show(list, "exemple officiel publié par l'ANS (dépôt SAMU-Hub-Modeles)"); }
      catch (e) { box.innerHTML = '<p class="empty">Exemple indisponible.</p>'; }
    };
    dlg.querySelector('#cisu-file').onchange = async function (e) {
      var files = Array.prototype.slice.call(e.target.files || []);
      if (!files.length) return;
      try { var list = await Promise.all(files.map(function (f) { return f.text().then(function (t) { try { return JSON.parse(t); } catch (er) { throw new Error(f.name + " n'est pas un JSON valide."); } }); })); show(list, files.length + ' fichier' + (files.length > 1 ? 's' : '') + ' importé' + (files.length > 1 ? 's' : '')); }
      catch (er) { res = null; box.innerHTML = '<div class="callout red"><div><strong>Fichier refusé</strong><span class="sub">' + esc(er.message) + '</span></div></div>'; }
    };
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
  var ENGINS = ['FPT', 'FPTL', 'EPA', 'CCF', 'VSAV', 'VL'];
  var MOTOR = { thermique: 'Thermique (essence, gazole)', gpl: 'GPL', hybride: 'Hybride', electrique: 'Électrique', lithium_ion: 'Batterie lithium-ion en emballement (HF)' };
  var AMB = { feu_fumee: 'Présence de feu et de fumée (incendie actif)', fumees_faibles: 'Fumées négligeables ou diffuses', aucun_feu: 'Aucun feu (reconnaissance, hors atmosphère toxique)' };
  var DUREES = [30, 60, 90, 120, 180, 240];
  var ed = null;

  function memberFrom(p, it) {
    var m = { id: p.id, agent: p.agent, role_tenu: p.role_tenu, engin: p.engin || '', fonctions: (p.fonctions || []).slice(), position: p.position || '', tactique: p.tactique || '', duree_min: +p.duree_min || 0,
      contamination: p.position ? (p.contamination === 'faible' ? 'nulle' : p.contamination) : null, tenue_complete: p.position ? !!p.tenue_complete : null, ari_porte: p.position ? !!p.ari_porte || (+p.ari_min > 0) : null, ari_min: +p.ari_min || 0, ffp3: !!p.ffp3,
      ari_retire_deb: !!p.ari_retire_deb, decon_type: p.decon_type || '', decon_ref: p.decon_ref || '', decon_heure: p.decon_heure || '', decon_conf: !!(p.decon_ref && p.decon_heure), exposition_particuliere: p.exposition_particuliere || '', commentaire: p.commentaire || '' };
    return withDefaults(m, it);
  }
  // Pré-remplissage : la position suit le poste tenu dans l'engin ; le chef d'agrès corrige les exceptions.
  function withDefaults(m, it) {
    var set = R.positions(it);
    if (!m.position || !set[m.position]) { m.position = R.defaultPosition(it, m.role_tenu); m.auto = true; }
    if (m.contamination === null || m.contamination === undefined) m.contamination = set[m.position].zone;
    if (m.position === 'POS_ATT' && !m.tactique) m.tactique = 'TAC_INT';
    if (m.tenue_complete === null || m.tenue_complete === undefined) m.tenue_complete = true;
    if (m.ari_porte === null || m.ari_porte === undefined) m.ari_porte = m.position === 'POS_ATT' || m.position === 'POS_DEB';
    return m;
  }
  function blankMember(agent, role, engin) {
    return withDefaults({ agent: agent, role_tenu: role || 'binome_attaque', engin: engin || 'FPT', fonctions: [], position: '', tactique: '', duree_min: 0, contamination: null, tenue_complete: null, ari_porte: null, ari_min: 0, ffp3: false, ari_retire_deb: false, decon_type: '', decon_ref: '', decon_heure: '', decon_conf: false, exposition_particuliere: '', commentaire: '' }, ed ? ed.it : { type_feu: 'habitation', duree_min: 0 });
  }
  function editorState(id) {
    if (id === 'nouveau') {
      var me = db.me || {};
      ed = { isNew: true, it: { operation: '', numero: 'INT-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 90000) + 10000), date: localInput(new Date()), fin: '', type_feu: 'habitation', precision: '', commune: '', motorisation: '', ambiance: 'feu_fumee', duree_min: 0, circonstances: [], zone_deshabillage: false, epi_ensaches: false, exposition_globale: '', observations: '', statut: 'brouillon', centre: me.centre, cos: db.meId }, crew: [], removed: [] };
      ed.crew.push(blankMember(db.meId, 'chef_agres', 'FPT'));
      return ed;
    }
    var x = db.inter[id];
    if (!x) return null;
    if (S.role === 'cos' && x.cos !== db.meId) return null;
    var it = { operation: x.operation || '', numero: x.numero, date: localInput(x.dateObj), type_feu: x.type_feu, precision: x.precision || '', commune: x.commune || '', motorisation: x.motorisation || '', ambiance: x.ambiance || 'feu_fumee', duree_min: +x.duree_min || 0, fin: finFromDur(localInput(x.dateObj), x.duree_min),
      circonstances: (x.circonstances || []).slice().concat(x.suspicion_amiante && (x.circonstances || []).indexOf('AMIANTE') === -1 ? ['AMIANTE'] : []), zone_deshabillage: !!x.zone_deshabillage, epi_ensaches: !!x.epi_ensaches, exposition_globale: x.exposition_globale || '', observations: x.observations || '', statut: x.statut, centre: x.centre, cos: x.cos };
    var st0 = { isNew: false, id: x.id, it: it, crew: x.crew.map(function (p) { return memberFrom(p, it); }).sort(function (a, b) { return (a.role_tenu === 'chef_agres' ? 0 : 1) - (b.role_tenu === 'chef_agres' ? 0 : 1); }), removed: [] };
    ed = st0;
    if (!st0.crew.length && x.cos === db.meId) st0.crew.push(blankMember(db.meId, 'chef_agres', engOf(x) !== '—' ? engOf(x) : 'FPT'));
    return st0;
  }
  function edReadOnly() { return S.role === 'cos' ? ed.it.statut !== 'brouillon' : S.role !== 'sssm'; }
  function pairBtns(i, field, a, b) {
    var cur = ed.crew[i][field];
    return '<div class="pair" role="group"><button type="button" class="opt' + (cur === true ? ' on' : '') + '" data-set="' + i + '|' + field + '|1" aria-pressed="' + (cur === true) + '">' + a + '</button><button type="button" class="opt' + (cur === false ? ' on warn' : '') + '" data-set="' + i + '|' + field + '|0" aria-pressed="' + (cur === false) + '">' + b + '</button></div>';
  }
  // Rapport en 4 étapes : intervention, CA et conducteur, binôme 1, binôme 2. Une fiche par personne, deux par ligne.
  var STEPS = [
    { n: 1, t: 'Intervention', s: 'Éléments généraux' },
    { n: 2, t: 'CA et conducteur', roles: ['chef_agres', 'conducteur'] },
    { n: 3, t: 'Binôme 1', s: 'Attaque', roles: ['binome_attaque'] },
    { n: 4, t: 'Binôme 2', s: 'Alimentation, soutien', roles: ['binome_alimentation', 'soutien', 'autre'] },
    { n: 5, t: 'Signaler', s: 'Élément particulier' }
  ];
  var SIGT = { doute: 'Doute sur la présence d\'autres éléments toxiques', intox: 'Signes d\'intoxication résiduelle', autre: 'Autre élément particulier' };
  var SIGH = { doute: 'Ex. odeur inhabituelle, fûts ou produits non identifiés, fumées de couleur anormale.', intox: 'Ex. un agent a encore des maux de tête, des nausées ou une toux le lendemain.', autre: 'Tout ce que le SSSM doit savoir sur cette intervention.' };
  function sigParse(sg) { var m = /^\[(doute|intox|autre)\]\s*/.exec(sg.motif || ''); return { type: m ? m[1] : null, texte: m ? sg.motif.slice(m[0].length) : (sg.motif || '') }; }
  function sigTitle(sg) { var q = sigParse(sg); return q.type ? SIGT[q.type] : 'Signalement ' + (sg.niveau === 'critique' ? 'critique' : 'forte exposition'); }
  var SHARED = ['position', 'tactique', 'contamination', 'duree_min', 'tenue_complete', 'ari_porte', 'ari_retire_deb', 'ffp3', 'decon_type', 'exposition_particuliere'];
  function stepOf(m) { for (var k = 1; k < STEPS.length; k++) if (STEPS[k].roles && STEPS[k].roles.indexOf(m.role_tenu) !== -1) return STEPS[k].n; return 4; }
  function idxIn(step) { var out = []; ed.crew.forEach(function (m, i) { if (stepOf(m) === step) out.push(i); }); return out; }
  function sameOn(step) { return (step === 3 || step === 4) && ed.same && ed.same[step] && idxIn(step).length > 1; }
  function syncFrom(i) {
    var st = stepOf(ed.crew[i]); if (!sameOn(st)) return;
    var src = ed.crew[i];
    idxIn(st).forEach(function (j) { if (j !== i) { SHARED.forEach(function (k) { ed.crew[j][k] = src[k]; }); ed.crew[j].auto = src.auto; } });
  }
  function initSame() {
    ed.same = {};
    [3, 4].forEach(function (st) { var ix = idxIn(st); ed.same[st] = ix.length > 1 && ix.every(function (j) { return SHARED.every(function (k) { return ed.crew[j][k] === ed.crew[ix[0]][k]; }); }); });
  }
  function finFromDur(date, dur) { if (!date || !+dur) return ''; var d = new Date(new Date(date).getTime() + dur * 60000); return d2(d.getHours()) + ':' + d2(d.getMinutes()); }
  function durFromFin(date, fin) {
    if (!date || !/^\d{2}:\d{2}$/.test(fin || '')) return 0;
    var s = new Date(date), e = new Date(s), p = fin.split(':'); e.setHours(+p[0], +p[1], 0, 0);
    var m = Math.round((e - s) / 60000); if (m <= 0) m += 1440; return m;
  }
  // Fiche d'une personne en 4 blocs : mission, EPI, décontamination, confirmation par mesure.
  function confOn(m) { return !!m.decon_conf && !!m.decon_type && m.decon_type !== 'DEC_AUCUNE'; }
  function nowHM() { var d = new Date(); return d2(d.getHours()) + ':' + d2(d.getMinutes()); }
  function confRow(j, named) {
    var m = ed.crew[j], u = db.byId[m.agent] || {};
    var who = named ? '<b class="conf-who">' + esc(u.name || '—') + '</b>' : '';
    if (m.decon_type === 'DEC_AUCUNE') return '<div class="conf-row">' + who + '<p class="note">Sans objet : aucune décontamination réalisée.</p></div>';
    if (confOn(m)) return '<div class="conf-row ok">' + who + '<p class="conf-done">' + icon('check') + '<span><b>Décontamination validée</b><small>' + esc(m.decon_heure) + ' · mesure DECON-SCAN n° ' + esc(m.decon_ref) + '</small></span></p><button type="button" class="link-btn" data-unconf="' + j + '">Modifier</button></div>';
    return '<div class="conf-row">' + who + '<div class="conf-in"><div class="field"><label class="label sm" for="cf-ref-' + j + '">N° de mesure DECON-SCAN</label><input class="input" id="cf-ref-' + j + '" type="text" maxlength="40" autocomplete="off" data-f="' + j + '|decon_ref" value="' + esc(m.decon_ref) + '" placeholder="Ex. DS-0412"></div>' +
      '<div class="field"><label class="label sm" for="cf-h-' + j + '">Heure</label><input class="input" id="cf-h-' + j + '" type="time" data-f="' + j + '|decon_heure" value="' + esc(m.decon_heure) + '"></div></div>' +
      '<button type="button" class="btn btn-secondary conf-btn" data-conf="' + j + '">' + icon('check') + 'Décontamination validée</button></div>';
  }
  function memberCard(i, group) {
    var m = ed.crew[i], u = db.byId[m.agent] || {}, ro = edReadOnly(), fire = ed.it.ambiance !== 'aucun_feu';
    var calc = R.calcul(ed.it, m), set = R.positions(ed.it), whole = +ed.it.duree_min;
    var names = group ? group.map(function (j) { return (db.byId[ed.crew[j].agent] || {}).name || '—'; }) : null;
    var chips = (whole ? [[whole, 'Toute l\'intervention (' + durTxt(whole) + ')']] : []).concat([[30, '30 min'], [60, '1 h'], [120, '2 h'], [180, '3 h']].filter(function (c) { return c[0] !== whole; }));
    var bh = function (n, t, extra) { return '<h4 class="ac-h"><span>' + n + '</span>' + t + (extra || '') + '</h4>'; };
    var ids = group || [i], nConf = ids.filter(function (j) { return confOn(ed.crew[j]); }).length, allNone = m.decon_type === 'DEC_AUCUNE';
    return '<article class="agent-card' + (group ? ' group' : '') + '" data-card="' + i + '"><div class="agent-top"><div>' +
        (group ? '<b>' + esc(names.join(' + ')) + '</b><small>Saisie commune · une fiche est enregistrée pour chacun</small>' : '<b>' + esc(u.name || '—') + '</b><small>' + esc([u.grade, u.matricule].filter(Boolean).join(' · ')) + '</small>') + '</div>' +
        (ro || group ? '' : '<button type="button" class="icon-btn sm" data-remove="' + i + '" aria-label="Retirer ' + esc(u.name || '') + ' de l\'équipage">✕</button>') + '</div>' +
      '<div class="ac-blocks' + (fire ? '' : ' nofire') + '">' +
      // 1. Mission
      '<section class="ac-b ac-mission">' + bh(1, 'Mission') + '<div class="ac-m3"><div>' +
        (group ? '' : '<div class="form-2"><div class="field"><label class="label">Poste dans l\'engin</label><select class="select" data-f="' + i + '|role_tenu" data-redraw>' + Object.keys(ROLE_TENU).map(function (k) { return '<option value="' + k + '"' + (m.role_tenu === k ? ' selected' : '') + '>' + ROLE_TENU[k] + '</option>'; }).join('') + '</select></div>' +
          '<div class="field"><label class="label">Engin</label><select class="select" data-f="' + i + '|engin">' + ENGINS.map(function (k) { return '<option' + (m.engin === k ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select></div></div>') +
        (fire ? '<div class="block"><span class="label">Position tenue la plus longtemps' + (m.auto ? ' <span class="auto-tag">proposée d\'après le poste</span>' : '') + '</span><div class="pos-pick">' + Object.keys(set).map(function (k) { return '<button type="button" class="opt' + (m.position === k ? ' on' : '') + '" data-pos="' + i + '|' + k + '" aria-pressed="' + (m.position === k) + '">' + esc(set[k].label) + '</button>'; }).join('') + '</div>' +
          (m.position === 'POS_ATT' ? '<div class="sub-pick"><span class="label sm">Tactique d\'attaque</span><div class="pair" role="group">' + Object.keys(R.TAC).map(function (k) { return '<button type="button" class="opt' + (m.tactique === k ? ' on' : '') + '" data-tac="' + i + '|' + k + '" aria-pressed="' + (m.tactique === k) + '">' + (k === 'TAC_INT' ? 'Intérieure directe' : 'Transitoire (abattage extérieur d\'abord)') + '</button>'; }).join('') + '</div></div>' : '') + '</div>' : '') +
        '</div>' + (fire ? '<div><div class="block"><span class="label">Exposition perçue</span><div class="gdo gdo-3">' + ['nulle', 'moyenne', 'forte'].map(function (z) { return '<button type="button" class="opt gdo-' + z + (m.contamination === z ? ' on' : '') + '" data-set="' + i + '|contamination|' + z + '" aria-pressed="' + (m.contamination === z) + '"><b>' + R.ZONES[z][0] + '</b><small>' + R.ZONES[z][1].split(' : ')[1] + '</small></button>'; }).join('') + '</div></div></div>' : '') +
        '<div><div class="block"><span class="label">Durée d\'engagement</span><div class="dur-row"><div class="dur-in"><input class="input" type="number" min="0" max="1440" inputmode="numeric" data-f="' + i + '|duree_min" value="' + (m.duree_min || '') + '" aria-label="Durée en minutes"><span>min</span></div><div class="chips-pick">' + chips.map(function (c) { return '<button type="button" class="opt' + (+m.duree_min === c[0] ? ' on' : '') + '" data-mdur="' + i + '|' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div></div></div></div>' +
      '</div></section>' +
      // 2. EPI
      '<section class="ac-b">' + bh(2, 'EPI') + '<div class="epi-mini">' + pairBtns(i, 'tenue_complete', 'Tenue complète', 'Incomplète') + pairBtns(i, 'ari_porte', 'ARI porté', 'Sans ARI') + '</div>' +
        '<div class="chips-pick">' + (m.position === 'POS_ATT' || m.position === 'POS_DEB' ? '<button type="button" class="opt' + (m.ari_retire_deb ? ' on warn' : '') + '" data-toggle="' + i + '|ari_retire_deb">ARI retiré pendant le déblai</button>' : '') + '<button type="button" class="opt' + (m.ffp3 ? ' on' : '') + '" data-toggle="' + i + '|ffp3">Masque FFP3 au déblai</button></div>' +
        (m.position === 'POS_ATT' && m.ari_porte === false ? '<p class="warn-line">' + icon('alert') + 'Attaque sans ARI : événement anormal, signalé au SSSM.</p>' : '') + '</section>' +
      // 3. Décontamination
      (fire ? '<section class="ac-b">' + bh(3, 'Décontamination') + '<div class="dec-pick">' + Object.keys(R.DEC).map(function (k) { return '<button type="button" class="opt' + (m.decon_type === k ? ' on' + (k === 'DEC_AUCUNE' ? ' warn' : '') : '') + '" data-dec="' + i + '|' + k + '" aria-pressed="' + (m.decon_type === k) + '">' + esc(R.DEC[k].label) + '</button>'; }).join('') + '</div></section>' +
      // 4. Confirmation
        '<section class="ac-b ac-conf' + (!allNone && nConf === ids.length ? ' ok' : '') + '">' + bh(4, 'Confirmation de décontamination', '<em>Facultatif</em>') +
        ids.map(function (j) { return confRow(j, !!group); }).join('') +
        (allNone ? '' : '<p class="note conf-note">Numéro affiché par le DECON-SCAN après la mesure. La synchronisation automatique est prévue.</p>') + '</section>' : '') +
      '</div>' +
      '<div class="form-2 ac-notes"><div class="field"><label class="label">Exposition particulière</label><input class="input" type="text" maxlength="300" data-f="' + i + '|exposition_particuliere" value="' + esc(m.exposition_particuliere) + '" placeholder="Ex. présence de batterie de trottinette"></div>' +
      (group ? '' : '<div class="field"><label class="label">Commentaire individuel</label><input class="input" type="text" maxlength="500" data-f="' + i + '|commentaire" value="' + esc(m.commentaire) + '" placeholder="Faits uniquement, sans donnée médicale"></div>') + '</div>' +
      (DOC && !group ? '<div class="agent-foot"><span>Indicateur conventionnel' + (calc.detail && calc.detail.plafonne ? ' (plafonné)' : '') + '</span><b>' + (fire ? R.fmt(calc.ef) + ' EF' : '—') + '</b></div>' : '') + '</article>';
  }
  function missing(m) {
    var out = [], fire = ed.it.ambiance !== 'aucun_feu';
    if (fire && !m.position) out.push('position');
    if (fire && !m.contamination) out.push('exposition perçue');
    if (!+m.duree_min) out.push('durée');
    if (fire && !m.decon_type) out.push('décontamination');
    return out;
  }
  function circHtml() {
    var c = ed.it.circonstances, veg = ed.it.type_feu === 'vegetation';
    var sug = R.suggestions(ed.it.exposition_globale + ' ' + ed.crew.map(function (m) { return m.exposition_particuliere; }).join(' '), c);
    var prop = veg ? [] : R.motif(ed.it.type_feu).circonstances.filter(function (k) { return R.CIRC[k] && c.indexOf(k) === -1 && sug.indexOf(k) === -1; });
    var addBtn = function (k) { return '<button type="button" class="link-btn" data-circadd="' + k + '">' + esc(R.CIRC[k].nom) + ' (ajouter)</button>'; };
    return '<div class="circ"><span class="label">Circonstances particulières <span class="note">(cochez seulement si c\'est le cas)</span></span><div class="chips-pick">' +
      (veg ? '<button type="button" class="opt' + (c.indexOf('bascule') !== -1 ? ' on' : '') + '" data-circ="bascule">Habitations ou véhicules impliqués</button>' : '') +
      Object.keys(R.CIRC).map(function (k) { return '<button type="button" class="opt' + (c.indexOf(k) !== -1 ? ' on' : '') + '" data-circ="' + k + '" title="' + esc(R.CIRC[k].decl) + '">' + esc(R.CIRC[k].nom) + '<small>' + esc(R.CIRC[k].decl) + '</small></button>'; }).join('') + '</div>' +
      '<div class="form-2 glob"><div class="field"><label class="label" for="ed-glob">Exposition particulière</label><input class="input" id="ed-glob" data-it="exposition_globale" value="' + esc(ed.it.exposition_globale) + '" maxlength="300" placeholder="Ex. présence de batterie de trottinette"></div><button type="button" class="btn btn-secondary" id="ed-apply-all">Appliquer à tout l\'équipage</button></div>' +
      '<div id="ed-sug">' + (sug.length ? '<p class="sug-line"><span>D\'après votre texte, pensez à : ' + sug.map(addBtn).join(' · ') + '</span></p>' : '') + (prop.length ? '<p class="sug-line"><span>Fréquent sur ce type de sinistre (SSSM) : ' + prop.map(addBtn).join(' · ') + '</span></p>' : '') + '</div></div>';
  }
  function natureHtml() {
    var n = R.nature(ed.it);
    if (!n.procedes.length) return '<div class="tox"><span class="label">Agents CMR portés sur la fiche d\'exposition</span><p class="note">Aucun : intervention sans feu ni fumée.</p></div>';
    return '<div class="tox"><span class="label">Agents CMR portés sur la fiche d\'exposition (référentiel v' + R.version + ')</span><div class="chips">' +
      n.procedes.map(function (k) { return '<span class="chip chip-proc">' + esc(R.PROCEDES[k].court) + '</span>'; }).join('') +
      n.substances.map(function (x) { return '<span class="chip">' + esc(x.nom.split(' (')[0]) + '</span>'; }).join('') +
      n.circ.map(function (k) { return '<span class="chip chip-circ">' + esc(R.CIRC[k].nom) + '</span>'; }).join('') + '</div></div>';
  }
  function step1Missing() { return !ed.it.numero || !ed.it.date || !ed.it.fin; }
  function stepNav() {
    return '<ol class="ed-steps">' + STEPS.map(function (st) {
      if (st.n === 5) { var ns = ed.isNew ? 0 : db.signalements.filter(function (z) { return z.intervention === ed.id; }).length; return '<li><button type="button" data-step="5" class="opt5' + (ed.step === 5 ? ' on' : '') + '" aria-current="' + (ed.step === 5 ? 'step' : 'false') + '"><span class="num">5</span><span class="txt"><b>' + st.t + '</b><small>' + (ns ? ns + ' envoyé' + (ns > 1 ? 's' : '') : 'Facultatif') + '</small></span></button></li>'; }
      var ix = st.n === 1 ? [] : idxIn(st.n), bad = st.n === 1 ? step1Missing() : !ix.length || ix.some(function (i) { return missing(ed.crew[i]).length; });
      var sub = st.n === 1 ? st.s : ix.length ? ix.map(function (i) { return first((db.byId[ed.crew[i].agent] || {}).name); }).join(', ') : 'Personne';
      return '<li><button type="button" data-step="' + st.n + '" class="' + (ed.step === st.n ? 'on' : '') + (bad ? '' : ' ok') + '" aria-current="' + (ed.step === st.n ? 'step' : 'false') + '"><span class="num">' + (bad ? st.n : '✓') + '</span><span class="txt"><b>' + st.t + '</b><small>' + esc(sub) + '</small></span></button></li>';
    }).join('') + '</ol>';
  }
  function stepIntervention(x) {
    return '<section class="panel"><div class="panel-head"><h3>1. Intervention</h3>' + (!ed.isNew && db.inter[ed.id] && db.inter[ed.id].op ? opChip(db.inter[ed.id]) : '') + '</div>' +
      (ed.isNew ? '<div class="field"><label class="label" for="ed-op">Opération</label><select class="select" id="ed-op" data-it="operation" data-rerender><option value="">Intervention simple : je suis CA et COS</option>' + db.operations.filter(function (o) { return within(o.dateObj, 3); }).map(function (o) { return '<option value="' + o.id + '"' + (x.operation === o.id ? ' selected' : '') + '>' + esc(opLabel(o) + ' · COS : ' + (o.cosUser ? o.cosUser.name : '—')) + '</option>'; }).join('') + '</select><span class="hint">Sur une opération à plusieurs agrès, rattachez votre rapport : le COS verra que vous l\'avez rempli.</span></div>' : '') +
      '<div class="form-3"><div class="field"><label class="label" for="ed-num">N° d\'intervention</label><input class="input" id="ed-num" data-it="numero" value="' + esc(x.numero) + '" maxlength="32"></div>' +
      '<div class="field"><label class="label" for="ed-date">Départ (date et heure)</label><input class="input" id="ed-date" type="datetime-local" data-it="date" value="' + esc(x.date) + '"></div>' +
      '<div class="field"><label class="label" for="ed-fin">Fin d\'intervention</label><div class="dur-in"><input class="input" id="ed-fin" type="time" data-it="fin" value="' + esc(x.fin || '') + '"><span id="ed-dur-txt">' + (+x.duree_min ? 'soit ' + durTxt(x.duree_min) : '') + '</span></div></div></div>' +
      '<div class="form-3"><div class="field"><label class="label" for="ed-type">Type de sinistre</label><select class="select" id="ed-type" data-it="type_feu" data-rerender>' + Object.keys(TYPE).map(function (k) { return '<option value="' + k + '"' + (x.type_feu === k ? ' selected' : '') + '>' + TYPE[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label class="label" for="ed-prec">Précision</label><input class="input" id="ed-prec" data-it="precision" value="' + esc(x.precision) + '" maxlength="160" placeholder="Ex. VL en parking souterrain"></div>' +
      '<div class="field"><label class="label" for="ed-commune">Commune</label><input class="input" id="ed-commune" data-it="commune" value="' + esc(x.commune) + '" maxlength="80"></div></div>' +
      '<div class="form-2">' + (x.type_feu === 'vehicule' ? '<div class="field"><label class="label" for="ed-motor">Motorisation</label><select class="select" id="ed-motor" data-it="motorisation" data-rerender><option value="">—</option>' + Object.keys(MOTOR).map(function (k) { return '<option value="' + k + '"' + (x.motorisation === k ? ' selected' : '') + '>' + MOTOR[k] + '</option>'; }).join('') + '</select></div>' : '') +
        '<div class="field"><label class="label" for="ed-amb">Fumées et feu</label><select class="select" id="ed-amb" data-it="ambiance" data-rerender>' + Object.keys(AMB).map(function (k) { return '<option value="' + k + '"' + (x.ambiance === k ? ' selected' : '') + '>' + AMB[k] + '</option>'; }).join('') + '</select></div></div>' +
      (x.ambiance !== 'aucun_feu' ? circHtml() : '') + (DOC ? natureHtml() : '') +
      '<div class="chips-pick">' + [['zone_deshabillage', 'Zone de déshabillage mise en place'], ['epi_ensaches', 'EPI souillés ensachés']].map(function (g) { return '<button type="button" class="opt' + (x[g[0]] ? ' on' : '') + '" data-ittoggle="' + g[0] + '">' + g[1] + '</button>'; }).join('') + '</div>' +
      '<div class="field"><label class="label" for="ed-obs">Observations</label><textarea class="textarea" id="ed-obs" data-it="observations" rows="2" maxlength="1000"></textarea></div></section>';
  }
  function stepCrew(n, ro) {
    var st = STEPS[n - 1], ix = idxIn(n), inCrew = ed.crew.map(function (m) { return m.agent; });
    var candidates = db.users.filter(function (u) { return (u.role === 'agent' || u.role === 'cos') && inCrew.indexOf(u.id) === -1; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    return '<section class="panel"><div class="panel-head wrap"><h3>' + n + '. ' + st.t + (st.s ? ' · ' + st.s : '') + '</h3>' +
        (n >= 3 && ix.length > 1 && !ro ? '<label class="check same-tgl"><input type="checkbox" id="ed-same"' + (ed.same[n] ? ' checked' : '') + '> Même saisie pour tout le binôme</label>' : '') + '</div>' +
      (n === 2 ? (function () { var miss = ['chef_agres', 'conducteur'].filter(function (r) { return !ed.crew.some(function (m) { return m.role_tenu === r; }); }); return miss.length && !ro ? '<p class="warn-line">' + icon('alert') + 'Pas de ' + miss.map(function (r) { return r === 'chef_agres' ? 'chef d\'agrès' : 'conducteur'; }).join(' ni de ') + ' dans ce rapport : ajoutez-le ci-dessous.</p>' : ''; })() : '') +
      (ix.length ? '<div class="crew-grid">' + (sameOn(n) ? memberCard(ix[0], ix) : ix.map(function (i) { return memberCard(i); }).join('')) + '</div>' : '<p class="empty">Personne dans cette partie' + (ro ? '.' : ' : ajoutez un membre ci-dessous.') + '</p>') +
      (ro ? '' : '<div class="add-member"><select class="select" id="ed-add" aria-label="Ajouter un membre"><option value="">Ajouter un membre d\'équipage…</option>' + candidates.map(function (u) { return '<option value="' + u.id + '">' + esc(u.name + ' · ' + (u.grade || '') + ' · ' + u.matricule) + '</option>'; }).join('') + '</select><button type="button" class="btn btn-secondary" id="ed-add-btn" data-addstep="' + n + '">Ajouter</button></div>') +
      '</section>';
  }
  function stepSignal() {
    var list = ed.isNew ? [] : db.signalements.filter(function (z) { return z.intervention === ed.id; });
    var ST = { ouvert: 'Envoyé', pris_en_charge: 'Pris en charge par le SSSM', clos: 'Clos' };
    var h = '<section class="panel"><div class="panel-head"><h3>5. Signaler un élément particulier</h3><span class="note">Facultatif</span></div>' +
      '<p class="note">Le SSSM reçoit le signalement, même après la transmission du rapport (par exemple si un agent ne va pas bien le lendemain).</p>' +
      (list.length ? '<ul class="rows nw sig-list">' + list.map(function (sg) { var q = sigParse(sg); return '<li><span class="what"><b>' + esc(sigTitle(sg)) + '</b><small>' + esc((sg.agents || []).map(function (a) { return (db.byId[a] || {}).name; }).filter(Boolean).join(', ')) + (q.texte ? ' · ' + esc(q.texte) : '') + '</small></span><span class="right"><span class="stt' + (sg.statut === 'ouvert' ? ' warn' : ' ok') + '">' + (ST[sg.statut] || '') + '</span></span></li>'; }).join('') + '</ul>' : '');
    if (S.role !== 'cos') return h + (list.length ? '' : '<p class="empty">Aucun signalement pour cette intervention.</p>') + '</section>';
    if (ed.isNew) return h + '<p class="empty">Enregistrez d\'abord le brouillon pour pouvoir envoyer un signalement.</p></section>';
    return h + '<fieldset class="fs"><legend class="label">Quel élément ?</legend><div class="sig-pick">' + Object.keys(SIGT).map(function (k, i) { return '<label class="sig-opt"><input type="radio" name="sg-type" value="' + k + '"' + (i === 0 ? ' checked' : '') + '><span><b>' + SIGT[k] + '</b><small>' + SIGH[k] + '</small></span></label>'; }).join('') + '</div></fieldset>' +
      '<fieldset class="fs"><legend class="label">Agents concernés</legend><div class="sig-agents">' + ed.crew.map(function (m) { return '<label class="check"><input type="checkbox" name="sg-ag" value="' + m.agent + '"> ' + esc((db.byId[m.agent] || {}).name || '—') + '</label>'; }).join('') + '</div></fieldset>' +
      '<div class="field"><label class="label" for="sg-txt">Explication</label><textarea class="textarea" id="sg-txt" rows="3" maxlength="600" placeholder="Décrivez les faits, sans diagnostic."></textarea></div>' +
      '<div class="actions-row"><button type="button" class="btn btn-primary" id="sg-send">' + icon('send') + 'Envoyer au SSSM</button></div></section>';
  }
  async function sendSignal(root, btn) {
    var type = (root.querySelector('[name=sg-type]:checked') || {}).value, agents = Array.prototype.map.call(root.querySelectorAll('[name=sg-ag]:checked'), function (c) { return c.value; }), txt = root.querySelector('#sg-txt').value.trim();
    if (!agents.length) { toast('Cochez au moins un agent concerné.'); return; }
    if (!txt) { toast('Ajoutez une explication.'); return; }
    btn.disabled = true;
    try {
      await VBSData.create(S, 'signalements', { intervention: ed.id, agents: agents, auteur: db.meId, niveau: type === 'intox' ? 'critique' : 'eleve', motif: '[' + type + '] ' + txt, statut: 'ouvert' });
      toast('Signalement envoyé au SSSM.'); await reload();
    } catch (e) { btn.disabled = false; toast('Envoi impossible : ' + e.message); }
  }
  function viewEditor(root, id) {
    if (!ed || (id === 'nouveau' ? !ed.isNew : ed.id !== id)) ed = editorState(id);
    if (!ed) { root.innerHTML = '<p class="empty">Rapport introuvable ou non accessible.</p>'; return; }
    if (!ed.step) ed.step = 1;
    if (!ed.same) initSame();
    var ro = edReadOnly(), x = ed.it, st = ed.isNew ? 'attente' : VBSData.reportState(Object.assign({ dateObj: new Date(x.date) }, x)), n = ed.step;
    root.innerHTML = '<div class="ed-wrap"><a class="back-link" href="#rapports">' + icon('back') + 'Rapports</a>' +
      head(ed.isNew ? 'Nouveau rapport de contamination' : 'Rapport ' + esc(x.numero), S.role === 'sssm' ? 'Correction par le SSSM : chaque modification est journalisée.' : 'Cinq étapes. Une fiche par personne, avec sa décontamination.', ed.isNew ? badge(['Brouillon', 'badge-pending']) : (ro ? '<span class="lock">' + icon('lock') + 'Lecture seule</span> ' : '') + badge(x.statut === 'brouillon' ? ['Brouillon', 'badge-pending'] : STATE[st])) +
      stepNav() +
      (n === 5 ? stepSignal() : '<fieldset class="ed-fs"' + (ro ? ' disabled' : '') + '>' + (n === 1 ? stepIntervention(x) : stepCrew(n, ro)) + '</fieldset>') +
      '<div class="ed-nav">' + (n > 1 ? '<button type="button" class="btn btn-secondary" data-step="' + (n - 1) + '">' + icon('back') + 'Précédent</button>' : '<span></span>') + (n < 5 ? '<button type="button" class="btn btn-primary" data-step="' + (n + 1) + '">Suivant : ' + STEPS[n].t + icon('arrow', 'icon-arrow') + '</button>' : '') + '</div>' +
      (ro ? '' : '<div class="action-bar"><span class="note" id="ed-status"></span>' +
        (S.role === 'cos' ? '<button type="button" class="btn btn-secondary" id="ed-save">Enregistrer le brouillon</button><button type="button" class="btn btn-primary" id="ed-send">' + icon('send') + 'Transmettre au SSSM</button>'
          : '<button type="button" class="btn btn-secondary" id="ed-save">Enregistrer les corrections</button>' + (x.statut !== 'controle_sssm' ? '<button type="button" class="btn btn-primary" id="ed-validate">' + icon('lock') + 'Enregistrer et valider</button>' : '')) + '</div>') + '</div>';
    var obs = root.querySelector('#ed-obs'); if (obs) obs.value = x.observations || '';
    bindEditor(root.firstElementChild, root);
  }
  function reDefault() { ed.crew.forEach(function (m) { if (m.auto || !R.positions(ed.it)[m.position]) { m.position = ''; m.contamination = null; m.tactique = ''; withDefaults(m, ed.it); } }); }
  function bindEditor(root, host) {
    var redraw = function (top) { var y = window.scrollY; viewEditor(host, ed.isNew ? 'nouveau' : ed.id); window.scrollTo(0, top ? 0 : y); };
    var redrawCard = function (i) { var c = root.querySelector('[data-card="' + i + '"]'); if (!c) return; var st = stepOf(ed.crew[i]); c.outerHTML = sameOn(st) ? memberCard(i, idxIn(st)) : memberCard(i); var nav = root.querySelector('.ed-steps'); if (nav) nav.outerHTML = stepNav(); };
    var redrawSug = function () { var box = root.querySelector('#ed-sug'); if (!box) return; var tmp = document.createElement('div'); tmp.innerHTML = circHtml(); box.innerHTML = tmp.querySelector('#ed-sug').innerHTML; };
    var changed = function (i) { syncFrom(i); redrawCard(i); };
    root.addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset.it) {
        ed.it[t.dataset.it] = t.value;
        if (t.dataset.it === 'exposition_globale') redrawSug();
        if (t.dataset.it === 'fin' || t.dataset.it === 'date') { ed.it.duree_min = durFromFin(ed.it.date, ed.it.fin); var dt = root.querySelector('#ed-dur-txt'); if (dt) dt.textContent = ed.it.duree_min ? 'soit ' + durTxt(ed.it.duree_min) : ''; }
      }
      if (t.dataset.f) { var p = t.dataset.f.split('|'), i = +p[0], m = ed.crew[i]; m[p[1]] = p[1] === 'duree_min' ? (+t.value || 0) : t.value; syncFrom(i);
        if (p[1] === 'duree_min') root.querySelectorAll('[data-mdur^="' + i + '|"]').forEach(function (b) { b.classList.toggle('on', +b.dataset.mdur.split('|')[1] === m.duree_min); });
        if (p[1] === 'exposition_particuliere') redrawSug(); }
    });
    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.it && t.hasAttribute('data-rerender')) {
        var prevType = ed.it.type_feu;
        ed.it[t.dataset.it] = t.value;
        if (t.dataset.it === 'type_feu' && t.value !== 'vehicule') ed.it.motorisation = '';
        if (t.dataset.it === 'type_feu' && (prevType === 'vegetation') !== (t.value === 'vegetation')) { ed.it.circonstances = ed.it.circonstances.filter(function (k) { return k !== 'bascule'; }); reDefault(); }
        if (t.dataset.it === 'operation' && t.value && db.ops[t.value]) { var o = db.ops[t.value]; ed.it.type_feu = o.type_feu; ed.it.commune = o.commune || ''; ed.it.precision = o.precision || ''; ed.it.date = localInput(o.dateObj); ed.it.numero = o.numero.replace(/^OP/, 'INT') + '-' + (ed.crew[0] ? ed.crew[0].engin : 'FPT'); reDefault(); }
        redraw();
      }
      if (t.dataset.f && t.hasAttribute('data-redraw')) {
        var q = t.dataset.f.split('|'), mm = ed.crew[+q[0]], before = stepOf(mm); mm[q[1]] = t.value;
        if (mm.auto) { mm.position = ''; mm.contamination = null; mm.tactique = ''; mm.ari_porte = null; withDefaults(mm, ed.it); }
        var after = stepOf(mm);
        if (after !== before) { toast((db.byId[mm.agent] || {}).name + ' est passé dans « ' + STEPS[after - 1].t + ' ».'); }
        redraw();
      }
      if (t.id === 'ed-same') { ed.same[ed.step] = t.checked; if (t.checked) syncFrom(idxIn(ed.step)[0]); redraw(); }
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      var d = b.dataset;
      if (d.step) { ed.step = +d.step; redraw(true); }
      else if (d.set) { var p = d.set.split('|'), m = ed.crew[+p[0]]; var v = p[2] === '1' ? true : p[2] === '0' ? false : p[2]; m[p[1]] = v; changed(+p[0]); }
      else if (d.pos) { var a = d.pos.split('|'), mp = ed.crew[+a[0]]; mp.position = a[1]; mp.auto = false; mp.contamination = R.positions(ed.it)[a[1]].zone; if (a[1] === 'POS_ATT' && !mp.tactique) mp.tactique = 'TAC_INT'; if (a[1] !== 'POS_ATT') mp.tactique = ''; if (a[1] !== 'POS_ATT' && a[1] !== 'POS_DEB') mp.ari_retire_deb = false; changed(+a[0]); }
      else if (d.tac) { var tc = d.tac.split('|'); ed.crew[+tc[0]].tactique = tc[1]; changed(+tc[0]); }
      else if (d.dec) { var dc = d.dec.split('|'); ed.crew[+dc[0]].decon_type = dc[1]; changed(+dc[0]); }
      else if (d.conf || d.unconf) {
        var cj = +(d.conf || d.unconf), cm = ed.crew[cj], card = b.closest('[data-card]');
        if (d.unconf) cm.decon_conf = false;
        else {
          if (!cm.decon_type) { toast('Indiquez d\'abord la décontamination réalisée (bloc 3).'); return; }
          if (!String(cm.decon_ref || '').trim()) { toast('Saisissez d\'abord le numéro de référence de la mesure.'); var inp = root.querySelector('#cf-ref-' + cj); if (inp) inp.focus(); return; }
          cm.decon_ref = cm.decon_ref.trim(); if (!cm.decon_heure) cm.decon_heure = nowHM(); cm.decon_conf = true;
        }
        redrawCard(card ? +card.dataset.card : cj);
      }
      else if (d.mdur) { var md = d.mdur.split('|'); ed.crew[+md[0]].duree_min = +md[1]; changed(+md[0]); }
      else if (d.circ) { var c = ed.it.circonstances, k = c.indexOf(d.circ); if (k === -1) c.push(d.circ); else c.splice(k, 1); if (d.circ === 'bascule') reDefault(); redraw(); }
      else if (d.circadd) { if (ed.it.circonstances.indexOf(d.circadd) === -1) ed.it.circonstances.push(d.circadd); redraw(); }
      else if (d.toggle) { var q = d.toggle.split('|'); ed.crew[+q[0]][q[1]] = !ed.crew[+q[0]][q[1]]; changed(+q[0]); }
      else if (d.ittoggle) { ed.it[d.ittoggle] = !ed.it[d.ittoggle]; b.classList.toggle('on'); }
      else if (d.remove) { var gone = ed.crew.splice(+d.remove, 1)[0]; if (gone.id) ed.removed.push(gone.id); redraw(); }
      else if (b.id === 'ed-apply-all') { var g = ed.it.exposition_globale.trim(); if (!g) { toast("Saisissez d'abord l'exposition particulière."); return; } ed.crew.forEach(function (m) { m.exposition_particuliere = g; }); toast("Exposition appliquée à tout l'équipage."); }
      else if (b.id === 'ed-add-btn') {
        var sel = root.querySelector('#ed-add'); if (!sel.value) return;
        var sn = +d.addstep, role = sn === 2 ? (ed.crew.some(function (m) { return m.role_tenu === 'chef_agres'; }) ? 'conducteur' : 'chef_agres') : sn === 3 ? 'binome_attaque' : 'binome_alimentation';
        var nm = blankMember(sel.value, role, ed.crew[0] ? ed.crew[0].engin : 'FPT'); ed.crew.push(nm);
        if (sameOn(sn)) { var src = ed.crew[idxIn(sn)[0]]; SHARED.forEach(function (k) { nm[k] = src[k]; }); }
        redraw();
      }
      else if (b.id === 'ed-save') saveEditor(null).catch(function () {});
      else if (b.id === 'ed-send') confirmTransmit();
      else if (b.id === 'ed-validate') saveEditor('valider').catch(function () {});
      else if (b.id === 'sg-send') sendSignal(root, b);
    });
  }
  function confirmTransmit() {
    var probs = ed.crew.map(function (m) { var miss = missing(m); return miss.length ? (db.byId[m.agent] || {}).name + ' : ' + miss.join(', ') : null; }).filter(Boolean);
    if (!ed.crew.length) probs.push("Aucun membre d'équipage.");
    if (!ed.it.fin) probs.unshift("Intervention : heure de fin");
    var fire = ed.it.ambiance !== 'aucun_feu';
    var rows = ed.crew.map(function (m) {
      var u = db.byId[m.agent] || {};
      return '<li><b>' + esc(u.name || '—') + '</b> ' + (fire && m.contamination ? badge(CONT[m.contamination]) : '') + '<br><span class="note">' + esc(fire ? R.posLabel(m.position) : ROLE_TENU[m.role_tenu]) + ' · ' + durTxt(m.duree_min) + (fire ? ' · ' + esc((R.DEC[m.decon_type] || { court: 'décontamination non renseignée' }).court) + (m.decon_type && m.decon_type !== 'DEC_AUCUNE' ? (confOn(m) ? ' · validée par mesure à ' + esc(m.decon_heure) : ' · non confirmée par mesure') : '') + (DOC ? ' · ' + R.fmt(R.calcul(ed.it, m).ef) + ' EF' : '') : '') + (m.ari_retire_deb ? ' · ARI retiré au déblai' : '') + (m.position === 'POS_ATT' && m.ari_porte === false ? ' · attaque sans ARI' : '') + '</span></li>';
    }).join('');
    modal('Transmettre au SSSM', (probs.length ? '<div class="callout red"><div><strong>À compléter avant transmission</strong><span class="sub">' + probs.map(esc).join('<br>') + '</span></div></div>' : '<p>Une fois transmis, le rapport n\'est plus modifiable par vous. Le SSSM pourra le corriger et le valider. Le référent EPI du centre est prévenu pour le changement des tenues.</p>' + (function () { var nc = fire ? ed.crew.filter(function (m) { return m.decon_type && m.decon_type !== 'DEC_AUCUNE' && !confOn(m); }).length : 0; return nc ? '<p class="note">' + nc + ' décontamination' + (nc > 1 ? 's' : '') + ' non confirmée' + (nc > 1 ? 's' : '') + ' par mesure : le rapport peut être transmis, le SSSM en est informé.</p>' : ''; })()) +
      '<p class="note">' + esc(TYPE[ed.it.type_feu]) + (ed.it.motorisation ? ' · ' + esc(MOTOR[ed.it.motorisation]) : '') + ' · ' + esc(AMB[ed.it.ambiance]) + '</p>' + (DOC ? '<p class="note"><b>Nature :</b> ' + esc(R.natureTexte(ed.it)) + '</p>' : '') + '<ul class="summary-list">' + rows + '</ul>',
      probs.length ? [] : [{ label: icon('send') + 'Confirmer la transmission', primary: true, run: function () { return saveEditor('transmettre'); } }]);
  }
  async function saveEditor(action) {
    var bar = document.getElementById('ed-status'); var btns = document.querySelectorAll('.action-bar .btn'); btns.forEach(function (b) { b.disabled = true; });
    if (bar) bar.textContent = 'Enregistrement…';
    try {
      var x = ed.it;
      need(x.numero, "Indiquez le numéro d'intervention."); need(x.date, 'Indiquez la date.');
      var circ = x.circonstances.filter(function (k) { return R.CIRC[k] || k === 'bascule'; });
      var itData = { numero: x.numero.trim(), date: VBSData.toApiDate(new Date(x.date)), type_feu: x.type_feu, precision: x.precision, commune: x.commune, motorisation: x.type_feu === 'vehicule' ? x.motorisation : '', ambiance: x.ambiance, duree_min: +x.duree_min || 0, circonstances: circ, zone_deshabillage: x.zone_deshabillage, epi_ensaches: x.epi_ensaches, suspicion_amiante: circ.indexOf('AMIANTE') !== -1, exposition_globale: x.exposition_globale, observations: x.observations };
      if (ed.isNew) { var rec = await VBSData.create(S, 'interventions', Object.assign(itData, { centre: x.centre, cos: db.meId, statut: 'brouillon' }, x.operation ? { operation: x.operation } : {})); ed.id = rec.id; ed.isNew = false; }
      else await VBSData.update(S, 'interventions', ed.id, itData);
      for (var r = 0; r < ed.removed.length; r++) await VBSData.remove(S, 'participations', ed.removed[r]);
      ed.removed = [];
      var fire = x.ambiance !== 'aucun_feu', itc = Object.assign({}, x, { circonstances: circ });
      for (var i = 0; i < ed.crew.length; i++) {
        var m = ed.crew[i], dt = fire ? m.decon_type : 'DEC_AUCUNE';
        var pd = { intervention: ed.id, agent: m.agent, role_tenu: m.role_tenu, engin: m.engin, fonctions: m.fonctions || [], position: m.position, tactique: m.position === 'POS_ATT' ? m.tactique : '', duree_min: +m.duree_min || 0,
          contamination: fire ? (m.contamination || 'nulle') : 'nulle', tenue_complete: !!m.tenue_complete, ari_porte: !!m.ari_porte, ari_min: m.ari_porte ? (+m.ari_min || 0) : 0, ari_retire_deb: !!m.ari_retire_deb, ffp3: !!m.ffp3,
          decon_type: dt || '', decon_validee: !!dt && dt !== 'DEC_AUCUNE', lingettes: /LING/.test(dt || ''), douche: /DOUCHE/.test(dt || ''), decon_ref: m.decon_ref || '', decon_heure: fire && confOn(m) ? m.decon_heure : '',
          exposition_particuliere: m.exposition_particuliere, commentaire: m.commentaire, indice: VBSData.indice(itc, m) };
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

  // =================================================================== EPI : tenues de feu (référent EPI de la caserne uniquement)
  function tenueLine(t) { return TENUE[t.type] + ' ' + t.numero; }
  function seuilBar(t) {
    var s = +t.seuil_feux || VBSData.SEUIL, pct = Math.min(100, Math.round((+t.nb_feux || 0) / s * 100)), over = (+t.nb_feux || 0) >= s;
    return '<div class="seuil' + (over ? ' over' : '') + '" title="' + t.nb_feux + ' feux sur un seuil de ' + s + '"><i style="width:' + pct + '%"></i></div>';
  }
  function stockOf(ty) { return (db.tenues || []).filter(function (t) { return t.type === ty && t.statut === 'en_stock'; }).sort(function (a, b) { return (+a.nb_feux || 0) - (+b.nb_feux || 0); }); }
  function tenuesOf(agentId) { return (db.tenues || []).filter(function (t) { return t.agent === agentId && t.statut !== 'reformee'; }); }
  // Agents qui portent au moins une tenue contaminée
  function aChanger() {
    var by = {};
    (db.tenues || []).forEach(function (t) { if (t.agent && t.statut === 'contaminee') (by[t.agent] = by[t.agent] || []).push(t); });
    return Object.keys(by).map(function (id) { return { agent: id, user: db.byId[id] || {}, tenues: by[id] }; }).sort(function (a, b) { return String(a.user.name).localeCompare(String(b.user.name)); });
  }
  function chgRows(agentId) {
    var cur = tenuesOf(agentId);
    return Object.keys(TENUE).map(function (ty) {
      var t = cur.filter(function (x) { return x.type === ty; })[0], st = stockOf(ty), on = t && t.statut === 'contaminee';
      return '<div class="ty-row"><label class="check"><input type="checkbox" name="ty" value="' + ty + '"' + (on ? ' checked' : '') + '> ' + TENUE[ty] + (t ? ' <span class="note">(' + esc(t.numero) + ', ' + TST[t.statut][0].toLowerCase() + ')</span>' : '') + '</label>' +
        '<select class="select" data-new="' + ty + '" aria-label="Nouvelle ' + TENUE[ty] + '">' + st.map(function (x) { return '<option value="' + esc(x.numero) + '">' + esc(x.numero) + ' (' + (x.nb_feux || 0) + ' feux)</option>'; }).join('') + '<option value="">Autre numéro…</option></select>' +
        '<input class="input" data-num="' + ty + '" maxlength="20" placeholder="N° de la nouvelle tenue"' + (st.length ? ' hidden' : '') + '></div>';
    }).join('');
  }
  function openChangement(agentId) {
    agentId = agentId || (aChanger()[0] || {}).agent || '';
    var dlg = modal('Enregistrer un changement de tenue', '<div class="field"><label class="label" for="ch-agent">Agent</label><select class="select" id="ch-agent">' + agentOptions(agentId) + '</select></div>' +
      '<fieldset class="fs"><legend class="label">Éléments changés et nouvelle tenue</legend><div id="ch-rows">' + chgRows(agentId || (db.users.filter(function (u) { return u.role === 'agent' || u.role === 'cos'; })[0] || {}).id) + '</div></fieldset>' +
      '<p class="note">L\'ancienne tenue passe « à laver », la nouvelle est attribuée à l\'agent.</p>',
      [{ label: 'Enregistrer', primary: true, run: async function (d) {
        var agent = d.querySelector('#ch-agent').value;
        var types = Array.prototype.map.call(d.querySelectorAll('[name=ty]:checked'), function (c) { return c.value; });
        if (!types.length) throw new Error('Cochez au moins un élément.');
        var numeros = {};
        types.forEach(function (ty) { var v = d.querySelector('[data-new="' + ty + '"]').value || d.querySelector('[data-num="' + ty + '"]').value.trim().toUpperCase(); if (!v) throw new Error('Indiquez le numéro de la nouvelle ' + TENUE[ty].toLowerCase() + '.'); numeros[ty] = v; });
        await VBSData.create(S, 'mouvements_epi', { type: 'changement', agent: agent, centre: (db.me || {}).centre, types: types, numeros: numeros, statut: 'traitee', auto: false, motif: 'Changement après intervention', traite_par: db.meId });
        toast('Changement enregistré : l\'ancienne tenue est à laver.'); await reload();
      } }]);
    function bindRows() { dlg.querySelectorAll('[data-new]').forEach(function (sel) { sel.onchange = function () { dlg.querySelector('[data-num="' + sel.dataset.new + '"]').hidden = !!sel.value; }; }); }
    dlg.querySelector('#ch-agent').onchange = function (e) { dlg.querySelector('#ch-rows').innerHTML = chgRows(e.target.value); bindRows(); };
    bindRows();
  }

  function habStats() {
    var T = db.tenues || [], M = db.mouvements_epi || [];
    return { service: T.filter(function (t) { return t.statut === 'en_service'; }).length, dirty: T.filter(function (t) { return t.statut === 'contaminee'; }), aLaver: T.filter(function (t) { return t.statut === 'contaminee' && !t.agent; }), lavage: T.filter(function (t) { return t.statut === 'au_lavage'; }), stock: T.filter(function (t) { return t.statut === 'en_stock'; }),
      demandes: M.filter(function (m) { return m.type === 'demande' && m.statut === 'envoyee'; }).sort(function (a, b) { return a.createdObj - b.createdObj; }),
      seuil: T.filter(function (t) { return t.statut !== 'reformee' && (+t.nb_feux || 0) >= (+t.seuil_feux || VBSData.SEUIL); }) };
  }
  function demandeRow(m) {
    return '<li><span class="when">' + fmtD(m.createdObj) + '</span><span class="what"><b>' + esc(m.user ? m.user.name + ' · ' + m.user.matricule : 'Agent') + '</b><small>' + esc((m.types || []).map(function (x) { return TENUE[x]; }).join(', ')) + (m.motif ? ' · ' + esc(m.motif) : '') + '</small></span><span class="right"><button class="btn btn-primary btn-sm" type="button" data-traiter="' + m.id + '">Remplacer</button></span></li>';
  }
  function tenueActions(t) {
    var a = [];
    if (t.statut === 'contaminee' && t.agent) a.push('<button class="btn btn-primary btn-sm" type="button" data-chg="' + t.agent + '">Changer</button>');
    if (t.statut === 'contaminee' && !t.agent) a.push('<button class="btn btn-secondary btn-sm" type="button" data-tact="lavage|' + t.id + '">Envoyer au lavage</button>');
    if (t.statut === 'au_lavage') a.push('<button class="btn btn-secondary btn-sm" type="button" data-tact="retour|' + t.id + '">Retour de lavage</button>');
    if (t.statut === 'en_stock') a.push('<button class="btn btn-secondary btn-sm" type="button" data-tact="attribuer|' + t.id + '">Attribuer</button>');
    a.push('<button class="link-btn" type="button" data-tact="modifier|' + t.id + '">Modifier</button>');
    return a.join(' ');
  }
  function viewDashHab(root) {
    var s = habStats(), ac = aChanger();
    root.innerHTML = head('Tenues de feu · ' + esc(centreName()), 'Après une intervention sur feu, les tenues des agents engagés sont à changer. Enregistrez chaque changement ici.', '<button class="btn btn-primary" type="button" data-chg="">Enregistrer un changement</button>') +
      '<div class="grid grid-4">' + kpi('users', '', 'Agents à rééquiper', ac.length, ac.length ? 'Tenue contaminée après un feu' : 'Tout le monde est rééquipé') + kpi('alert', '', 'À envoyer au lavage', s.aLaver.length, 'Tenues déposées au centre') + kpi('clock', 'info', 'Au lavage', s.lavage.length, 'En attente de retour') + kpi('list', '', 'En stock', s.stock.length, 'Disponibles au centre') + '</div>' +
      '<section class="panel"><div class="panel-head"><h3>Agents à rééquiper</h3></div>' + (ac.length ? '<ul class="rows nw">' + ac.map(function (a) {
        return '<li><span class="what"><b>' + esc((a.user.grade ? a.user.grade + ' ' : '') + (a.user.name || '—')) + '</b><small>' + esc(a.user.matricule || '') + ' · ' + esc(a.tenues.map(tenueLine).join(', ')) + '</small></span><span class="right"><button class="btn btn-primary btn-sm" type="button" data-chg="' + a.agent + '">Enregistrer le changement</button></span></li>';
      }).join('') + '</ul>' : '<p class="empty">Aucune tenue à changer.</p>') + '</section>' +
      '<div class="grid grid-2"><section class="panel"><div class="panel-head"><h3>À envoyer au lavage</h3><a href="#tenues">Toutes les tenues ' + icon('arrow') + '</a></div>' + (s.aLaver.length ? '<ul class="rows nw">' + s.aLaver.slice(0, 8).map(function (t) { return '<li><span class="what"><b>' + esc(tenueLine(t)) + '</b><small>' + (t.feux_depuis_lavage || 0) + ' feu(x) depuis le dernier lavage</small></span><span class="right">' + tenueActions(t) + '</span></li>'; }).join('') + '</ul>' : '<p class="empty">Rien à envoyer.</p>') + '</section>' +
      '<section class="panel"><div class="panel-head"><h3>Remplacements (seuil d\'alerte)</h3><a href="#changements">Historique ' + icon('arrow') + '</a></div>' + (s.demandes.length ? '<ul class="rows">' + s.demandes.map(demandeRow).join('') + '</ul>' : '<p class="empty">Aucune tenue au seuil.</p>') + '<p class="note">Créés automatiquement quand une tenue atteint ' + ((db.tenues || [])[0] || {}).seuil_feux + ' feux. Seuil réglable dans « Tenues de feu ».</p></section></div>';
    bindHab(root);
  }
  var tFilter = 'tous', tType = '', tQ = '';
  function viewTenues(root) {
    var T = (db.tenues || []).slice().sort(function (a, b) { return a.numero.localeCompare(b.numero); });
    var F = [['tous', 'Toutes'], ['en_service', 'En service'], ['contaminee', 'Contaminées'], ['au_lavage', 'Au lavage'], ['en_stock', 'En stock'], ['reformee', 'Réformées']];
    var list = T.filter(function (t) { return (tFilter === 'tous' ? t.statut !== 'reformee' : t.statut === tFilter) && (!tType || t.type === tType) && (!tQ || (t.numero + ' ' + (t.user ? t.user.name + ' ' + t.user.matricule : '')).toLowerCase().indexOf(tQ.toLowerCase()) !== -1); });
    root.innerHTML = head('Tenues de feu', 'Numéro, agent, état, feux et lavages de chaque tenue du centre.', '<div class="actions-row" style="margin:0"><button class="btn btn-secondary" type="button" id="t-seuil">Seuil d\'alerte : ' + ((T[0] && T[0].seuil_feux) || VBSData.SEUIL) + ' feux</button><button class="btn btn-primary" type="button" id="t-new">' + icon('check') + 'Ajouter une tenue</button></div>') +
      '<div class="filters"><div class="seg" role="group" aria-label="État">' + F.map(function (f) { var n = f[0] === 'tous' ? T.filter(function (t) { return t.statut !== 'reformee'; }).length : T.filter(function (t) { return t.statut === f[0]; }).length; return '<button type="button" data-tf="' + f[0] + '" aria-pressed="' + (tFilter === f[0]) + '">' + f[1] + ' (' + n + ')</button>'; }).join('') + '</div>' +
      '<select class="select sel-sm" id="t-type" aria-label="Type"><option value="">Tous les types</option>' + Object.keys(TENUE).map(function (k) { return '<option value="' + k + '"' + (tType === k ? ' selected' : '') + '>' + TENUE[k] + '</option>'; }).join('') + '</select><input class="input sel-sm" id="t-q" placeholder="N°, agent, matricule" value="' + esc(tQ) + '"></div>' +
      '<section class="panel"><table class="dtable"><thead><tr><th>N°</th><th>Type</th><th>Agent</th><th>État</th><th class="num">Depuis lavage</th><th>Feux / seuil</th><th class="num">Lavages</th><th></th></tr></thead><tbody>' +
      (list.length ? list.map(function (t) { return '<tr><td data-l="N°"><b>' + esc(t.numero) + '</b></td><td data-l="Type">' + TENUE[t.type] + '</td><td data-l="Agent">' + esc(t.user ? t.user.name : '—') + '</td><td data-l="État">' + badge(TST[t.statut]) + '</td><td class="num" data-l="Depuis lavage">' + (t.feux_depuis_lavage || 0) + '</td><td data-l="Feux">' + (t.nb_feux || 0) + ' / ' + (t.seuil_feux || VBSData.SEUIL) + seuilBar(t) + '</td><td class="num" data-l="Lavages">' + (t.nb_lavages || 0) + '</td><td class="t-act">' + tenueActions(t) + '</td></tr>'; }).join('') : '<tr><td colspan="8" class="empty">Aucune tenue.</td></tr>') + '</tbody></table></section>';
    root.querySelectorAll('[data-tf]').forEach(function (b) { b.onclick = function () { tFilter = b.dataset.tf; route(); }; });
    root.querySelector('#t-type').onchange = function (e) { tType = e.target.value; route(); };
    var q = root.querySelector('#t-q'); q.oninput = function () { tQ = q.value; var pos = q.selectionStart; route(); var n2 = document.getElementById('t-q'); n2.focus(); n2.setSelectionRange(pos, pos); };
    root.querySelector('#t-seuil').onclick = openSeuil; root.querySelector('#t-new').onclick = function () { openTenue(null); };
    bindHab(root);
  }
  function viewChangements(root) {
    var M = (db.mouvements_epi || []).slice().sort(function (a, b) { return b.createdObj - a.createdObj; });
    var open = M.filter(function (m) { return m.type === 'demande' && m.statut === 'envoyee'; }), hist = M.filter(function (m) { return !(m.type === 'demande' && m.statut === 'envoyee'); });
    root.innerHTML = head('Changements de tenue', 'Chaque changement enregistré au centre, et les remplacements au seuil d\'alerte.', '<button class="btn btn-primary" type="button" data-chg="">Enregistrer un changement</button>') +
      (open.length ? '<section class="panel"><div class="panel-head"><h3>Remplacements à faire</h3></div><ul class="rows">' + open.map(demandeRow).join('') + '</ul></section>' : '') +
      '<section class="panel"><div class="panel-head"><h3>Historique</h3></div>' + (hist.length ? '<ul class="rows">' + hist.map(function (m) {
        return '<li><span class="when">' + fmtD(m.createdObj) + '</span><span class="what"><b>' + esc(m.user ? m.user.name + ' · ' + m.user.matricule : 'Agent') + '</b><small>' + esc((m.types || []).map(function (x) { return TENUE[x] + (m.numeros && m.numeros[x] ? ' → ' + m.numeros[x] : ''); }).join(', ')) + (m.motif ? ' · ' + esc(m.motif) : '') + '</small></span><span class="right">' + badge(m.statut === 'annulee' ? ['Annulé', 'badge-neutral'] : m.type === 'changement' ? ['Changé', 'badge-ok'] : ['Remplacé', 'badge-ok']) + '</span></li>';
      }).join('') + '</ul>' : '<p class="empty">Aucun changement enregistré.</p>') + '</section>';
    bindHab(root);
  }
  function bindHab(root) {
    root.querySelectorAll('[data-traiter]').forEach(function (b) { b.onclick = function () { openTraiter((db.mouvements_epi || []).find(function (m) { return m.id === b.dataset.traiter; })); }; });
    root.querySelectorAll('[data-chg]').forEach(function (b) { b.onclick = function () { openChangement(b.dataset.chg); }; });
    root.querySelectorAll('[data-tact]').forEach(function (b) { b.onclick = function () { var q = b.dataset.tact.split('|'); tenueAct(q[0], (db.tenues || []).find(function (t) { return t.id === q[1]; }), b); }; });
  }
  async function tenueAct(act, t, btn) {
    if (!t) return;
    if (act === 'modifier') return openTenue(t);
    if (act === 'attribuer') return openAttribuer(t);
    var data = act === 'lavage' ? { statut: 'au_lavage', agent: '' } : act === 'retour' ? { statut: 'en_stock', agent: '', nb_lavages: (+t.nb_lavages || 0) + 1, feux_depuis_lavage: 0 } : act === 'reformer' ? { statut: 'reformee', agent: '' } : null;
    if (!data) return;
    if (act === 'lavage' && t.agent && !confirm((t.user ? t.user.name : 'L\'agent') + ' n\'aura plus de ' + TENUE[t.type].toLowerCase() + ' attribuée. Continuer ?')) return;
    if (act === 'reformer' && !confirm('Réformer la tenue ' + t.numero + ' ?')) return;
    btn.disabled = true;
    try { await VBSData.update(S, 'tenues', t.id, data); toast(act === 'lavage' ? 'Tenue ' + t.numero + ' réceptionnée au lavage.' : act === 'retour' ? 'Tenue ' + t.numero + ' de retour en stock.' : 'Tenue ' + t.numero + ' réformée.'); await reload(); }
    catch (e) { btn.disabled = false; toast('Mise à jour impossible : ' + e.message); }
  }
  function agentOptions(sel) { return db.users.filter(function (u) { return u.role === 'agent' || u.role === 'cos'; }).sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (u) { return '<option value="' + u.id + '"' + (u.id === sel ? ' selected' : '') + '>' + esc(u.name + ' · ' + u.matricule) + '</option>'; }).join(''); }
  async function assign(t, agentId) {
    var cur = (db.tenues || []).filter(function (x) { return x.agent === agentId && x.type === t.type && x.id !== t.id && x.statut !== 'reformee'; });
    for (var i = 0; i < cur.length; i++) await VBSData.update(S, 'tenues', cur[i].id, { agent: '', statut: cur[i].statut === 'en_service' ? 'en_stock' : cur[i].statut });
    await VBSData.update(S, 'tenues', t.id, { agent: agentId, statut: 'en_service' });
  }
  function openAttribuer(t) {
    modal('Attribuer la tenue ' + t.numero, '<p class="note">' + TENUE[t.type] + ' · ' + (t.nb_feux || 0) + ' feux depuis la mise en service.</p><div class="field"><label class="label" for="at-agent">Agent</label><select class="select" id="at-agent">' + agentOptions('') + '</select><span class="hint">Si l\'agent a déjà une tenue de ce type, elle repasse en stock (ou reste à laver si elle est contaminée).</span></div>',
      [{ label: 'Attribuer', primary: true, run: async function (d) { await assign(t, d.querySelector('#at-agent').value); toast('Tenue ' + t.numero + ' attribuée.'); await reload(); } }]);
  }
  function openTenue(t) {
    var isNew = !t; t = t || { numero: '', type: 'veste', statut: 'en_stock', agent: '', seuil_feux: VBSData.SEUIL, nb_feux: 0 };
    modal(isNew ? 'Ajouter une tenue' : 'Modifier la tenue ' + t.numero, '<div class="form-2"><div class="field"><label class="label" for="tn-num">Numéro</label><input class="input" id="tn-num" maxlength="20" value="' + esc(t.numero) + '"></div><div class="field"><label class="label" for="tn-type">Type</label><select class="select" id="tn-type">' + Object.keys(TENUE).map(function (k) { return '<option value="' + k + '"' + (t.type === k ? ' selected' : '') + '>' + TENUE[k] + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="form-2"><div class="field"><label class="label" for="tn-agent">Agent</label><select class="select" id="tn-agent"><option value="">— Aucun (stock) —</option>' + agentOptions(t.agent) + '</select></div><div class="field"><label class="label" for="tn-st">État</label><select class="select" id="tn-st">' + Object.keys(TST).map(function (k) { return '<option value="' + k + '"' + (t.statut === k ? ' selected' : '') + '>' + TST[k][0] + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="form-2"><div class="field"><label class="label" for="tn-feux">Feux depuis la mise en service</label><input class="input" id="tn-feux" type="number" min="0" value="' + (t.nb_feux || 0) + '"></div><div class="field"><label class="label" for="tn-seuil">Seuil d\'alerte (feux)</label><input class="input" id="tn-seuil" type="number" min="1" value="' + (t.seuil_feux || VBSData.SEUIL) + '"></div></div>',
      [{ label: 'Enregistrer', primary: true, run: async function (d) {
        var data = { numero: need(d.querySelector('#tn-num').value, 'Indiquez le numéro.').trim().toUpperCase(), type: d.querySelector('#tn-type').value, agent: d.querySelector('#tn-agent').value, statut: d.querySelector('#tn-st').value, nb_feux: +d.querySelector('#tn-feux').value || 0, seuil_feux: +d.querySelector('#tn-seuil').value || VBSData.SEUIL };
        if (data.agent && data.statut === 'en_stock') data.statut = 'en_service';
        if (isNew) await VBSData.create(S, 'tenues', Object.assign({ centre: (db.me || {}).centre, feux_depuis_lavage: 0, nb_lavages: 0, ef_cumul: 0 }, data)); else await VBSData.update(S, 'tenues', t.id, data);
        toast('Tenue enregistrée.'); await reload();
      } }]);
  }
  function openSeuil() {
    modal('Seuil d\'alerte des tenues', '<p class="note">Nombre de feux depuis la mise en service à partir duquel une tenue est signalée et une demande de remplacement créée automatiquement. Fixé par votre service (préconisations du fabricant, politique d\'habillement).</p><div class="field"><label class="label" for="se-v">Seuil (feux)</label><input class="input" id="se-v" type="number" min="1" value="' + (((db.tenues || [])[0] || {}).seuil_feux || VBSData.SEUIL) + '"></div>',
      [{ label: 'Appliquer à toutes les tenues', primary: true, run: async function (d) { var v = +d.querySelector('#se-v').value; if (!v) throw new Error('Indiquez un seuil.'); var T = db.tenues || []; for (var i = 0; i < T.length; i++) if (+T[i].seuil_feux !== v) await VBSData.update(S, 'tenues', T[i].id, { seuil_feux: v }); toast('Seuil appliqué.'); await reload(); } }]);
  }
  function openTraiter(m) {
    if (!m) return;
    var stock = function (ty) { return (db.tenues || []).filter(function (t) { return t.type === ty && t.statut === 'en_stock'; }); };
    modal('Remplacer la tenue', '<p class="note">' + esc(m.user ? m.user.name + ' · ' + m.user.matricule : '') + ' · ' + fmtD(m.createdObj) + (m.motif ? ' · ' + esc(m.motif) : '') + '</p>' +
      (m.types || []).map(function (ty) { var cur = (db.tenues || []).filter(function (t) { return t.agent === m.agent && t.type === ty && t.statut !== 'reformee'; })[0], st = stock(ty);
        return '<div class="field"><label class="label" for="tr-' + ty + '">' + TENUE[ty] + (cur ? ' <span class="note">(remplace ' + esc(cur.numero) + ')</span>' : '') + '</label><select class="select" id="tr-' + ty + '">' + st.map(function (t) { return '<option value="' + t.id + '">' + esc(t.numero) + ' · ' + t.nb_feux + ' feux</option>'; }).join('') + '<option value="new">Nouvelle tenue (saisir le numéro)…</option></select><input class="input tr-new" id="trn-' + ty + '" maxlength="20" placeholder="Numéro de la nouvelle tenue"' + (st.length ? ' hidden' : '') + '></div>';
      }).join('') + '<p class="note">L\'ancienne tenue passe « à laver ».</p>',
      [{ label: 'Refuser', run: async function () { await VBSData.update(S, 'mouvements_epi', m.id, { statut: 'annulee', traite_par: db.meId }); toast('Demande annulée.'); await reload(); } },
       { label: icon('check') + 'Attribuer et clore', primary: true, run: async function (d) {
        var numeros = {};
        for (var i = 0; i < (m.types || []).length; i++) {
          var ty = m.types[i], v = d.querySelector('#tr-' + ty).value, t;
          if (v === 'new') { var num = need(d.querySelector('#trn-' + ty).value, 'Indiquez le numéro de la nouvelle ' + TENUE[ty].toLowerCase() + '.').trim().toUpperCase(); t = await VBSData.create(S, 'tenues', { numero: num, type: ty, centre: m.centre, statut: 'en_stock', agent: '', nb_feux: 0, feux_depuis_lavage: 0, nb_lavages: 0, ef_cumul: 0, seuil_feux: VBSData.SEUIL }); }
          else t = (db.tenues || []).find(function (x) { return x.id === v; });
          var olds = (db.tenues || []).filter(function (x) { return x.agent === m.agent && x.type === ty && x.statut !== 'reformee' && x.id !== t.id; });
          for (var k = 0; k < olds.length; k++) await VBSData.update(S, 'tenues', olds[k].id, { agent: '', statut: 'contaminee' });
          await VBSData.update(S, 'tenues', t.id, { agent: m.agent, statut: 'en_service' });
          numeros[ty] = t.numero;
        }
        await VBSData.update(S, 'mouvements_epi', m.id, { statut: 'traitee', traite_par: db.meId, numeros: numeros });
        toast('Tenue remplacée.'); await reload();
      } }]);
    document.querySelectorAll('dialog [id^="tr-"]').forEach(function (sel) { sel.onchange = function () { var inp = document.getElementById('trn-' + sel.id.slice(3)); if (inp) inp.hidden = sel.value !== 'new'; }; });
  }

  // =================================================================== cloche de notifications
  function notifications() {
    var out = [], soon = function (r) { return r && (r.dateObj - Date.now()) < 30 * VBSData.DAY; };
    if (S.role === 'agent' || S.role === 'cos' || S.role === 'commandement') {
      var r = nextRdv(db, db.meId); if (soon(r)) out.push({ ic: 'cal', t: 'Rendez-vous SSSM le ' + fmtD(r.dateObj), s: r.motif, href: '#dossier' });
    }
    if (S.role === 'cos') {
      var pend = db.interventions.filter(function (x) { return x.cos === db.meId && x.statut === 'brouillon'; });
      if (pend.length) out.push({ ic: 'clip', tone: 'red', t: pend.length + ' rapport' + (pend.length > 1 ? 's' : '') + ' à compléter', s: pend.slice(0, 3).map(function (x) { return TYPE[x.type_feu] + ' du ' + fmtD(x.dateObj); }).join(' · '), href: '#rapports' });
      myRappels().forEach(function (rp) { out.push({ ic: 'bell', tone: 'red', t: 'Relance de ' + ((db.byId[rp.de] || {}).name || 'votre Chef CI'), s: rp.message, href: '#rapport/' + rp.intervention }); });
    }
    if (S.role === 'commandement') { var late = db.interventions.filter(function (x) { return VBSData.reportState(x) === 'retard'; }); if (late.length) out.push({ ic: 'clock', tone: 'red', t: late.length + ' rapport' + (late.length > 1 ? 's' : '') + ' en retard', s: 'Brouillons de plus de 72 heures.', href: '#gestion' }); }
    if (S.role === 'sssm') {
      db.signalements.filter(function (x) { return x.statut === 'ouvert'; }).forEach(function (x) { out.push({ ic: 'alert', tone: 'red', t: sigTitle(x), s: sigParse(x).texte, href: '#tableau-de-bord' }); });
      var tc = db.interventions.filter(function (x) { return x.statut === 'transmis'; }).length; if (tc) out.push({ ic: 'clip', t: tc + ' rapport' + (tc > 1 ? 's' : '') + ' à contrôler', s: 'Transmis par les CA.', href: '#rapports' });
      db.reglementation.filter(function (x) { return x.impact === 'action_requise'; }).forEach(function (x) { out.push({ ic: 'scale', t: x.titre, s: 'Action requise', href: '#reglementation' }); });
    }
    if (S.role === 'habillement') {
      var hs = habStats(), ac = aChanger();
      if (ac.length) out.push({ ic: 'users', tone: 'red', t: ac.length + ' agent' + (ac.length > 1 ? 's' : '') + ' à rééquiper', s: ac.slice(0, 3).map(function (a) { return a.user.name; }).join(', '), href: '#tableau-de-bord' });
      if (hs.demandes.length) out.push({ ic: 'send', t: hs.demandes.length + ' remplacement' + (hs.demandes.length > 1 ? 's' : '') + ' au seuil', s: 'Tenues arrivées au seuil d\'alerte.', href: '#changements' });
      if (hs.aLaver.length) out.push({ ic: 'alert', t: hs.aLaver.length + ' tenue' + (hs.aLaver.length > 1 ? 's' : '') + ' à envoyer au lavage', s: 'Déposées au centre.', href: '#tableau-de-bord' });
    }
    return out;
  }
  function drawBell() {
    var list = notifications(), bell = $('bell'), dot = bell.querySelector('.dot'); if (dot) dot.remove();
    if (list.length) bell.insertAdjacentHTML('beforeend', '<span class="dot"></span>');
    bell.setAttribute('aria-label', list.length ? list.length + ' notification' + (list.length > 1 ? 's' : '') : 'Aucune notification');
    var pop = $('bell-pop');
    pop.innerHTML = '<div class="pop-head"><b>Notifications</b><span class="note">' + (list.length || 'Aucune') + '</span></div>' + (list.length ? '<ul>' + list.map(function (n) { return '<li><a href="' + n.href + '" class="' + (n.tone || '') + '"><span class="icon-tile sm">' + icon(n.ic) + '</span><span><b>' + esc(n.t) + '</b><small>' + esc(n.s || '') + '</small></span></a></li>'; }).join('') + '</ul>' : '<p class="empty">Vous êtes à jour.</p>');
  }
  (function () {
    var bell = $('bell'), pop = $('bell-pop');
    bell.setAttribute('aria-haspopup', 'true'); bell.setAttribute('aria-expanded', 'false'); bell.setAttribute('aria-controls', 'bell-pop');
    bell.onclick = function (e) { e.stopPropagation(); var open = pop.hidden; if (open && db) drawBell(); pop.hidden = !open; bell.setAttribute('aria-expanded', open); };
    document.addEventListener('click', function (e) { if (!pop.hidden && !e.target.closest('#bell-pop')) { pop.hidden = true; bell.setAttribute('aria-expanded', 'false'); } });
    pop.addEventListener('click', function (e) { if (e.target.closest('a')) { pop.hidden = true; bell.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) { pop.hidden = true; bell.setAttribute('aria-expanded', 'false'); bell.focus(); } });
  })();

  async function reload() {
    try { db = await VBSData.load(S); counts(); route(); }
    catch (e) { toast('Rechargement impossible : ' + e.message); }
  }

  var VIEWS = {
    'tableau-de-bord': { agent: viewDashPerso, cos: viewDashCos, commandement: viewDashCmd, sssm: viewDashSssm, habillement: viewDashHab },
    dossier: viewDossier, rapports: { cos: viewRapportsCos, sssm: viewRapportsSssm }, gestion: viewGestion,
    suivi: viewSuivi, 'export': viewExport, referentiel: viewReferentiel, reglementation: viewReglementation, tenues: viewTenues, changements: viewChangements
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
    if (S.role === 'sssm') { c.rapports = db.interventions.filter(function (x) { return x.statut === 'transmis'; }).length; c.reglementation = db.reglementation.filter(function (r) { return r.impact === 'action_requise'; }).length; }
    if (S.role === 'habillement') { c['tableau-de-bord'] = aChanger().length; c.changements = habStats().demandes.length; }
    nav.querySelectorAll('[data-count]').forEach(function (el) { el.hidden = true; });
    Object.keys(c).forEach(function (k) { var el = nav.querySelector('[data-count="' + k + '"]'); if (el && c[k]) { el.textContent = c[k]; el.hidden = false; } });
    drawBell();
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

  // =================================================================== assistant (assistant.js)
  // Accès en lecture seule à ce que l'utilisateur voit déjà : mêmes données, mêmes droits.
  window.VBSApp = {
    session: S, menu: MENU, roleLabel: ROLE_LABEL[S.role], types: TYPE,
    getDb: function () { return db; },
    page: function () { return (location.hash.slice(1) || 'tableau-de-bord').split('/')[0]; },
    go: function (hash) { location.hash = hash; },
    fmtD: fmtD, esc: esc, icon: icon
  };

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
