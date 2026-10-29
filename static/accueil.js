// VB Safety · page d'accueil : défilement, formulaire de contact, fond animé.
(function () {
  // Anciennes adresses de la page d'accueil (#mentions-legales, démo…) : redirection vers les vraies pages
  var OLD = { 'mentions-legales': '/mentions-legales/', confidentialite: '/confidentialite/', pompiers: '/cmr-pompier/', acces: '/cmr-pompier/connexion.html', espace: '/cmr-pompier/',
    'acces-btp': '/cmr-industrie/', 'btp-expositions': '/cmr-industrie/', 'btp-fiches': '/cmr-industrie/' };
  var h = decodeURIComponent(location.hash.slice(1));
  if (OLD[h]) { location.replace(OLD[h]); return; }

  var EN = document.documentElement.lang === 'en';
  var M = EN ? { invalid: 'Please fill in the required fields and accept the privacy policy.', sending: 'Sending…', ok: 'Message sent. Thank you, we will get back to you quickly.', fallback: 'Opening your email app…', submit: 'Send message', subject: 'Website contact · ' }
            : { invalid: "Merci de compléter les champs obligatoires et d'accepter la politique de confidentialité.", sending: 'Envoi en cours…', ok: 'Message envoyé. Merci, nous revenons vers vous rapidement.', fallback: 'Ouverture de votre messagerie…', submit: 'Envoyer le message', subject: 'Contact site · ' };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-goto]'); if (!a) return;
    var el = document.getElementById(a.getAttribute('data-goto')); if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', '#' + el.id);
  });

  // Téléphone : menu repliable, blocs détaillés repliés (le contenu reste dans la page)
  var L = EN ? { more: 'See details', less: 'Hide details', who: 'Who is VB Safety?' } : { more: 'Voir le détail', less: 'Masquer le détail', who: 'Qui est VB Safety ?' };
  var haut = document.querySelector('.haut'), mb = document.getElementById('menu-btn');
  if (haut && mb) {
    mb.hidden = false; haut.classList.add('has-menu');
    var setMenu = function (o) { haut.classList.toggle('open', o); mb.setAttribute('aria-expanded', o ? 'true' : 'false'); };
    // Téléphone : un toucher hors du panneau le referme
    document.addEventListener('click', function (e) { if (haut.classList.contains('open') && !e.target.closest('.haut-nav') && !e.target.closest('#menu-btn')) setMenu(false); });
    mb.addEventListener('click', function () { setMenu(!haut.classList.contains('open')); });
    haut.querySelector('.haut-nav').addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }
  var nPlie = 0;
  function plier(el, anchor, where, more, less) {
    if (!el) return;
    var b = document.createElement('button'), id = el.id || ('plie-' + (++nPlie));
    el.id = id; el.classList.add('plie');
    b.type = 'button'; b.className = 'plie-btn'; b.textContent = more; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', id);
    b.addEventListener('click', function () { var o = el.classList.toggle('ouvert'); b.setAttribute('aria-expanded', o ? 'true' : 'false'); b.textContent = o ? less : more; });
    anchor.insertAdjacentElement(where, b);
  }
  document.querySelectorAll('.dive').forEach(function (d) { var body = d.querySelector('.dive-body'), hd = d.querySelector('.dive-head'); if (body && hd) plier(body, hd, 'beforeend', L.more, L.less); });
  var qui = document.querySelector('p.qui'); if (qui) plier(qui, qui, 'beforebegin', L.who, L.who);
  var mqTel = window.matchMedia('(max-width: 700px)');
  function replierDefs() {
    if (!mqTel.matches) return;
    document.querySelectorAll('.def:not(.repli)').forEach(function (d, i) {
      var dt = d.querySelector('dt'), dd = d.querySelector('dd'); if (!dt || !dd) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'def-btn'; b.setAttribute('aria-expanded', 'false');
      dd.id = dd.id || 'def-' + i; b.setAttribute('aria-controls', dd.id);
      while (dt.firstChild) b.appendChild(dt.firstChild); dt.appendChild(b); d.classList.add('repli');
      b.addEventListener('click', function () { b.setAttribute('aria-expanded', d.classList.toggle('ouvert') ? 'true' : 'false'); });
    });
  }
  replierDefs(); if (mqTel.addEventListener) mqTel.addEventListener('change', replierDefs);

  // Téléphone (V13) : choix du métier, rails de cartes, barre d'action fixe
  (function () {
    var T = EN ? { metiers: ['Firefighters', 'Industry', 'Construction'], seg: 'Choose your sector', acces: 'Request a demo', outils: 'Tools', carte: 'Card ' }
               : { metiers: ['Pompiers', 'Industrie', 'BTP'], seg: 'Choisir votre métier', acces: 'Demander une démo', outils: 'Outils', carte: 'Carte ' };
    var smooth = reduce ? 'auto' : 'smooth';
    function rail(track) {
      track.classList.add('rail');
      var items = Array.prototype.slice.call(track.children), dots = document.createElement('div'), listeners = [];
      dots.className = 'rail-dots';
      items.forEach(function (it, i) {
        var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', T.carte + (i + 1) + '/' + items.length);
        b.addEventListener('click', function () { go(i); }); dots.appendChild(b);
      });
      track.insertAdjacentElement('afterend', dots);
      function go(i) { track.scrollTo({ left: items[i].offsetLeft - items[0].offsetLeft, behavior: smooth }); }
      function current() {
        var x = track.scrollLeft, best = 0, d = Infinity;
        items.forEach(function (it, i) { var dd = Math.abs(it.offsetLeft - items[0].offsetLeft - x); if (dd < d) { d = dd; best = i; } });
        return best;
      }
      var last = -1, raf = 0;
      function maj() { raf = 0; var c = current(); if (c === last) return; last = c;
        Array.prototype.forEach.call(dots.children, function (b, i) { b.setAttribute('aria-current', i === c ? 'true' : 'false'); });
        listeners.forEach(function (f) { f(c); }); }
      track.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(maj); }, { passive: true });
      maj();
      return { go: go, items: items, onChange: function (f) { listeners.push(f); f(last); } };
    }
    var pillars = document.querySelector('.pillars'); if (pillars) rail(pillars);
    var dives = document.querySelector('.dives'), r = dives && rail(dives);
    if (r) {
      var seg = document.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'tablist'); seg.setAttribute('aria-label', T.seg);
      r.items.forEach(function (d, i) {
        d.id = d.id || ['outil-pompiers', 'outil-industrie', 'outil-btp'][i];
        var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', d.id);
        b.textContent = T.metiers[i] || ('' + (i + 1));
        b.addEventListener('click', function () { r.go(i); }); seg.appendChild(b);
      });
      dives.insertAdjacentElement('beforebegin', seg); window.vbOutil = r.go;
      r.onChange(function (c) { Array.prototype.forEach.call(seg.children, function (b, i) { b.setAttribute('aria-selected', i === c ? 'true' : 'false'); }); });
    }
    // Barre fixe : visible après le premier écran, masquée sur le formulaire de contact
    var scene = document.querySelector('.scene'), contact = document.getElementById('contact');
    if (scene && contact && 'IntersectionObserver' in window) {
      var bar = document.createElement('div'); bar.className = 'barre-action';
      bar.innerHTML = '<a class="principal" href="#contact" data-goto="contact"></a>';
      bar.firstChild.textContent = T.acces;
      document.body.appendChild(bar); document.body.classList.add('a-barre');
      var horsScene = false, surContact = false;
      function etat() { var v = horsScene && !surContact; bar.classList.toggle('visible', v); bar.setAttribute('aria-hidden', v ? 'false' : 'true');
        Array.prototype.forEach.call(bar.children, function (a) { a.tabIndex = v ? 0 : -1; }); }
      new IntersectionObserver(function (e) { horsScene = !e[0].isIntersecting; etat(); }, { rootMargin: '-35% 0px 0px 0px' }).observe(scene);
      // masquée aussi quand le bouton « Demander une démo » de la section « Pensé pour votre façon de travailler » est à l'écran
      var vus = 0, usage = document.querySelector('#usage .usage-cta');
      var obs = new IntersectionObserver(function (es) { es.forEach(function (e) { vus += e.isIntersecting ? (e.target._v ? 0 : 1) : (e.target._v ? -1 : 0); e.target._v = e.isIntersecting; }); surContact = vus > 0; etat(); }, { threshold: 0.05 });
      obs.observe(contact); if (usage) obs.observe(usage);
      etat();
    }
  })();

  // Ordinateur : « Notre approche » reste à l'écran pendant le défilement ; les trois blocs apparaissent l'un après l'autre
  (function () {
    var sec = document.getElementById('approche'), blocs = sec && sec.querySelectorAll('.pillars > .pillar'); if (!blocs || !blocs.length) return;
    var mq = window.matchMedia('(min-width: 1100px) and (min-height: 700px)'), actif = false, raf = 0;
    function maj() {
      raf = 0; if (!actif) return;
      var r = sec.getBoundingClientRect(), course = sec.offsetHeight - window.innerHeight;
      var p = course > 0 ? Math.min(1, Math.max(0, -r.top / course)) : 1;
      Array.prototype.forEach.call(blocs, function (b, i) { b.classList.toggle('vu', p >= 0.06 + i * 0.26); });
      sec.style.setProperty('--avance', p.toFixed(3));
    }
    function regler() {
      actif = mq.matches && !reduce;
      sec.classList.toggle('epingle', actif);
      if (!actif) { Array.prototype.forEach.call(blocs, function (b) { b.classList.remove('vu'); }); sec.style.removeProperty('--avance'); }
      maj();
    }
    window.addEventListener('scroll', function () { if (actif && !raf) raf = requestAnimationFrame(maj); }, { passive: true });
    window.addEventListener('resize', function () { if (!raf) raf = requestAnimationFrame(maj); });
    if (mq.addEventListener) mq.addEventListener('change', regler);
    regler();
  })();

  // Ordinateur : un onglet par métier au-dessus des cartes « Outils » ; une seule carte affichée à la fois
  (function () {
    var dives = document.querySelector('.dives'); if (!dives) return;
    var cartes = Array.prototype.filter.call(dives.children, function (d) { return d.classList.contains('dive'); }); if (cartes.length < 2) return;
    var noms = EN ? ['Firefighters', 'Industry', 'Construction'] : ['Sapeurs-pompiers', 'Industrie', 'BTP'];
    var tabs = document.createElement('div'); tabs.className = 'metiers'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', EN ? 'Choose your sector' : 'Choisir votre métier');
    var boutons = cartes.map(function (d, i) {
      d.id = d.id || ['outil-pompiers', 'outil-industrie', 'outil-btp'][i];
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', d.id); b.id = 'onglet-' + d.id;
      var n = document.createElement('span'); n.className = 'n'; n.textContent = '0' + (i + 1); b.appendChild(n);
      b.appendChild(document.createTextNode(noms[i] || ('' + (i + 1))));
      b.addEventListener('click', function () { choisir(i); });
      b.addEventListener('keydown', function (e) {
        var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!k) return;
        e.preventDefault(); var j = (i + k + cartes.length) % cartes.length; choisir(j); boutons[j].focus();
      });
      tabs.appendChild(b); return b;
    });
    dives.insertAdjacentElement('beforebegin', tabs); dives.classList.add('choix');
    function choisir(i) {
      cartes.forEach(function (d, k) { d.classList.toggle('choisie', k === i); });
      boutons.forEach(function (b, k) { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); b.tabIndex = k === i ? 0 : -1; });
    }
    choisir(0);
    window.vbChoisirOrdi = function (i) { choisir(i); tabs.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); };
  })();

  // Premier écran : le bouton principal fait défiler « Capteurs et innovation » puis « Suivi CMR [métier] » ; il mène à la page Innovation ou à la carte du métier ; le fond suit
  (function () {
    var btn = document.querySelector('.scene .btn-hero.primary'), note = document.querySelector('.scene .note'); if (!btn) return;
    // [mode des particules, début, mot en gras, index de la carte dans « Outils » ou adresse]
    var M = EN ? [[null, '', 'Sensors & innovation', '/en/innovation/'], ['pompiers', 'CMR tracking: ', 'firefighters', 0], ['industrie', 'CMR tracking: ', 'industry', 1], ['btp', 'CMR tracking: ', 'construction', 2]]
               : [[null, '', 'Capteurs et innovation', '/innovation/'], ['pompiers', 'Suivi CMR ', 'sapeurs-pompiers', 0], ['industrie', 'Suivi CMR ', 'industrie', 1], ['btp', 'Suivi CMR ', 'BTP', 2]];
    var lib = btn.firstElementChild;
    var tel = document.createElement('span'); tel.className = 'cta-tel'; tel.setAttribute('aria-hidden', 'true');
    var pile = document.createElement('span'); pile.className = 'nm-pile';
    var mots = M.map(function (m) {
      var w = document.createElement('span'); w.className = 'note-metier';
      if (m[1]) { var d = document.createElement('span'); d.className = 'nm-debut'; d.textContent = m[1]; w.appendChild(d); }
      var b = document.createElement('b'); b.textContent = m[2]; w.appendChild(b);
      pile.appendChild(w); return w;
    });
    tel.appendChild(pile); lib.insertAdjacentElement('afterend', tel); lib.classList.add('cta-ordi');
    function sync() { if (note) note.classList.toggle('vb-sr', mqTel.matches); }
    var i = 0;
    function montrer(k, prec) {
      if (prec != null) { var o = mots[prec]; o.classList.remove('actif'); o.classList.add('sort'); setTimeout(function () { o.classList.remove('sort'); }, 650); }
      mots[k].classList.add('actif'); window.vbMode = M[k][0];
      btn.setAttribute('aria-label', M[k][1] + M[k][2]);
    }
    montrer(0); sync(); if (mqTel.addEventListener) mqTel.addEventListener('change', sync);
    // Le clic ouvre la page Innovation, ou directement la carte du métier affiché
    btn.addEventListener('click', function (e) {
      var c = M[i][3];
      if (typeof c === 'string') { e.preventDefault(); e.stopPropagation(); location.href = c; return; }
      if (mqTel.matches) { if (window.vbOutil) setTimeout(function () { window.vbOutil(c); }, reduce ? 0 : 450); return; }
      // Ordinateur : on ouvre l'onglet du métier et on descend jusqu'aux onglets
      if (window.vbChoisirOrdi) { e.preventDefault(); e.stopPropagation(); window.vbChoisirOrdi(c); return; }
      var d = document.querySelectorAll('.dives > .dive')[c]; if (!d) return;
      e.preventDefault(); e.stopPropagation(); d.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }, true);
    if (reduce) { window.vbMode = null; return; }
    var scene = document.querySelector('.scene'), visible = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(scene);
    setInterval(function () {
      if (!visible || document.hidden) return;
      var p = i; i = (i + 1) % M.length; montrer(i, p);
    }, 2400);
  })();

  // Formulaire de contact (Web3Forms ; si l'envoi échoue, ouverture de la messagerie)
  var ENDPOINT = 'https://api.web3forms.com/submit', KEY = '0752cc8d-b82f-4ae5-ab72-50183aee5216', MAIL = 'contact@vb-safety.com';
  var form = document.getElementById('contact-form');
  if (form) form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = document.getElementById('cf-submit'), msg = document.getElementById('cf-msg');
    if (form.elements.botcheck.value) return;
    if (!form.checkValidity()) {
      msg.className = 'cf-msg full warn'; msg.textContent = M.invalid; msg.hidden = false;
      var first = form.querySelector(':invalid'); if (first) first.focus();
      return;
    }
    var data = new FormData(form), subject = M.subject + data.get('organisation');
    var payload = { access_key: KEY, from_name: 'Site VB Safety', subject: subject };
    data.forEach(function (v, k) { payload[k] = v; });
    if (payload.email) payload.replyto = payload.email;
    btn.disabled = true; btn.firstElementChild.textContent = M.sending; msg.hidden = true;
    try {
      var r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok || !j.success) throw new Error(j.message || 'HTTP ' + r.status);
      msg.className = 'cf-msg full ok'; msg.textContent = M.ok; msg.hidden = false;
      form.reset();
    } catch (err) {
      msg.className = 'cf-msg full warn'; msg.textContent = M.fallback; msg.hidden = false;
      var body = data.get('message') + '\n\n—\n' + data.get('nom') + '\n' + data.get('organisation') + '\n' + data.get('email') + '\nProfil : ' + data.get('profil');
      setTimeout(function () { location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body); }, 600);
    } finally {
      btn.disabled = false; btn.firstElementChild.textContent = M.submit;
    }
  });

  // Fond : particules (désactivées si l'utilisateur limite les animations)
  var canvas = document.getElementById('particles-canvas'); if (!canvas) return;
  var ctx = canvas.getContext('2d'), width = 0, height = 0, particles = [];
  function resize(force) {
    var w = window.innerWidth, hh = window.innerHeight;
    if (!force && w === width && Math.abs(hh - height) < 160) return;
    width = w; height = hh;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr; canvas.height = hh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var tel = w <= 700, n = tel ? 26 : Math.round(Math.min(60, Math.max(24, (w * hh) / 20000)));
    // Téléphone : moins de points, plus fins ; une partie couleur braise selon le métier affiché
    particles = Array.from({ length: n }, function () { var ember = tel && Math.random() < 0.35;
      return { tel: tel, e: ember, a: 0.35 + Math.random() * 0.3, ph: Math.random() * 6.28, k: Math.random() * 0.4 + 0.15,
        x: Math.random() * w, y: Math.random() * hh, r: tel ? Math.random() * 1.5 + 0.6 : Math.random() * 1.8 + 0.8, vx: 0, vy: -(Math.random() * 0.4 + 0.15) }; });
    if (reduce) draw();
  }
  // Pompiers : braises qui montent ; BTP : poussière qui dérive de côté ; industrie : vapeur lente qui ondule
  var braise = 1, t = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    var cr = Math.round(255 + (234 - 255) * braise), cg = Math.round(255 + (122 - 255) * braise), cb = Math.round(255 + (68 - 255) * braise);
    particles.forEach(function (p) {
      ctx.fillStyle = !p.tel ? 'rgba(255, 255, 255, 0.9)' : p.e ? 'rgba(' + cr + ', ' + cg + ', ' + cb + ', ' + p.a.toFixed(2) + ')' : 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    });
  }
  function animate() {
    if (!document.hidden) {
      t += 0.016; var m = window.vbMode;
      braise += ((m === 'pompiers' || !m ? 1 : 0) - braise) * 0.03;
      particles.forEach(function (p) {
        var tvx = 0, tvy = -p.k;
        if (p.tel && m === 'btp') { tvx = 0.25 + p.k * 0.8; tvy = 0.05 + Math.sin(t + p.ph) * 0.08; }
        else if (p.tel && m === 'industrie') { tvx = Math.sin(t * 0.6 + p.ph) * 0.3; tvy = -p.k * 0.45; }
        else if (p.tel) { tvx = Math.sin(t * 1.3 + p.ph) * 0.12; }
        p.vx += (tvx - p.vx) * 0.025; p.vy += (tvy - p.vy) * 0.025;
        p.x += p.vx; p.y += p.vy;
        if (p.y < -4) p.y = height + 4; else if (p.y > height + 4) p.y = -4;
        if (p.x < -4) p.x = width + 4; else if (p.x > width + 4) p.x = -4;
      });
      draw();
    }
    requestAnimationFrame(animate);
  }
  window.addEventListener('resize', function () { resize(false); });
  resize(true);
  if (!reduce) requestAnimationFrame(animate);
})();
