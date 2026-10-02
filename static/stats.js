// VB Safety · tableau de bord privé des visites. Lit uniquement des totaux sur notre serveur, avec un code d'accès.
(function () {
  var API = 'https://api.vb-safety.com/api/vbs/stats', KEY = 'vbs-stats-token';
  var $ = function (id) { return document.getElementById(id); };
  var porte = $('st-porte'), tdb = $('st-tdb'), err = $('st-err'), sel = $('st-jours');
  var token = ''; try { token = localStorage.getItem(KEY) || ''; } catch (e) {}
  var nf = new Intl.NumberFormat('fr-FR');
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function jourFr(iso) { var p = iso.split('-'); return p[2] + '/' + p[1]; }
  var TZ = { 'Europe/Paris': 'France', 'Europe/Berlin': 'Allemagne', 'Europe/Brussels': 'Belgique', 'Europe/Zurich': 'Suisse', 'Europe/Luxembourg': 'Luxembourg', 'Europe/London': 'Royaume-Uni', 'Europe/Madrid': 'Espagne', 'Europe/Rome': 'Italie', 'Europe/Amsterdam': 'Pays-Bas', 'Europe/Lisbon': 'Portugal', 'Europe/Vienna': 'Autriche', 'Europe/Dublin': 'Irlande', 'America/Montreal': 'Canada (Québec)', 'America/Toronto': 'Canada', 'America/New_York': 'États-Unis (Est)', 'America/Los_Angeles': 'États-Unis (Ouest)', 'America/Chicago': 'États-Unis (Centre)', 'Africa/Casablanca': 'Maroc', 'Africa/Tunis': 'Tunisie', 'Africa/Algiers': 'Algérie', 'Asia/Seoul': 'Corée du Sud', 'Indian/Reunion': 'La Réunion', 'America/Martinique': 'Martinique', 'America/Guadeloupe': 'Guadeloupe' };
  var LIB = { 'clic:outil-duerp': 'Clic vers l\'outil DUERP', 'clic:demo-pompier': 'Clic vers la démo sapeur-pompier', 'clic:devis': 'Clic vers la page devis', 'clic:telechargement': 'Téléchargement d\'un modèle', 'clic:email': 'Clic sur l\'adresse e-mail', 'clic:contact': 'Clic vers le formulaire de contact', 'envoi:devis': 'Demande de devis envoyée',
    devis: 'Démonstration ou devis', acces: 'Code d\'accès à la démo', version: 'Version pour un SDIS', contact: 'Contact et alertes', telephone: 'Téléphone', tablette: 'Tablette', ordinateur: 'Ordinateur', fr: 'Français', en: 'Anglais' };

  function table(id, rows, opts) {
    opts = opts || {};
    var el = $(id), max = rows.reduce(function (m, r) { return Math.max(m, r.n); }, 0);
    if (!rows.length) { el.innerHTML = '<p class="st-vide">Rien sur la période.</p>'; return; }
    el.innerHTML = '<table class="st-t"><thead><tr><th scope="col">' + esc(opts.col || '') + '</th><th scope="col" class="num">' + esc(opts.n || 'Vues') + '</th>' + (opts.sansV ? '' : '<th scope="col" class="num">Visiteurs</th>') + '</tr></thead><tbody>' +
      rows.map(function (r) {
        var nom = opts.nom ? opts.nom(r.cle) : (LIB[r.cle] || r.cle || '—');
        return '<tr><td><span class="st-barre" style="width:' + (max ? Math.max(2, Math.round(r.n / max * 100)) : 0) + '%"></span><span class="st-nom">' + esc(nom) + '</span></td><td class="num">' + nf.format(r.n) + '</td>' + (opts.sansV ? '' : '<td class="num">' + nf.format(r.v) + '</td>') + '</tr>';
      }).join('') + '</tbody></table>';
  }

  function graphe(d) {
    // Une barre par jour (visiteurs), jours sans visite compris
    var map = {}; d.parJour.forEach(function (r) { map[r.jour] = r; });
    var jours = [], t = new Date(d.depuis + 'T12:00:00Z'), fin = new Date(); fin.setUTCHours(12, 0, 0, 0);
    while (t <= fin && jours.length < 400) { var k = t.toISOString().slice(0, 10); jours.push(map[k] || { jour: k, n: 0, v: 0 }); t = new Date(t.getTime() + 86400000); }
    var W = 960, H = 240, L = 36, B = 26, T = 10, iw = W - L - 8, ih = H - B - T;
    var max = Math.max(4, jours.reduce(function (m, r) { return Math.max(m, r.v); }, 0)), pas = iw / jours.length, gap = pas >= 8 ? 2 : pas >= 4 ? 1 : 0, bw = Math.max(1, pas - gap);
    var ticks = [0, Math.round(max / 2), max];
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Visiteurs par jour sur ' + jours.length + ' jours">';
    ticks.forEach(function (v) { var y = T + ih - v / max * ih; svg += '<line class="st-grille" x1="' + L + '" x2="' + (W - 8) + '" y1="' + y + '" y2="' + y + '"/><text class="st-axe" x="' + (L - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + v + '</text>'; });
    jours.forEach(function (r, i) {
      var h = r.v / max * ih, x = L + i * pas + gap / 2, y = T + ih - h, rr = Math.min(4, bw / 2, h);
      if (h > 0) svg += '<path class="st-b" d="M' + x + ' ' + (T + ih) + 'V' + (y + rr) + 'q0 -' + rr + ' ' + rr + ' -' + rr + 'h' + (bw - 2 * rr) + 'q' + rr + ' 0 ' + rr + ' ' + rr + 'V' + (T + ih) + 'z"/>';
      svg += '<rect class="st-zone" data-i="' + i + '" x="' + (L + i * pas) + '" y="' + T + '" width="' + pas + '" height="' + ih + '"/>';
    });
    [0, Math.floor((jours.length - 1) / 2), jours.length - 1].filter(function (v, i, a) { return a.indexOf(v) === i; }).forEach(function (i) {
      svg += '<text class="st-axe" x="' + (L + i * pas + pas / 2) + '" y="' + (H - 6) + '" text-anchor="' + (i === 0 ? 'start' : i === jours.length - 1 ? 'end' : 'middle') + '">' + jourFr(jours[i].jour) + '</text>';
    });
    var box = $('st-graphe'); box.innerHTML = svg + '</svg><div class="st-bulle" id="st-bulle" hidden></div>';
    var bulle = $('st-bulle');
    box.querySelectorAll('.st-zone').forEach(function (z) {
      z.addEventListener('pointerenter', function () {
        var r = jours[+z.dataset.i], bb = box.getBoundingClientRect(), zb = z.getBoundingClientRect();
        bulle.innerHTML = '<b>' + jourFr(r.jour) + '</b>' + nf.format(r.v) + ' visiteur' + (r.v > 1 ? 's' : '') + ' · ' + nf.format(r.n) + ' page' + (r.n > 1 ? 's' : '') + ' vue' + (r.n > 1 ? 's' : '');
        bulle.hidden = false;
        bulle.style.left = Math.min(Math.max(zb.left - bb.left + zb.width / 2, 80), bb.width - 80) + 'px';
      });
    });
    box.addEventListener('pointerleave', function () { bulle.hidden = true; });
  }

  function afficher(d) {
    var somme = function (a) { return a.reduce(function (s, r) { return s + r.n; }, 0); };
    $('st-k-visiteurs').textContent = nf.format(d.visiteurs);
    $('st-k-vues').textContent = nf.format(d.vues);
    $('st-k-demandes').textContent = nf.format(somme(d.demandes));
    $('st-k-clics').textContent = nf.format(somme(d.clics));
    $('st-periode').textContent = 'Du ' + jourFr(d.depuis) + ' à aujourd\'hui · visiteurs comptés une fois par jour';
    graphe(d);
    table('st-pages', d.pages, { col: 'Page' });
    table('st-sources', d.sources, { col: 'Provenance' });
    table('st-fuseaux', d.fuseaux, { col: 'Fuseau horaire (pays approximatif)', nom: function (k) { return k ? (TZ[k] ? TZ[k] + ' · ' + k : k) : 'Inconnu'; } });
    table('st-appareils', d.appareils, { col: 'Appareil' });
    table('st-clics', d.clics, { col: 'Action', n: 'Nombre' });
    table('st-demandes', d.demandes, { col: 'Type de demande', n: 'Nombre', sansV: true });
  }

  async function charger() {
    err.hidden = true;
    try {
      var r = await fetch(API + '?jours=' + encodeURIComponent(sel.value), { headers: { 'X-Stats-Token': token }, credentials: 'omit', cache: 'no-store' });
      if (r.status === 403) { token = ''; try { localStorage.removeItem(KEY); } catch (e) {} throw new Error('Code d\'accès refusé.'); }
      if (!r.ok) throw new Error('Le serveur a répondu ' + r.status + '.');
      afficher(await r.json());
      porte.hidden = true; tdb.hidden = false;
    } catch (e) {
      tdb.hidden = true; porte.hidden = false;
      err.textContent = /Failed|Network|fetch/i.test(String(e.message)) ? 'Le serveur ne répond pas. Vérifiez que la mise à jour serveur a été lancée.' : e.message;
      err.hidden = false;
    }
  }
  $('st-form').addEventListener('submit', function (e) {
    e.preventDefault(); token = $('st-code').value.trim(); if (!token) return;
    try { localStorage.setItem(KEY, token); } catch (x) {}
    $('st-code').value = ''; charger();
  });
  sel.addEventListener('change', charger);
  $('st-oublier').addEventListener('click', function () { token = ''; try { localStorage.removeItem(KEY); } catch (e) {} tdb.hidden = true; porte.hidden = false; });
  var moi = $('st-moi');
  try { moi.checked = !!localStorage.getItem('vbs-no-stats'); } catch (e) {}
  moi.addEventListener('change', function () { try { moi.checked ? localStorage.setItem('vbs-no-stats', '1') : localStorage.removeItem('vbs-no-stats'); } catch (e) {} });
  if (token) charger();
})();
