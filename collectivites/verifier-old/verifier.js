/* Vérification OLD d'une commune — tout est calculé dans le navigateur
   à partir des services WFS publics de la Géoplateforme IGN. */
(function () {
  'use strict';
  var WFS = 'https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&OUTPUTFORMAT=application/json&SRSNAME=CRS:84';
  var HITS = 'https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&RESULTTYPE=hits';
  var $ = function (id) { return document.getElementById(id); };
  var q = $('vo-q'), list = $('vo-list'), res = $('vo-res'), etat = $('vo-etat'), out = $('vo-out');
  var map = null, couches = [], run = 0, sel = -1, items = [];
  var fmt = function (n) { return n.toLocaleString('fr-FR'); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function url(type, props, cql, extra) {
    return WFS + '&TYPENAMES=' + type + (props ? '&PROPERTYNAME=' + props : '') +
      '&CQL_FILTER=' + encodeURIComponent(cql) + (extra || '');
  }
  async function getJSON(u, essai) {
    try {
      var r = await fetch(u);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      if (essai) throw e;
      await new Promise(function (ok) { setTimeout(ok, 1200); });
      return getJSON(u, true);
    }
  }
  async function paged(type, props, cql, max, tri) {
    var all = [], start = 0, page = 5000;
    while (true) {
      var d;
      try { d = await getJSON(url(type, props, cql, '&COUNT=' + page + '&STARTINDEX=' + start + (tri ? '&SORTBY=' + tri : '')), start > 0); }
      catch (e) { if (!start) throw e; return { f: all, plus: true }; }
      all = all.concat(d.features || []);
      if (!d.features || d.features.length < page || all.length >= max) return { f: all, plus: d.features && d.features.length === page };
      start += page;
    }
  }

  /* ---------- recherche ---------- */
  var tmr;
  q.addEventListener('input', function () {
    clearTimeout(tmr);
    var v = q.value.trim();
    if (v.length < 2) { list.hidden = true; return; }
    tmr = setTimeout(function () { chercher(v); }, 220);
  });
  q.addEventListener('keydown', function (e) {
    if (list.hidden) return;
    if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); marquer(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); marquer(); e.preventDefault(); }
    else if (e.key === 'Enter') { if (items[sel < 0 ? 0 : sel]) choisir(items[sel < 0 ? 0 : sel]); e.preventDefault(); }
    else if (e.key === 'Escape') { list.hidden = true; }
  });
  document.addEventListener('click', function (e) { if (!list.contains(e.target) && e.target !== q) list.hidden = true; });
  function marquer() { Array.prototype.forEach.call(list.children, function (li, i) { li.setAttribute('aria-selected', i === sel); }); }
  async function chercher(v) {
    var t = v.replace(/'/g, "''").replace(/\s+/g, ' ');
    var props = 'nom_officiel,code_insee,code_insee_du_departement,population';
    try {
      var d = await getJSON(url('ADMINEXPRESS-COG-CARTO.LATEST:commune', props, "nom_officiel ILIKE '" + t + "%'", '&COUNT=8&SORTBY=population%20D'));
      if (!d.features.length) d = await getJSON(url('ADMINEXPRESS-COG-CARTO.LATEST:commune', props, "nom_officiel ILIKE '%" + t + "%'", '&COUNT=8&SORTBY=population%20D'));
      if (q.value.trim() !== v) return;
      items = d.features.map(function (f) { return f.properties; });
      sel = -1;
      list.innerHTML = items.length ? items.map(function (p, i) {
        return '<li role="option" data-i="' + i + '"><span>' + esc(p.nom_officiel) + '</span><small>' + esc(p.code_insee_du_departement) + ' · ' + fmt(p.population || 0) + ' hab.</small></li>';
      }).join('') : '<li aria-disabled="true"><span>Aucune commune trouvée</span></li>';
      list.hidden = false;
      Array.prototype.forEach.call(list.querySelectorAll('li[data-i]'), function (li) {
        li.addEventListener('click', function () { choisir(items[+li.dataset.i]); });
      });
    } catch (e) { /* silencieux pendant la frappe */ }
  }
  function choisir(p) {
    list.hidden = true; q.value = p.nom_officiel;
    try { history.replaceState(null, '', '?commune=' + p.code_insee); } catch (e) {}
    analyser(p.code_insee);
  }

  /* ---------- géométrie ---------- */
  function rings(g) {
    if (!g) return [];
    if (g.type === 'Polygon') return [g.coordinates];
    if (g.type === 'MultiPolygon') return g.coordinates;
    return [];
  }
  function bboxOf(polys) {
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    polys.forEach(function (p) { p[0].forEach(function (c) {
      if (c[0] < b[0]) b[0] = c[0]; if (c[1] < b[1]) b[1] = c[1];
      if (c[0] > b[2]) b[2] = c[0]; if (c[1] > b[3]) b[3] = c[1];
    }); });
    return b;
  }

  async function analyser(code) {
    var id = ++run;
    res.hidden = false; out.hidden = true;
    var msg = function (t) { if (id === run) etat.textContent = t; };
    msg('Chargement du contour de la commune…');
    try {
      var cd = await getJSON(url('ADMINEXPRESS-COG-CARTO.LATEST:commune', 'geometrie,nom_officiel,code_insee,code_insee_du_departement,population', "code_insee='" + code.replace(/'/g, '') + "'", '&COUNT=1'));
      if (!cd.features.length) { msg('Commune introuvable.'); return; }
      var com = cd.features[0], P = com.properties, dep = P.code_insee_du_departement;
      var cpolys = rings(com.geometry), bb = bboxOf(cpolys);
      var lat0 = (bb[1] + bb[3]) / 2, lon0 = (bb[0] + bb[2]) / 2;
      var kx = Math.cos(lat0 * Math.PI / 180) * 111320, ky = 110574;
      var m = 300, dx = m / kx, dy = m / ky;
      var B = [bb[0] - dx, bb[1] - dy, bb[2] + dx, bb[3] + dy];
      var bbox = function (b, g) { return 'BBOX(' + (g || 'geometrie') + ',' + b.join(',') + ",'EPSG:4326')"; };
      var depCode = dep.length === 2 ? '0' + dep : dep;
      /* grille locale en mètres */
      var X = function (lon) { return (lon - lon0) * kx; }, Y = function (lat) { return (lat - lat0) * ky; };
      var x0 = X(B[0]), y1 = Y(B[3]), W = X(B[2]) - x0, H = y1 - Y(B[1]);
      var res_ = Math.max(10, Math.ceil(Math.sqrt(W * H / 9e6)));
      var nx = Math.ceil(W / res_), ny = Math.ceil(H / res_);
      var cv = document.createElement('canvas'); cv.width = nx; cv.height = ny;
      var ctx = cv.getContext('2d', { willReadFrequently: true });
      function raster(polys) {
        ctx.clearRect(0, 0, nx, ny); ctx.fillStyle = '#fff'; ctx.beginPath();
        polys.forEach(function (p) { p.forEach(function (ring) {
          ring.forEach(function (c, i) {
            var px = (X(c[0]) - x0) / res_, py = (y1 - Y(c[1])) / res_;
            if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
          }); ctx.closePath();
        }); });
        ctx.fill('evenodd');
        var d = ctx.getImageData(0, 0, nx, ny).data, a = new Uint8Array(nx * ny);
        for (var i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] > 127 ? 1 : 0;
        return a;
      }
      var mCom = raster(cpolys);

      /* bâtiments : dalles de 2 km qui touchent la commune (évite de charger les communes voisines) */
      var T = Math.max(1, Math.round(2000 / res_)), dalles = [];
      for (var ty = 0; ty < ny; ty += T) for (var tx = 0; tx < nx; tx += T) {
        var touche = false;
        for (var yy0 = ty; yy0 < Math.min(ny, ty + T) && !touche; yy0++) for (var xx0 = tx; xx0 < Math.min(nx, tx + T); xx0++) if (mCom[yy0 * nx + xx0]) { touche = true; break; }
        if (!touche) continue;
        var mx0 = x0 + tx * res_, mx1 = x0 + Math.min(nx, tx + T) * res_, my1 = y1 - ty * res_, my0 = y1 - Math.min(ny, ty + T) * res_;
        dalles.push([mx0 / kx + lon0, my0 / ky + lat0, mx1 / kx + lon0, my1 / ky + lat0].map(function (v) { return +v.toFixed(6); }));
      }
      var MAXB = 60000, vus = {}, bat = [], tropGrand = false, faites = 0;
      async function chargerDalles() {
        var i = 0;
        async function suivant() {
          while (i < dalles.length && !tropGrand) {
            var d = dalles[i++], r;
            try { r = await paged('BDTOPO_V3:batiment', 'geometrie', "usage_1='Résidentiel' AND " + bbox(d), 20000, 'cleabs'); }
            catch (e) { tropGrand = true; continue; }
            r.f.forEach(function (f) { if (!vus[f.id]) { vus[f.id] = 1; bat.push(f); } });
            if (r.plus || bat.length >= MAXB) tropGrand = true;
            faites++;
            if (dalles.length > 6) msg('Bâtiments : ' + fmt(bat.length) + ' chargés (' + Math.round(100 * faites / dalles.length) + ' %)…');
          }
        }
        await Promise.all([suivant(), suivant(), suivant(), suivant()]);
      }
      msg('Interrogation du zonage OLD, des bâtiments et des zones boisées (IGN)…' + ((P.population || 0) > 100000 ? ' Grande ville : le calcul peut prendre une à deux minutes.' : ''));
      var rs = await Promise.all([
        fetch(HITS + '&TYPENAMES=DEBROUSSAILLEMENT:debroussaillement&CQL_FILTER=' + encodeURIComponent("dept='" + depCode + "'")).then(function (r) { return r.text(); }),
        paged('DEBROUSSAILLEMENT:debroussaillement', 'geom,date_integ,dat_ap_old', bbox(B, 'geom'), 5000, 'id'),
        chargerDalles(),
        paged('BDTOPO_V3:zone_de_vegetation', 'geometrie,nature', "nature NOT IN ('Haie','Verger','Vigne','Peupleraie') AND " + bbox(B), 60000, 'cleabs')
      ]);
      if (id !== run) return;
      var depCouvert = +((rs[0].match(/numberMatched="(\d+)"/) || [0, 0])[1]) > 0;
      var zon = rs[1].f, veg = rs[3].f;
      msg('Calcul des distances…');
      await new Promise(function (r) { setTimeout(r, 30); });
      var zpolys = []; zon.forEach(function (f) { zpolys = zpolys.concat(rings(f.geometry)); });
      var mZon = zpolys.length ? raster(zpolys) : new Uint8Array(nx * ny);
      var vpolys = []; veg.forEach(function (f) { vpolys = vpolys.concat(rings(f.geometry)); });
      var mVeg = raster(vpolys);

      /* massifs d'au moins 4 ha d'un seul tenant */
      var N = nx * ny, lab = new Int32Array(N), qu = new Int32Array(N), minCells = Math.ceil(40000 / (res_ * res_));
      var mas = new Uint8Array(N);
      for (var s = 0; s < N; s++) {
        if (!mVeg[s] || lab[s]) continue;
        var h = 0, t = 0; qu[t++] = s; lab[s] = 1;
        while (h < t) {
          var c = qu[h++], cx = c % nx;
          if (cx > 0 && mVeg[c - 1] && !lab[c - 1]) { lab[c - 1] = 1; qu[t++] = c - 1; }
          if (cx < nx - 1 && mVeg[c + 1] && !lab[c + 1]) { lab[c + 1] = 1; qu[t++] = c + 1; }
          if (c >= nx && mVeg[c - nx] && !lab[c - nx]) { lab[c - nx] = 1; qu[t++] = c - nx; }
          if (c < N - nx && mVeg[c + nx] && !lab[c + nx]) { lab[c + nx] = 1; qu[t++] = c + nx; }
        }
        if (t >= minCells) for (var k = 0; k < t; k++) mas[qu[k]] = 1;
      }
      /* distance au massif (chanfrein 3-4, en mètres) */
      var INF = 1e9, D = new Float32Array(N);
      for (var i = 0; i < N; i++) D[i] = mas[i] ? 0 : INF;
      for (var yy = 0; yy < ny; yy++) for (var xx = 0; xx < nx; xx++) {
        var j = yy * nx + xx, v = D[j];
        if (xx > 0) v = Math.min(v, D[j - 1] + 3);
        if (yy > 0) { v = Math.min(v, D[j - nx] + 3); if (xx > 0) v = Math.min(v, D[j - nx - 1] + 4); if (xx < nx - 1) v = Math.min(v, D[j - nx + 1] + 4); }
        D[j] = v;
      }
      for (yy = ny - 1; yy >= 0; yy--) for (xx = nx - 1; xx >= 0; xx--) {
        j = yy * nx + xx; v = D[j];
        if (xx < nx - 1) v = Math.min(v, D[j + 1] + 3);
        if (yy < ny - 1) { v = Math.min(v, D[j + nx] + 3); if (xx < nx - 1) v = Math.min(v, D[j + nx + 1] + 4); if (xx > 0) v = Math.min(v, D[j + nx - 1] + 4); }
        D[j] = v;
      }

      /* bâtiments */
      var n = 0, nOld = 0, n50 = 0, n200 = 0, pts = [];
      bat.forEach(function (f) {
        var r = rings(f.geometry)[0]; if (!r) return; r = r[0];
        var sx = 0, sy = 0, A = 0, L = r.length - 1;
        for (var i = 0; i < L; i++) {
          var ax = X(r[i][0]), ay = Y(r[i][1]), bx = X(r[i + 1][0]), by = Y(r[i + 1][1]);
          A += ax * by - bx * ay; sx += ax; sy += ay;
        }
        if (Math.abs(A) / 2 < 20 || L < 3) return;
        var cxm = sx / L, cym = sy / L;
        var gx = Math.floor((cxm - x0) / res_), gy = Math.floor((y1 - cym) / res_);
        if (gx < 0 || gy < 0 || gx >= nx || gy >= ny) return;
        var g = gy * nx + gx; if (!mCom[g]) return;
        n++;
        var d = D[g] * res_ / 3, cat = 0;
        if (mZon[g]) { nOld++; cat = 1; }
        else if (d <= 50) { n50++; cat = 2; }
        else if (d <= 200) { n200++; cat = 3; }
        if (cat) pts.push([cym / ky + lat0, cxm / kx + lon0, cat]);
      });
      var zonCom = 0; for (i = 0; i < N; i++) if (mZon[i] && mCom[i]) zonCom++;
      var haZon = Math.round(zonCom * res_ * res_ / 1e4);
      var dates = {}, aps = {};
      zon.forEach(function (f) { var q = f.properties || {}; if (q.date_integ) dates[q.date_integ] = 1; if (q.dat_ap_old) aps[q.dat_ap_old] = 1; });
      afficher({ dates: Object.keys(dates), aps: Object.keys(aps), P: P, depCouvert: depCouvert, n: n, nOld: nOld, n50: n50, n200: n200, haZon: haZon, pts: pts, cpolys: cpolys, zon: zon, trop: tropGrand });
      etat.textContent = '';
    } catch (e) {
      if (id === run) msg("Le service de l'IGN ne répond pas pour le moment. Réessayez dans quelques instants.");
    }
  }

  function afficher(r) {
    out.hidden = false;
    var nom = esc(r.P.nom_officiel);
    $('vo-titre').textContent = r.P.nom_officiel + ' (' + r.P.code_insee_du_departement + ')';
    var v, suite;
    var demande = '/collectivites/demande/?commune=' + encodeURIComponent(r.P.nom_officiel);
    if (r.nOld > 0 || r.haZon > 0) {
      v = '<b class="oui">Oui.</b> Une partie de la commune est dans le zonage des obligations légales de débroussaillement (' + fmt(r.haZon) + ' ha). ' +
        fmt(r.nOld) + ' bâtiment' + (r.nOld > 1 ? 's' : '') + " d'habitation s'y trouve" + (r.nOld > 1 ? 'nt' : '') + '.';
      suite = '<p><b>Ce que cela implique :</b> les propriétaires de ces bâtiments doivent débroussailler dans les conditions de l\'arrêté préfectoral, et le maire contrôle l\'exécution.</p>' +
        '<p>VB Safety estime à distance l\'état de chaque terrain (végétation dense, arbres proches des façades), établit l\'ordre des contrôles et prépare les courriers. Le projet est éligible au Fonds vert (mesure de vérification des OLD).</p>' +
        '<a class="btn btn-p" href="' + demande + '">Recevoir le diagnostic détaillé de ' + nom + ' <span aria-hidden="true">→</span></a>';
    } else if (r.depCouvert) {
      v = '<b class="non">Non, selon le zonage officiel.</b> Aucun secteur de la commune n\'est dans le zonage OLD.';
      suite = (r.n50 + r.n200 > 0 ?
        '<p>Aucune obligation légale de débroussaillement ne s\'applique. En revanche, <b>' + fmt(r.n50 + r.n200) + ' bâtiment' + (r.n50 + r.n200 > 1 ? 's' : '') + ' d\'habitation</b> se trouve' + (r.n50 + r.n200 > 1 ? 'nt' : '') + ' à moins de 200 m d\'un bois d\'au moins 4 ha, dont ' + fmt(r.n50) + ' à moins de 50 m. Une information préventive des habitants concernés peut être utile.</p>' :
        '<p>Aucune obligation légale de débroussaillement ne s\'applique, et peu de bâtiments d\'habitation sont proches d\'un bois.</p>') +
        '<a class="btn btn-p" href="' + demande + '">Échanger sur le risque feu à ' + nom + ' <span aria-hidden="true">→</span></a>';
    } else {
      v = '<b class="nc">Non vérifiable ici.</b> Le département n\'est pas encore intégré à la base nationale du zonage OLD. Consultez l\'arrêté préfectoral ou la DDT.';
      suite = '<p>' + fmt(r.n50 + r.n200) + ' bâtiment' + (r.n50 + r.n200 > 1 ? 's' : '') + ' d\'habitation se trouve' + (r.n50 + r.n200 > 1 ? 'nt' : '') + ' à moins de 200 m d\'un bois d\'au moins 4 ha, dont ' + fmt(r.n50) + ' à moins de 50 m.</p>' +
        '<a class="btn btn-p" href="' + demande + '">Faire le point pour ' + nom + ' <span aria-hidden="true">→</span></a>';
    }
    if (r.nOld > 0 || r.haZon > 0) {
      var src = [];
      if (r.aps.length) src.push('arrêté préfectoral du ' + r.aps.map(esc).join(', '));
      if (r.dates.length) src.push('zonage intégré par l\'IGN le ' + r.dates.map(esc).join(', '));
      if (src.length) v += ' <span style="color:var(--faible);font-size:.85em">(' + src.join(' ; ') + ')</span>';
    }
    if (r.trop) v += ' <span style="color:var(--faible)">(Commune très étendue : comptage partiel (plus de 60 000 bâtiments d\'habitation ou service IGN saturé). Les chiffres sont des minimums.)</span>';
    $('vo-verdict').innerHTML = v;
    $('vo-chiffres').innerHTML =
      '<div class="vo-c"><b>' + fmt(r.n) + '</b><span>bâtiments d\'habitation dans la commune</span></div>' +
      '<div class="vo-c c1"><b>' + fmt(r.nOld) + '</b><span>dans le zonage OLD</span></div>' +
      '<div class="vo-c c2"><b>' + fmt(r.n50) + '</b><span>hors zonage, à moins de 50 m d\'un bois</span></div>' +
      '<div class="vo-c c3"><b>' + fmt(r.n200) + '</b><span>hors zonage, entre 50 et 200 m d\'un bois</span></div>';
    $('vo-suite').innerHTML = suite + ' <button type="button" class="vo-lien" id="vo-lien">Copier le lien de ce résultat</button>';
    $('vo-lien').addEventListener('click', function () {
      var b = this, u = location.origin + location.pathname + '?commune=' + r.P.code_insee;
      var ok = function () { b.textContent = 'Lien copié'; setTimeout(function () { b.textContent = 'Copier le lien de ce résultat'; }, 2000); };
      if (navigator.clipboard) navigator.clipboard.writeText(u).then(ok, function () { b.textContent = u; }); else b.textContent = u;
    });
    dessiner(r);
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function dessiner(r) {
    if (!window.L) return;
    if (!map) {
      map = L.map('vo-map', { preferCanvas: true, scrollWheelZoom: false });
      L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png',
        { maxZoom: 19, attribution: 'IGN – Géoplateforme · BD TOPO, zonage DÉBROUSSAILLEMENT, Admin Express · Licence Ouverte Etalab 2.0' }).addTo(map);
    }
    couches.forEach(function (c) { map.removeLayer(c); }); couches = [];
    var com = L.geoJSON({ type: 'MultiPolygon', coordinates: r.cpolys }, { style: { color: '#16293F', weight: 2.5, fill: false, dashArray: '7 5' } }).addTo(map);
    couches.push(com);
    if (r.zon.length) couches.push(L.geoJSON({ type: 'FeatureCollection', features: r.zon }, { style: { color: '#E5484D', weight: 1, fillColor: '#E5484D', fillOpacity: .18 } }).addTo(map));
    var col = { 1: '#E5484D', 2: '#F59E0B', 3: '#EAD15A' }, rd = L.canvas();
    var g = L.layerGroup();
    r.pts.forEach(function (p) { L.circleMarker([p[0], p[1]], { renderer: rd, radius: 3, stroke: false, fillColor: col[p[2]], fillOpacity: .95 }).addTo(g); });
    g.addTo(map); couches.push(g);
    setTimeout(function () { map.invalidateSize(); map.fitBounds(com.getBounds(), { padding: [10, 10] }); }, 50);
  }

  var init = new URLSearchParams(location.search).get('commune');
  if (init && /^[0-9AB]{5}$/.test(init)) { window.addEventListener('load', function () { analyser(init); }); }
})();
