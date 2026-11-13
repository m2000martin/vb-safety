/* Cellule de crise : démonstration interactive (données fictives, commune exemple) */
(function () {
  var root = document.getElementById('ccd'); if (!root) return;
  var C = (root.getAttribute('data-c') || '44.0335,-1.2531').split(',').map(Number);
  var mapEl = root.querySelector('.ccd-map'), side = root.querySelector('.ccd-side'), toastEl = root.querySelector('.ccd-toast');
  var clockEl = root.querySelector('.ccd-clock'), teamsEl = root.querySelector('.ccd-teams'), jrEl = root.querySelector('.ccd-jr'), badge = root.querySelector('.ccd-badge');
  var P = { u: ['Urgent', '#e53935'], i: ['Important', '#f59e0b'], n: ['Normal', '#64748b'] }, OK = '#16a34a';
  var ST = ['À traiter', 'Pris en compte', 'Équipe sur le coup', 'Terminé'];
  var TS = { dispo: ['Disponible', '#16a34a'], route: ['En route', '#2563eb'], inter: ['Sur place', '#f59e0b'], pause: ['En pause', '#94a3b8'] };
  var T = [
    { id: 'A', nom: 'Équipe A', met: 'Voirie', chef: 'Resp. voirie', st: 'dispo', at: null, x: 40, y: -160 },
    { id: 'B', nom: 'Équipe B', met: 'Élagage', chef: 'Resp. espaces verts', st: 'route', at: 7, x: -180, y: -40 },
    { id: 'C', nom: 'Équipe C', met: 'Bâtiments', chef: 'Resp. bâtiments', st: 'pause', at: null, x: 110, y: -10 }
  ];
  var I = [
    { n: 7, m: 'Arbre sur la route', a: 'Rue des Pins', h: '14:02', p: 'u', s: 2, t: 'B', r: 2, src: 'Habitant · QR code', x: -60, y: 90, d: 'Pin couché en travers, la route est coupée dans les deux sens.', ph: 1 },
    { n: 4, m: 'Câble au sol', a: 'Chemin du Stade', h: '14:11', p: 'u', s: 0, r: 1, src: 'Appel à la mairie', x: 170, y: -120, d: 'Câble électrique tombé sur le bas-côté, près de l\'arrêt de bus.', danger: 1 },
    { n: 3, m: 'Toiture endommagée', a: 'Avenue de la Gare', h: '13:55', p: 'i', s: 1, r: 1, src: 'Habitant · lien SMS', x: 120, y: 70, d: 'Tuiles arrachées, risque de chute sur le trottoir.', ph: 1 },
    { n: 9, m: 'Route inondée', a: 'Route de la Forêt', h: '13:51', p: 'i', s: 1, r: 3, src: 'Habitants · QR code', x: -210, y: -150, d: 'Environ 20 cm d\'eau sur la chaussée.', ph: 1 },
    { n: 11, m: 'Clôture arrachée', a: 'Impasse des Chênes', h: '13:47', p: 'n', s: 0, r: 1, src: 'Habitant · QR code', x: -150, y: 170, d: 'Panneaux de clôture au sol, pas de passage gêné.' },
    { n: 2, m: 'Branches sur le trottoir', a: 'Rue de l\'École', h: '13:20', p: 'n', s: 3, t: 'A', r: 1, src: 'Habitant · QR code', x: 30, y: 200, d: 'Branches dégagées.' }
  ];
  var Q = [
    { n: 12, m: 'Branches sur la chaussée', a: 'Allée des Bruyères', p: 'i', s: 0, r: 1, src: 'Habitant · QR code', x: 230, y: 40, d: 'Grosse branche sur une voie, la circulation passe.', ph: 1 },
    { n: 13, m: 'Panneau tombé', a: 'Place de la Mairie', p: 'n', s: 0, r: 1, src: 'Habitant · lien SMS', x: -20, y: -20, d: 'Panneau « Stop » couché au carrefour.' },
    { n: 14, m: 'Fumée visible', a: 'Lisière, chemin forestier', p: 'u', s: 0, r: 2, src: 'Appel à la mairie', x: -280, y: 60, d: 'Fumée grise au-dessus des pins, côté ouest.', danger: 1 }
  ];
  var LOG = [
    ['13:42', 'Cellule activée · vigilance orange vent violent', 'Maire'],
    ['13:51', 'Alerte n° 9 · Route inondée, Route de la Forêt', 'Habitant'],
    ['13:55', 'Alerte n° 3 · Toiture endommagée, Avenue de la Gare', 'Habitant'],
    ['14:02', 'Alerte n° 7 · Arbre sur la route, Rue des Pins', 'Habitant'],
    ['14:04', 'N° 7 confiée à Équipe B', 'Cellule'],
    ['14:11', 'Alerte n° 4 · Câble au sol, Chemin du Stade', 'Accueil']
  ];
  var sel = null, filt = 'tous', vue = 'liste', choixEq = false;
  var t0 = 14 * 60 + 12, tStart = Date.now();
  function now() { var m = t0 + Math.floor((Date.now() - tStart) / 6000); return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }
  function ll(o) { return [C[0] + o.y / 111320, C[1] + o.x / (111320 * Math.cos(C[0] * Math.PI / 180))]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function team(id) { for (var i = 0; i < T.length; i++) if (T[i].id === id) return T[i]; }
  function inc(n) { for (var i = 0; i < I.length; i++) if (I[i].n === n) return I[i]; }
  function col(x) { return x.s === 3 ? OK : P[x.p][1]; }
  function log(txt, who) { LOG.push([now(), txt, who || 'Cellule']); if (!jrEl.hidden) rJournal(); }
  function toast(t, s) { toastEl.innerHTML = '<div><b>' + t + '</b>' + s + '</div>'; toastEl.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove('on'); }, 4200); }

  /* ---------- carte ---------- */
  var map = null, mk = {}, tm = {}, rt = {};
  function pinIcon(x) {
    return L.divIcon({ className: '', iconSize: [34, 42], iconAnchor: [17, 40], html: '<div class="ccd-pin' + (x.p === 'u' && x.s < 2 ? ' u' : '') + (sel === x.n ? ' sel' : '') + (x.drop ? ' neu' : '') + '" style="--c:' + col(x) + '"><b>' + x.n + '</b></div>' });
  }
  function teamIcon(t) { return L.divIcon({ className: '', iconSize: [70, 24], iconAnchor: [12, 12], html: '<div class="ccd-tm" style="--c:' + TS[t.st][1] + '"><b>' + t.id + '</b>' + t.met + '</div>' }); }
  function initMap() {
    map = L.map(mapEl, { zoomControl: false, scrollWheelZoom: false }).setView(C, 17);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    var base = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&STYLE=normal';
    var photo = L.tileLayer(base + '&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&FORMAT=image/jpeg', { maxZoom: 19, attribution: 'Images © IGN' }).addTo(map);
    var plan = L.tileLayer(base + '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&FORMAT=image/png', { maxZoom: 19, attribution: '© IGN' });
    root.querySelectorAll('.ccd-lay button').forEach(function (b) {
      b.addEventListener('click', function () {
        root.querySelectorAll('.ccd-lay button').forEach(function (x) { x.classList.toggle('on', x === b); });
        if (b.dataset.l === 'plan') { map.removeLayer(photo); plan.addTo(map); } else { map.removeLayer(plan); photo.addTo(map); }
      });
    });
    I.forEach(addPin);
    T.forEach(function (t) { tm[t.id] = L.marker(ll(t), { icon: teamIcon(t), zIndexOffset: 800, interactive: false }).addTo(map); });
  }
  function addPin(x) { if (map) mk[x.n] = L.marker(ll(x), { icon: pinIcon(x), zIndexOffset: x.p === 'u' ? 300 : 0 }).addTo(map).on('click', function () { pick(x.n); }); }
  function route(t) {
    if (!map) return; if (rt[t.id]) { map.removeLayer(rt[t.id]); rt[t.id] = null; }
    var x = t.at && inc(t.at); if (t.st !== 'route' || !x) return;
    rt[t.id] = L.polyline([ll(t), ll(x)], { color: '#2563eb', weight: 3, dashArray: '6 7', opacity: .9 }).addTo(map);
  }
  function refreshMap() {
    if (!map) return;
    I.forEach(function (x) { if (mk[x.n]) mk[x.n].setIcon(pinIcon(x)); x.drop = 0; });
    T.forEach(function (t) { tm[t.id].setIcon(teamIcon(t)); tm[t.id].setLatLng(ll(t)); route(t); });
  }
  function rTeams() {
    teamsEl.innerHTML = T.map(function (t) { return '<div style="--c:' + TS[t.st][1] + '"><b>' + t.id + '</b><span>' + t.met + '<small>' + TS[t.st][0] + (t.at && t.st !== 'dispo' ? ' · n° ' + t.at : '') + '</small></span></div>'; }).join('');
  }

  /* ---------- panneau ---------- */
  function stChip(x) {
    if (x.s === 3) return '<em style="color:#15803d;background:#f0fdf4;border-color:#bbf7d0">Terminé</em>';
    if (x.s === 2) { var t = team(x.t); return '<em style="color:#1d4ed8;background:#eff6ff;border-color:#bfdbfe">' + t.nom + ' · ' + TS[t.st][0].toLowerCase() + '</em>'; }
    if (x.s === 1) return '<em style="color:#b45309;background:#fffbeb;border-color:#fde68a">Pris en compte</em>';
    return '<em style="color:#b91c1c;background:#fef2f2;border-color:#fecaca">À traiter</em>';
  }
  function kpi() {
    var enc = I.filter(function (x) { return x.s < 3; }), u = enc.filter(function (x) { return x.p === 'u'; }).length, lib = T.filter(function (t) { return t.st === 'dispo'; }).length;
    return '<div class="ccd-k"><div><b>' + enc.length + '</b><span>en cours</span></div><div><b' + (u ? ' style="color:#dc2626"' : '') + '>' + u + '</b><span>urgents</span></div><div><b>' + lib + '<small style="font-size:13px;color:#94a3b8">/' + T.length + '</small></b><span>équipes libres</span></div></div>';
  }
  function rListe() {
    var F = { tous: 'Tous', u: 'Urgents', a: 'À traiter', f: 'Terminés' };
    var L1 = I.filter(function (x) { return filt === 'tous' ? true : filt === 'u' ? x.p === 'u' && x.s < 3 : filt === 'a' ? x.s === 0 : x.s === 3; })
      .sort(function (a, b) { return (a.s === 3) - (b.s === 3) || 'uin'.indexOf(a.p) - 'uin'.indexOf(b.p) || a.s - b.s || b.n - a.n; });
    var h = '<div class="ccd-sh"><b>Incidents</b><span>mis à jour ' + now() + '</span></div>' + kpi();
    h += '<div class="ccd-f">' + Object.keys(F).map(function (k) { return '<button type="button" data-f="' + k + '"' + (filt === k ? ' class="on"' : '') + '>' + F[k] + '</button>'; }).join('') + '</div><div class="ccd-list">';
    h += L1.map(function (x) {
      return '<button type="button" class="ccd-it' + (x.neu ? ' neu' : '') + '" data-n="' + x.n + '" style="--c:' + col(x) + '"><span class="n">' + x.n + '</span><div><b>' + esc(x.m) + (x.danger && x.s < 3 ? ' <i class="dg">⚠</i>' : '') + '</b><small>' + esc(x.a) + ' · ' + x.h + (x.r > 1 ? ' · ' + x.r + ' signalements' : '') + '</small></div>' + stChip(x) + '</button>';
    }).join('') || '<p class="ccd-v">Aucun incident dans ce filtre.</p>';
    side.innerHTML = h + '</div>';
  }
  function teamRow(t, btn) {
    var tag = btn ? 'button type="button" data-t="' + t.id + '"' + (t.st !== 'dispo' ? ' class="occ"' : '') : 'div class="on"';
    return '<' + tag + '><span class="ccd-av" style="--c:' + TS[t.st][1] + '">' + t.id + '</span><span><b>' + t.nom + ' · ' + t.met + '</b><span>' + t.chef + '</span></span><span class="x"><em class="ccd-st" style="color:' + TS[t.st][1] + ';border-color:currentColor">' + TS[t.st][0] + '</em>' + (t.at && t.st !== 'dispo' ? '<span>n° ' + t.at + '</span>' : '') + '</span></' + (btn ? 'button' : 'div') + '>';
  }
  function rFiche(x) {
    var h = '<button type="button" class="ccd-back">← Tous les incidents</button><div class="ccd-card">';
    h += '<div class="ccd-fh"><span class="n" style="--c:' + col(x) + '">' + x.n + '</span><div><b>' + esc(x.m) + '</b><small>' + esc(x.a) + ' · ' + x.h + '</small></div><span class="pp" style="background:' + P[x.p][1] + '">' + P[x.p][0] + '</span></div>';
    h += '<div class="ccd-stp">' + ST.map(function (s, i) { return '<div class="' + (i < x.s || x.s === 3 ? 'd' : i === x.s ? 'c' : '') + '"><i></i><span>' + s + '</span></div>'; }).join('') + '</div>';
    if (x.ph) h += '<div class="ccd-photo"><span>📷 Photo de l\'habitant · ' + x.h + '</span></div>';
    h += '<div class="ccd-desc">' + esc(x.d) + '<small>' + esc(x.src) + (x.r > 1 ? ' · ' + x.r + ' signalements regroupés' : '') + '</small></div></div>';
    if (x.danger && x.s < 2) h += '<div class="ccd-dg">⚠ Danger pour les personnes signalé. Appeler le 18 / 112 si besoin.</div>';
    if (x.s === 0) h += '<button type="button" class="ccd-pri" data-a="pris">Prendre en compte</button>';
    else if (x.s === 1 && !choixEq) h += '<button type="button" class="ccd-pri" data-a="choix">Envoyer une équipe →</button>';
    else if (x.s === 2) h += '<button type="button" class="ccd-pri ok" data-a="fini">✓ Marquer terminé</button>';
    if (x.s === 1 && choixEq) h += '<div class="ccd-lab">Choisir une équipe</div><div class="ccd-tms">' + T.map(function (t) { return teamRow(t, 1); }).join('') + '</div>';
    if (x.s >= 2 && x.t) h += '<div class="ccd-lab">Équipe</div><div class="ccd-tms">' + teamRow(team(x.t)) + '</div>';
    if (x.s < 2 && (x.p === 'u' || x.danger)) h += '<label class="ccd-tg"><input type="checkbox" data-a="sdis"' + (x.sdis ? ' checked' : '') + '> Pompiers prévenus par téléphone</label>';
    var hist = LOG.filter(function (l) { return l[1].indexOf('n° ' + x.n + ' ') > -1 || l[1].indexOf('N° ' + x.n + ' ') === 0 || l[1].indexOf('(n° ' + x.n + ')') > -1; });
    h += '<details class="ccd-hist"><summary>Historique (' + hist.length + ')</summary>' + hist.map(function (l) { return '<div><b>' + l[0] + '</b> ' + esc(l[1]) + '</div>'; }).join('') + '</details>';
    side.innerHTML = h;
  }
  function rEquipes() {
    side.innerHTML = '<div class="ccd-sh"><b>Équipes</b><span>' + T.filter(function (t) { return t.st === 'dispo'; }).length + ' disponible(s)</span></div><div class="ccd-tms">' + T.map(function (t) { return teamRow(t); }).join('') + '</div><p class="ccd-v" style="text-align:left;padding:4px 2px">Chaque responsable met à jour le statut de son équipe depuis son téléphone : « J\'y vais », « Sur place », « Terminé ».</p>';
  }
  function rMeteo() {
    var G = [[14, 95], [15, 105], [16, 110], [17, 90], [18, 80], [19, 70], [20, 60], [21, 55], [22, 50], [23, 45], [0, 40], [1, 35]];
    side.innerHTML = '<div class="ccd-sh"><b>Météo</b><span>département</span></div><div class="ccd-wx"><small>Vigilance Météo-France</small><b>Orange · vent violent</b><p>En cours jusqu\'à demain 06:00. Rafales de 90 à 110 km/h dans les terres.</p></div>'
      + '<div class="ccd-card"><div class="ccd-lab">Rafales prévues · 12 h</div><div class="ccd-ch">' + G.map(function (g) { return '<div><i style="height:' + Math.round(g[1] * .8) + 'px;--c:' + (g[1] >= 90 ? '#f97316' : g[1] >= 60 ? '#fbbf24' : '#cbd5e1') + '"></i>' + g[0] + 'h</div>'; }).join('') + '</div></div>';
  }
  function rJournal() {
    jrEl.innerHTML = '<h4>Journal de crise · Tempête<span><em>Imprimer</em><em>Exporter</em></span></h4><table><thead><tr><th>Heure</th><th>Action</th><th>Par</th></tr></thead><tbody>' + LOG.slice().reverse().map(function (l, i) { return '<tr' + (i === 0 ? ' class="neu"' : '') + '><td>' + l[0] + '</td><td>' + esc(l[1]) + '</td><td>' + esc(l[2]) + '</td></tr>'; }).join('') + '</tbody></table>';
  }
  function render() {
    var x = sel != null && inc(sel);
    if (vue === 'fiche' && x) rFiche(x); else if (vue === 'equipes') rEquipes(); else if (vue === 'meteo') rMeteo(); else rListe();
    var a = I.filter(function (y) { return y.s === 0; }).length; badge.textContent = a || '';
    rTeams(); refreshMap();
  }
  function setRail(v) { root.querySelectorAll('.ccd-rail button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === v); }); }
  function pick(n) { sel = n; vue = 'fiche'; choixEq = false; var x = inc(n); x.neu = 0; jrEl.hidden = true; setRail('liste'); if (map) map.panTo(ll(x), { animate: true }); render(); }
  root.querySelector('.ccd-rail').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; var v = b.dataset.v; setRail(v);
    jrEl.hidden = v !== 'journal'; if (v === 'journal') { rJournal(); return; }
    if (v === 'carte' || v === 'liste') { vue = 'liste'; sel = null; } else vue = v;
    render();
  });
  side.addEventListener('click', function (e) {
    var b = e.target.closest('button,input'); if (!b) return;
    if (b.dataset.f) { filt = b.dataset.f; render(); return; }
    if (b.dataset.n) { pick(+b.dataset.n); return; }
    if (b.classList.contains('ccd-back')) { vue = 'liste'; sel = null; render(); return; }
    var x = inc(sel); if (!x) return; var a = b.dataset.a;
    if (a === 'pris') { x.s = 1; log('N° ' + x.n + ' prise en compte'); }
    else if (a === 'choix') { choixEq = true; }
    else if (a === 'fini') { x.s = 3; var t = team(x.t); t.st = 'dispo'; t.at = null; log('N° ' + x.n + ' terminée · ' + t.nom + ' disponible', t.nom); toast('N° ' + x.n + ' terminée', t.nom + ' redevient disponible'); }
    else if (a === 'sdis') { x.sdis = b.checked; if (b.checked) log('Pompiers prévenus par téléphone (n° ' + x.n + ')'); return; }
    else if (b.dataset.t) { var t2 = team(b.dataset.t); x.s = 2; x.t = t2.id; choixEq = false; t2.st = 'route'; t2.at = x.n; log('N° ' + x.n + ' confiée à ' + t2.nom); move(t2, x); }
    else return;
    render();
  });
  function move(t, x) {
    clearInterval(t.mv); var k = 0, sx = t.x, sy = t.y, N = 45;
    t.mv = setInterval(function () {
      k++; var e = k / N; e = e < .5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2;
      t.x = sx + (x.x + 16 - sx) * e; t.y = sy + (x.y - 12 - sy) * e;
      if (tm[t.id]) tm[t.id].setLatLng(ll(t)); route(t);
      if (k >= N) { clearInterval(t.mv); if (t.at === x.n && x.s === 2) { t.st = 'inter'; log(t.nom + ' sur place (n° ' + x.n + ')', t.nom); toast(t.nom + ' sur place', 'n° ' + x.n + ' · ' + esc(x.m)); render(); } }
    }, 140);
  }
  function arrive() {
    if (!Q.length) return; var x = Q.shift(); x.h = now(); x.neu = 1; x.drop = 1; I.push(x); addPin(x);
    log('Alerte n° ' + x.n + ' · ' + x.m + ', ' + x.a, x.src.indexOf('Habitant') === 0 ? 'Habitant' : 'Accueil');
    toast('Nouveau signalement · n° ' + x.n, esc(x.m) + ' · ' + esc(x.src));
    render();
  }
  var started = false;
  function start() {
    if (started) return; started = true;
    if (window.L) { try { initMap(); } catch (e) { } }
    render();
    setTimeout(function () { move(team('B'), inc(7)); }, 2500);
    var k = 0, it = setInterval(function () { if (document.hidden) return; arrive(); if (++k >= 3) clearInterval(it); }, 11000);
    setInterval(function () { clockEl.textContent = now(); }, 1000); clockEl.textContent = now();
  }
  function loadL(cb) {
    if (window.L) return cb();
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/static/leaflet/leaflet.min.css'; document.head.appendChild(css);
    var s = document.createElement('script'); s.src = '/static/leaflet/leaflet.min.js'; s.onload = cb; s.onerror = cb; document.head.appendChild(s);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); loadL(start); } }, { rootMargin: '300px' });
    io.observe(root);
  } else loadL(start);
})();
